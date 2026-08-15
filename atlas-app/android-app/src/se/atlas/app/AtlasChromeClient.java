package se.atlas.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

class AtlasChromeClient extends WebChromeClient {

    private final MainActivity host;

    AtlasChromeClient(MainActivity host) {
        this.host = host;
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        // Rösten begär mikrofon, streckkodsläsaren begär kamera. Båda beviljas
        // bara för vår egen sida.
        host.runOnUiThread(new Beviljare(host, request));
    }

    /**
     * FILVÄLJAREN. Utan den här metoden händer INGENTING när användaren trycker
     * på ett <input type="file"> i en WebView — ingen väljare öppnas, inget fel
     * visas, ingen logg skrivs.
     *
     * Det gjorde att ÅTERSTÄLLNING FRÅN BACKUP inte fungerade i app-skalet.
     * ImportSheet.jsx har ett dolt filfält för att läsa in en v3-backup, och
     * det är precis den funktion man behöver när något gått fel — alltså den
     * sämsta tänkbara att ha trasig.
     *
     * Callbacken MÅSTE alltid anropas, även när användaren avbryter. Gör den
     * inte det låser sig WebView och nästa tryck på fältet gör ingenting alls,
     * för resten av appens livstid.
     */
    @Override
    public boolean onShowFileChooser(WebView vy, ValueCallback<Uri[]> svar,
                                     FileChooserParams params) {
        return host.oppnaFilvaljare(svar, params);
    }

    /** Namngiven i stället för lambda, av samma dex-skäl som ovan. */
    private static class Beviljare implements Runnable {
        private final MainActivity host;
        private final PermissionRequest request;
        Beviljare(MainActivity host, PermissionRequest request) {
            this.host = host; this.request = request;
        }
        @Override public void run() {
            String ursprung = request.getOrigin() != null ? request.getOrigin().toString() : "";
            if (!ursprung.contains(MainActivity.EGEN_DOMAN)) { request.deny(); return; }

            // KAMERAN KRÄVER APPENS EGEN BEHÖRIGHET FÖRST.
            //
            // request.grant() ger sidan tillgång till det APPEN redan får göra.
            // Saknar appen CAMERA i körtid blir grant() verkningslöst och
            // getUserMedia misslyckas — exakt samma fälla som mikrofonen satt i.
            // Skillnaden mot RECORD_AUDIO är att kameran begärs FÖRST NÄR den
            // behövs, alltså vid första skanningen, inte vid start.
            String[] onskade = request.getResources();
            boolean villHaKamera = false;
            for (String r : onskade) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) villHaKamera = true;
            }
            if (villHaKamera && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    && host.checkSelfPermission(Manifest.permission.CAMERA)
                       != PackageManager.PERMISSION_GRANTED) {
                // Be om behörigheten och neka DEN HÄR begäran. Sidan visar då
                // sitt eget felmeddelande, och nästa tryck fungerar. Att hålla
                // begäran öppen medan systemdialogen visas är en känd väg till
                // en låst WebView.
                host.begarKamera();
                request.deny();
                return;
            }
            request.grant(onskade);
        }
    }
}
