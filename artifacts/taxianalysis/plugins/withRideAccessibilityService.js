const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ─── res/xml/accessibility_service_config.xml ────────────────────────────────
const ACCESSIBILITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowContentChanged|typeWindowStateChanged|typeViewScrolled"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows|flagRequestFilterKeyEvents"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100" />
`;

// ─── RideAccessibilityService.java ───────────────────────────────────────────
const ACCESSIBILITY_SERVICE_JAVA = `package com.taxianalysis.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RideAccessibilityService — odczytuje dane kursu z ekranu aplikacji kierowcy
 * (Bolt Driver, Uber Driver, FreeNow) i wysyła do FloatingOverlayService.
 */
public class RideAccessibilityService extends AccessibilityService {

    private static final String TAG = "RideAccessibility";

    private static final Set<String> RIDE_PACKAGES = new HashSet<>(Arrays.asList(
        "com.ubercab.driver",
        "ee.mtakso.client",
        "com.bolt.android.driver",
        "com.taxify.driver",
        "eu.mytexi.app",
        "com.freenow.passenger"
    ));

    private static final Pattern PRICE_PATTERN =
        Pattern.compile("(\\\\d+[.,]\\\\d+|\\\\d+)\\\\s*z[łl]", Pattern.CASE_INSENSITIVE);
    private static final Pattern KM_PATTERN =
        Pattern.compile("(\\\\d+[.,]\\\\d+|\\\\d+)\\\\s*km", Pattern.CASE_INSENSITIVE);
    private static final Pattern MIN_PATTERN =
        Pattern.compile("(\\\\d+)\\\\s*min", Pattern.CASE_INSENSITIVE);
    private static final Pattern RATING_PATTERN =
        Pattern.compile("[★\\\\*]\\\\s*(\\\\d[.,]\\\\d{1,2})");

    private long lastEventTime = 0;
    private static final long DEBOUNCE_MS = 500;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        String pkg = event.getPackageName() != null ? event.getPackageName().toString() : "";
        if (!RIDE_PACKAGES.contains(pkg)) return;

        long now = System.currentTimeMillis();
        if (now - lastEventTime < DEBOUNCE_MS) return;
        lastEventTime = now;

        int type = event.getEventType();
        if (type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;

        try {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;

            List<String> texts = new ArrayList<>();
            collectText(root, texts);
            root.recycle();

            if (texts.isEmpty()) return;
            String fullText = joinTexts(texts);

            RideData data = parseRideData(fullText, pkg);
            if (data == null || data.price <= 0) return;

            Log.d(TAG, "Parsed ride: " + data.price + " zl, " + data.tripKm + " km");
            broadcastRideData(data, pkg);

        } catch (Exception e) {
            Log.e(TAG, "Error reading accessibility tree", e);
        }
    }

