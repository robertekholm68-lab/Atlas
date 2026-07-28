package se.atlas.app;

import android.content.Context;
import android.content.Intent;
import android.os.Vibrator;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.util.ArrayList;

/**
 * Taligenkänning via Android i stället för via WebView.
 *
 * VARFÖR DEN HÄR FILEN FINNS: WebView får inte öppna mikrofonen på den här
 * telefonen. getUserMedia kastar NotReadableError, och Androids egen
 * mikrofonhistorik visar att appen aldrig ens nådde hårdvaran — trots att
 * behörigheten är beviljad och ingen annan app håller mikrofonen. Felet ligger
 * under webbappen och går inte att laga i JavaScript.
 *
 * Lösningen går runt problemet i stället för genom det: operativsystemets egen
 * SpeechRecognizer gör inspelningen och tolkningen, och webbappen får bara den
 * färdiga texten. Ingen ljudström passerar WebView.
 *
 * WEBBAPPEN TOLKAR FORTFARANDE SJÄLV. Härifrån skickas råa alternativ —
 * "åttio åtta", "80 8" — och parseSetSpeech i voice.js gör samma jobb som med
 * webbläsarens taligenkänning. Att flytta tolkningen hit hade gett två
 * uppsättningar regler som kan glida isär.
 *
 * SÄKERHET: en JavascriptInterface är öppen för varje sida som laddas. Därför
 * kontrolleras adressen före varje start — bara vår egen domän får starta
 * mikrofonen. Navigeringen är redan låst i AtlasWebViewClient, men ett lager
 * till kostar ingenting och skyddar mot att en framtida ändring öppnar dörren.
 *
 * INGA ANONYMA KLASSER. d8 i build-tools 34 kraschar på dem i det här projektet
 * (se BYGG.md). Allt som skulle varit en lambda är en namngiven klass.
 */
public class AskrVoice {

    private final MainActivity host;
    private final WebView web;
    private SpeechRecognizer igenkännare;
    private boolean lyssnar = false;

    AskrVoice(MainActivity host, WebView web) {
        this.host = host;
        this.web = web;
    }

    /** Finns taligenkänning på den här enheten alls? Webbappen frågar först. */
    @JavascriptInterface
    public boolean tillgänglig() {
        try {
            return SpeechRecognizer.isRecognitionAvailable(host);
        } catch (Throwable t) {
            return false;
        }
    }

    /** Startar en lyssning. Anropas från webbappen. */
    @JavascriptInterface
    public void starta(String språk) {
        host.runOnUiThread(new Startare(this, språk));
    }

    /** Avbryter en pågående lyssning. */
    @JavascriptInterface
    public void stoppa() {
        host.runOnUiThread(new Stoppare(this));
    }

    // ── Internt, allt på UI-tråden ────────────────────────────────────────────

