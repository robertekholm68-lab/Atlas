package se.atlas.app;

import android.content.Intent;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Namngiven i stället för anonym: d8 (build-tools 34) misslyckas med att dexa
 * anonyma inre klasser i det här projektet. Namngivna klasser fungerar, och
 * koden blir tydligare på köpet.
 */
class AtlasWebViewClient extends WebViewClient {

    private final MainActivity host;

    AtlasWebViewClient(MainActivity host) {
        this.host = host;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        String värdnamn = request.getUrl() != null ? request.getUrl().getHost() : null;
        // Egna sidor stannar i appen; externa länkar öppnas i webbläsaren så att
        // användaren inte fastnar i ett skal utan adressfält.
        if (värdnamn != null && värdnamn.equals(MainActivity.EGEN_DOMAN)) return false;
        try {
            host.startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
        } catch (Exception strunta) { }
        return true;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        // Service workern serverar cachade sidor offline. Det här slår bara till
        // om appen aldrig hunnit cacha något.
        if (request != null && request.isForMainFrame()) {
            Toast.makeText(host, "Ingen anslutning. ATLAS behöver nät första gången.",
                    Toast.LENGTH_LONG).show();
        }
    }
}