    private void collectText(AccessibilityNodeInfo node, List<String> texts) {
        if (node == null) return;
        if (node.getText() != null && node.getText().length() > 0) {
            texts.add(node.getText().toString());
        }
        if (node.getContentDescription() != null && node.getContentDescription().length() > 0) {
            texts.add(node.getContentDescription().toString());
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                collectText(child, texts);
                child.recycle();
            }
        }
    }

    private String joinTexts(List<String> texts) {
        StringBuilder sb = new StringBuilder();
        for (String t : texts) {
            sb.append(t).append("\\n");
        }
        return sb.toString();
    }

    private RideData parseRideData(String text, String pkg) {
        RideData data = new RideData();

        Matcher pm = PRICE_PATTERN.matcher(text);
        if (pm.find()) {
            data.price = parseNum(pm.group(1));
        }

        List<Double> kms = new ArrayList<>();
        Matcher km = KM_PATTERN.matcher(text);
        while (km.find()) kms.add(parseNum(km.group(1)));

        List<Integer> mins = new ArrayList<>();
        Matcher mn = MIN_PATTERN.matcher(text);
        while (mn.find()) mins.add((int) parseNum(mn.group(1)));

        if (kms.size() >= 2) {
            data.pickupKm = kms.get(0);
            data.tripKm = kms.get(1);
        } else if (kms.size() == 1) {
            data.tripKm = kms.get(0);
        }

        if (mins.size() >= 2) {
            data.pickupMin = mins.get(0);
            data.tripMin = mins.get(1);
        } else if (mins.size() == 1) {
            data.tripMin = mins.get(0);
        }

        Matcher rm = RATING_PATTERN.matcher(text);
        if (rm.find()) {
            data.rating = parseNum(rm.group(1));
        }

        data.platform = detectPlatform(pkg);
        return data;
    }

    private double parseNum(String s) {
        try { return Double.parseDouble(s.replace(",", ".")); }
        catch (Exception e) { return 0; }
    }

    private String detectPlatform(String pkg) {
        if (pkg.contains("bolt") || pkg.contains("mtakso") || pkg.contains("taxify")) return "bolt";
        if (pkg.contains("freenow") || pkg.contains("mytexi")) return "freeNow";
        return "uber";
    }

    private void broadcastRideData(RideData data, String pkg) {
        // 1) Send to FloatingOverlayService
        Intent intent = new Intent(this, FloatingOverlayService.class);
        intent.setAction(FloatingOverlayService.ACTION_UPDATE_RIDE);
        intent.putExtra("price", data.price);
        intent.putExtra("pickupKm", data.pickupKm);
        intent.putExtra("tripKm", data.tripKm);
        intent.putExtra("pickupMin", data.pickupMin);
        intent.putExtra("tripMin", data.tripMin);
        intent.putExtra("rating", data.rating);
        intent.putExtra("platform", data.platform);
        intent.putExtra("packageName", pkg);
        startService(intent);

        // 2) Send to React Native (if app is in foreground)
        try {
            ReactApplication reactApp = (ReactApplication) getApplicationContext();
            ReactContext ctx = reactApp.getReactNativeHost()
                .getReactInstanceManager().getCurrentReactContext();
            if (ctx != null) {
                WritableMap params = Arguments.createMap();
                params.putDouble("price", data.price);
                params.putDouble("pickupKm", data.pickupKm);
                params.putDouble("tripKm", data.tripKm);
                params.putInt("pickupMin", data.pickupMin);
                params.putInt("tripMin", data.tripMin);
                params.putDouble("rating", data.rating);
                params.putString("platform", data.platform);
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                   .emit("RideDataFromScreen", params);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not send to RN: " + e.getMessage());
        }
    }

    @Override
    public void onInterrupt() {}

    @Override
    protected void onServiceConnected() {
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            | AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 100;
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        setServiceInfo(info);
        Log.d(TAG, "AccessibilityService connected");
    }

    static class RideData {
        double price = 0, pickupKm = 0, tripKm = 0, rating = 0;
        int pickupMin = 0, tripMin = 0;
        String platform = "uber";
    }
}
`;

// ─── Plugin ───────────────────────────────────────────────────────────────────
const withRideAccessibilityService = (config) => {
  // 1) Manifest: dodaj <service> dla AccessibilityService
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    if (!app.service) app.service = [];

    if (!app.service.some((s) => s.$["android:name"] === ".RideAccessibilityService")) {
      app.service.push({
        $: {
          "android:name": ".RideAccessibilityService",
          "android:label": "TaxiAnalysis Accessibility",
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.accessibilityservice",
              "android:resource": "@xml/accessibility_service_config",
            },
          },
        ],
      });
    }
    return cfg;
  });

  // 2) DangerousMod: kopiuj Java + XML
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const javaDir = path.join(root, "android", "app", "src", "main", "java", "com", "taxianalysis", "app");
      const xmlDir = path.join(root, "android", "app", "src", "main", "res", "xml");

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, "RideAccessibilityService.java"), ACCESSIBILITY_SERVICE_JAVA, "utf8");
      fs.writeFileSync(path.join(xmlDir, "accessibility_service_config.xml"), ACCESSIBILITY_CONFIG_XML, "utf8");

      console.log("[withRideAccessibilityService] Files written.");
      return cfg;
    },
  ]);

  return config;
};

module.exports = withRideAccessibilityService;