    void startaPåUiTråd(String språk) {
        // Adresskontrollen: bara vår egen sida får öppna mikrofonen.
        String url = web.getUrl();
        if (url == null || !url.contains(MainActivity.EGEN_DOMAN)) {
            skickaFel("avvisad-adress");
            return;
        }
        if (lyssnar) stoppaPåUiTråd();

        if (!tillgänglig()) {
            skickaFel("ingen-tjänst");
            return;
        }

        try {
            igenkännare = SpeechRecognizer.createSpeechRecognizer(host);
            igenkännare.setRecognitionListener(new Lyssnare(this));

            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, språk != null ? språk : "sv-SE");
            // Flera tolkningar av samma yttrande. Webbappen tar den första som
            // går att läsa som ett set — det räddar en del "åtta/åttio".
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            // DELRESULTAT PÅ. Utan dem ser användaren ingenting förrän hela
            // yttrandet är klart, och i ett gym med musik i lurarna går det inte
            // att avgöra om mikrofonen ens hörde något. Med dem växer orden
            // fram medan man talar — och man ser ett feltolkat ord direkt i
            // stället för efter att ha släppt knappen.
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            // Be om lokal tolkning där den finns: då fungerar rösten i en
            // gymkällare utan täckning. Får inte krävas — stödet varierar.
            if (Build.VERSION.SDK_INT >= 23) {
                i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            }
            lyssnar = true;
            igenkännare.startListening(i);
        } catch (Throwable t) {
            lyssnar = false;
            skickaFel("start-misslyckades");
        }
    }

    void stoppaPåUiTråd() {
        lyssnar = false;
        try {
            if (igenkännare != null) {
                igenkännare.stopListening();
                igenkännare.destroy();
            }
        } catch (Throwable t) {
            // Att städa får aldrig krascha appen.
        }
        igenkännare = null;
    }

    // ── Vägen tillbaka till webbappen ─────────────────────────────────────────

    void skickaResultat(ArrayList<String> alternativ) {
        StringBuilder b = new StringBuilder("[");
        if (alternativ != null) {
            for (int n = 0; n < alternativ.size(); n++) {
                if (n > 0) b.append(",");
                b.append(citera(alternativ.get(n)));
            }
        }
        b.append("]");
        kör("window.__askrRöstResultat && window.__askrRöstResultat(" + b + ")");
    }

    /** Delresultat medan talet pågår. */
    void skickaDel(String text) {
        kör("window.__askrRöstDel && window.__askrRöstDel(" + citera(text) + ")");
    }

    /** Ljudnivå 0–1, så gränssnittet kan visa att mikrofonen hör något. */
    void skickaNivå(float nivå) {
        kör("window.__askrRöstNivå && window.__askrRöstNivå(" + nivå + ")");
    }

    /**
     * En kort vibration när mikrofonen börjar lyssna.
     *
     * Med svettiga händer, musik i lurarna och blicken på stången är känseln
     * den enda kanal som är ledig. Utan den vet man inte om trycket tog.
     */
    void pulsera(int ms) {
        try {
            Vibrator v = (Vibrator) host.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) v.vibrate(ms);
        } catch (Throwable t) {
            // Vibration är en bekvämlighet. Den får aldrig stoppa en inspelning.
        }
    }

    void skickaFel(String kod) {
        lyssnar = false;
        kör("window.__askrRöstFel && window.__askrRöstFel(" + citera(kod) + ")");
    }

    void skickaSlut() {
        lyssnar = false;
        kör("window.__askrRöstSlut && window.__askrRöstSlut()");
    }

    private void kör(final String js) {
        host.runOnUiThread(new Korare(web, js));
    }

    /** Minimal JSON-strängcitering. Talet kommer från taligenkänningen, inte
     *  från en angripare — men citattecken och radbrytningar måste ändå bort,
     *  annars blir den injicerade koden ogiltig. */
    private static String citera(String s) {
        if (s == null) return "\"\"";
        StringBuilder b = new StringBuilder("\"");
        for (int n = 0; n < s.length(); n++) {
            char c = s.charAt(n);
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c == '\n' || c == '\r') b.append(' ');
            else if (c < 0x20) b.append(' ');
            else b.append(c);
        }
        return b.append('"').toString();
    }

    // ── Namngivna klasser, av dex-skäl ────────────────────────────────────────

    private static class Startare implements Runnable {
        private final AskrVoice v; private final String språk;
        Startare(AskrVoice v, String språk) { this.v = v; this.språk = språk; }
        @Override public void run() { v.startaPåUiTråd(språk); }
    }

    private static class Stoppare implements Runnable {
        private final AskrVoice v;
        Stoppare(AskrVoice v) { this.v = v; }
        @Override public void run() { v.stoppaPåUiTråd(); }
    }

    /** ASCII-namn med flit: javac skriver klassfilen till disk med klassnamnet
     *  som filnamn, och ett "ö" där blev "K?rare.class" i den här miljön. Metoder
     *  får gärna heta svenska saker — filnamn får det inte. */
    private static class Korare implements Runnable {
        private final WebView web; private final String js;
        Korare(WebView web, String js) { this.web = web; this.js = js; }
        @Override public void run() {
            try { web.evaluateJavascript(js, null); } catch (Throwable t) { /* vyn kan vara borta */ }
        }
    }

    /** Androids återanrop. Översätter felkoder till samma namn som webbappen
     *  redan känner igen, så att gränssnittet slipper två uppsättningar. */
    private static class Lyssnare implements RecognitionListener {
        private final AskrVoice v;
        Lyssnare(AskrVoice v) { this.v = v; }

        @Override public void onResults(Bundle res) {
            ArrayList<String> alt = res != null
                    ? res.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
            v.skickaResultat(alt);
            v.skickaSlut();
        }

        @Override public void onError(int kod) {
            String namn;
            if (kod == SpeechRecognizer.ERROR_NO_MATCH
                    || kod == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) namn = "no-speech";
            else if (kod == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) namn = "not-allowed";
            else if (kod == SpeechRecognizer.ERROR_NETWORK
                    || kod == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) namn = "network";
            else if (kod == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) namn = "upptagen";
            else namn = "fel-" + kod;
            v.skickaFel(namn);
            v.skickaSlut();
        }

        @Override public void onReadyForSpeech(Bundle b) {
            v.pulsera(30);
            v.kör("window.__askrRöstRedo && window.__askrRöstRedo()");
        }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float rms) {
            // Android ger ungefär -2..10 dB. Normaliseras till 0–1 här i stället
            // för i webbappen, så att skalan hör ihop med den som mäter.
            float n = (rms + 2f) / 12f;
            v.skickaNivå(n < 0f ? 0f : n > 1f ? 1f : n);
        }
        @Override public void onBufferReceived(byte[] buf) { }
        @Override public void onEndOfSpeech() { v.pulsera(15); }
        @Override public void onPartialResults(Bundle b) {
            ArrayList<String> alt = b != null
                    ? b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
            if (alt != null && !alt.isEmpty()) v.skickaDel(alt.get(0));
        }
        @Override public void onEvent(int t, Bundle b) { }
    }
}
