package se.atlas.app;

import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

class AtlasChromeClient extends WebChromeClient {

    private final MainActivity host;

    AtlasChromeClient(MainActivity host) {
        this.host = host;
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        // Rösten begär mikrofon. Beviljas bara för vår egen sida.
        host.runOnUiThread(new Beviljare(request));
    }

    /** Namngiven i stället för lambda, av samma dex-skäl som ovan. */
    private static class Beviljare implements Runnable {
        private final PermissionRequest request;
        Beviljare(PermissionRequest request) { this.request = request; }
        @Override public void run() {
            String ursprung = request.getOrigin() != null ? request.getOrigin().toString() : "";
            if (ursprung.contains(MainActivity.EGEN_DOMAN)) request.grant(request.getResources());
            else request.deny();
        }
    }
}
