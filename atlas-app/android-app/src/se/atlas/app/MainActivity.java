package se.atlas.app;

import android.annotation.SuppressLint;
import android.app.Activity;
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

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

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
}
