package se.atlas.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * ATLAS som Android-app.
 *
 * Skalet kör den riktiga appen från https, INTE från file://. Det är medvetet:
 * på file:// blir ursprunget "null", localStorage blir opålitligt och service
 * workern vägrar registrera sig. Med https får appen ett riktigt origin,
 * lagringen fungerar, och service workern cachar allt så att appen startar
 * offline efter första besöket.
 *
 * Priset är att första starten kräver nät. Det är rätt avvägning: en app som
 * tappar sin loggade träning vore långt värre än en som behöver nät en gång.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "https://robertekholm68-lab.github.io/Atlas/atlas2.html";

    /** Allt inom detta prefix stannar i appen. Övriga länkar hör hemma i webbläsaren. */
    static final String EGEN_DOMAN = "robertekholm68-lab.github.io";

    private WebView web;

    /** Godtyckligt id — vi har bara en behörighetsfråga. */
    private static final int MIK_KOD = 1001;
    private static final int KAMERA_KOD = 1002;
    private static final int FIL_KOD = 2001;

    /**
     * Väntande filväljar-callback.
     *
     * MÅSTE alltid anropas — även när användaren trycker bakåt utan att välja
     * något. Lämnas den hängande låser sig WebView och nästa tryck på ett
     * filfält gör ingenting alls, för resten av appens livstid.
     */
    private ValueCallback<Uri[]> filSvar;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

        // MIKROFONEN MÅSTE BEGÄRAS AV APPEN, inte bara av webbsidan.
        //
        // RECORD_AUDIO är en "dangerous permission" sedan Android 6. WebViewens
        // onPermissionRequest kan bevilja sidans begäran, men den kan inte ge
        // appen en rättighet som appen själv saknar — så röstloggningen dog
        // tyst, eller kraschade, trots att AtlasChromeClient gjorde rätt.
        //
        // Frågan ställs vid start i stället för vid första knapptrycket: mitt i
        // ett pass, med svettiga händer, är en systemdialog det sämsta tänkbara
        // avbrottet. Nekar användaren fungerar allt annat som vanligt — rösten
        // är ett tillägg, inte en förutsättning.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MIK_KOD);
        }

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(0xFF0A0A0A);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        // Utan detta finns ingen localStorage — och då finns ingen loggad
        // träning kvar mellan starter.
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        web.setWebViewClient(new AtlasWebViewClient(this));

        web.setWebChromeClient(new AtlasChromeClient(this));

        // RÖSTBRYGGAN. WebView får inte öppna mikrofonen på den här telefonen —
        // bevisat med Androids egen mikrofonhistorik, som aldrig visade Askr
        // trots beviljad behörighet. Bryggan går runt problemet: Androids egen
        // SpeechRecognizer spelar in och tolkar, webbappen får bara texten.
        //
        // Namnet "AskrNative" är vad voice.js letar efter. Hittar den inget
        // faller webbappen tillbaka på webbläsarens taligenkänning, vilket är
        // det som gäller i Chrome och Samsung Browser.
        web.addJavascriptInterface(new AskrVoice(this, web), "AskrNative");

        // Kant-till-kant, men innehållet skjuts in från systemfälten så att
        // bottennavigeringen inte hamnar under gestfältet.
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
        web.setFitsSystemWindows(true);

        setContentView(web);

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(START_URL);
    }

    /**
     * OS-bakåtknappen. Utan det här stänger ett tryck hela appen mitt i ett
     * pass — den fällan stod kvar i backloggen för webbversionen.
     *
     * Appen är en enda sida, så webbhistoriken motsvarar de vyer användaren
     * öppnat. Finns inget att gå tillbaka till lämnas appen som vanligt.
     */
    @Override
    public boolean onKeyDown(int code, KeyEvent event) {
        if (code == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(code, event);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    /** Begär kamerabehörighet vid första skanningen, inte vid start. */
    void begarKamera() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(new String[] { Manifest.permission.CAMERA }, KAMERA_KOD);
        }
    }

    /**
     * Öppnar systemets filväljare för ett <input type="file"> i sidan.
     * Returnerar true om vi tar hand om det; false låter WebView ge upp tyst.
     */
    boolean oppnaFilvaljare(ValueCallback<Uri[]> svar, WebChromeClient.FileChooserParams params) {
        // En tidigare, ej besvarad väljare måste stängas först — annars läcker
        // callbacken och WebView slutar be om nya.
        if (filSvar != null) { filSvar.onReceiveValue(null); }
        filSvar = svar;
        try {
            Intent i = params != null ? params.createIntent() : new Intent(Intent.ACTION_GET_CONTENT);
            if (i.getType() == null) i.setType("*/*");
            startActivityForResult(Intent.createChooser(i, "Välj fil"), FIL_KOD);
            return true;
        } catch (Throwable t) {
            filSvar = null;
            svar.onReceiveValue(null);
            return false;
        }
    }

    @Override
    protected void onActivityResult(int kod, int resultat, Intent data) {
        super.onActivityResult(kod, resultat, data);
        if (kod != FIL_KOD) return;
        if (filSvar == null) return;
        // Avbrott ger null — och det MÅSTE skickas, annars låser sig fältet.
        Uri[] filer = null;
        if (resultat == RESULT_OK && data != null) {
            filer = WebChromeClient.FileChooserParams.parseResult(resultat, data);
        }
        filSvar.onReceiveValue(filer);
        filSvar = null;
    }
}
