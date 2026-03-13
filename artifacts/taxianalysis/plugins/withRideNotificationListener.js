// Expo Config Plugin — dodaje NotificationListenerService do natywnego projektu Android.
// Ten plugin uruchamia się podczas `eas build` lub `expo prebuild`.

const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ─── Java source dla NotificationListenerService ──────────────────────────────
const JAVA_SOURCE = `
package com.taxianalysis.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

/**
 * Przechwytuje powiadomienia z aplikacji Uber Driver, Bolt Driver i FreeNow,
 * parsuje tekst i wysyła dane do warstwy React Native przez DeviceEventEmitter.
 */
public class RideNotificationService extends NotificationListenerService {

    private static final String TAG = "RideNotificationService";

    // Pakiety aplikacji dla kierowców
    private static final String[] RIDE_PACKAGES = {
        "com.ubercab.driver",            // Uber Driver
        "com.bolt.android.driver",       // Bolt Driver (wariant 1)
        "ee.mtakso.client",              // Bolt Driver (wariant 2)
        "com.taxify.driver",             // Bolt Driver (wariant 3)
        "eu.mytexi.app",                 // FreeNow (myTaxi)
        "com.freenow.passenger",         // FreeNow (alternatywny)
        "net.cabify.driver"              // Cabify Driver
    };

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String pkg = sbn.getPackageName();
        if (!isRideApp(pkg)) return;

        try {
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;

            String title     = extras.getString(Notification.EXTRA_TITLE, "");
            CharSequence text    = extras.getCharSequence(Notification.EXTRA_TEXT, "");
            CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT, "");

            String body = (bigText != null && bigText.length() > 0)
                ? bigText.toString()
                : (text != null ? text.toString() : "");

            String fullText = title + "\\n" + body;

            String platform = detectPlatform(pkg);

            Log.d(TAG, "Ride notification from " + pkg + ": " + fullText);

            sendToReactNative(fullText.trim(), platform, pkg);

        } catch (Exception e) {
            Log.e(TAG, "Error processing notification", e);
        }
    }

    private boolean isRideApp(String pkg) {
        for (String p : RIDE_PACKAGES) {
            if (p.equalsIgnoreCase(pkg)) return true;
        }
        return false;
    }

    private String detectPlatform(String pkg) {
        if (pkg.contains("bolt") || pkg.contains("mtakso") || pkg.contains("taxify")) return "bolt";
        if (pkg.contains("freenow") || pkg.contains("mytexi") || pkg.contains("mytaxi")) return "freeNow";
        return "uber";
    }

    private void sendToReactNative(String text, String platform, String packageName) {
        try {
            ReactApplication reactApp = (ReactApplication) getApplicationContext();
            ReactInstanceManager manager = reactApp.getReactNativeHost().getReactInstanceManager();
            ReactContext ctx = manager.getCurrentReactContext();

            if (ctx == null) {
                Log.w(TAG, "ReactContext is null — app not in foreground");
                return;
            }

            WritableMap params = Arguments.createMap();
            params.putString("text", text);
            params.putString("platform", platform);
            params.putString("packageName", packageName);
            params.putDouble("timestamp", System.currentTimeMillis());

            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
               .emit("RideNotificationReceived", params);

        } catch (Exception e) {
            Log.e(TAG, "Failed to send event to React Native", e);
        }
    }
}
`.trim();

// ─── Plugin ───────────────────────────────────────────────────────────────────

/**
 * 1) Dodaje <service> do AndroidManifest.xml
 * 2) Zapisuje plik Java do katalogu natywnego projektu
 */
const withRideNotificationListener = (config) => {
  // Krok 1: AndroidManifest
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application[0];

    if (!app.service) app.service = [];

    const exists = app.service.some(
      (s) => s.$["android:name"] === ".RideNotificationService"
    );

    if (!exists) {
      app.service.push({
        $: {
          "android:name": ".RideNotificationService",
          "android:label": "RideHelper Notification Listener",
          "android:permission":
            "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.service.notification.NotificationListenerService",
                },
              },
            ],
          },
        ],
      });
    }

    return cfg;
  });

  // Krok 2: plik Java
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const javaDir = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "taxianalysis",
        "app"
      );

      fs.mkdirSync(javaDir, { recursive: true });

      const dest = path.join(javaDir, "RideNotificationService.java");
      fs.writeFileSync(dest, JAVA_SOURCE, "utf8");
      console.log("[withRideNotificationListener] Wrote:", dest);

      return cfg;
    },
  ]);

  return config;
};

module.exports = withRideNotificationListener;
