const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ─── FloatingOverlayService.java ─────────────────────────────────────────────
const OVERLAY_SERVICE_JAVA = `package com.taxianalysis.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

import com.facebook.react.ReactApplication;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

/**
 * FloatingOverlayService — rysuje belkę na wierzchu innych aplikacji.
 * Belka jest zielona jeśli kurs jest opłacalny, czerwona jeśli nie.
 * Uruchamiana przez RideAccessibilityService i z React Native przez OverlayModule.
 */
public class FloatingOverlayService extends Service {

    public static final String ACTION_SHOW = "SHOW_OVERLAY";
    public static final String ACTION_HIDE = "HIDE_OVERLAY";
    public static final String ACTION_UPDATE_RIDE = "UPDATE_RIDE";
    public static final String ACTION_SCAN = "SCAN";
    public static final String PREFS_NAME = "TaxiAnalysisPrefs";

    private static final String TAG = "FloatingOverlay";
    private static final String CHANNEL_ID = "taxi_overlay";
    private static final int NOTIF_ID = 1001;

    private static final int COLOR_GREEN = 0xDD00CC66;
    private static final int COLOR_RED   = 0xDDCC2200;
    private static final int COLOR_TEXT  = 0xFFFFFFFF;

    private WindowManager windowManager;
    private View overlayView;
    private TextView overlayTextView;
    private boolean isShowing = false;

    // Ostatnie dane kursu
    private double price = 0, pickupKm = 0, tripKm = 0, rating = 0;
    private int pickupMin = 0, tripMin = 0;
    private String platform = "uber";

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;
        String action = intent.getAction();
        if (action == null) action = "";

        switch (action) {
            case ACTION_SHOW:
                showOverlay();
                break;
            case ACTION_HIDE:
                hideOverlay();
                break;
            case ACTION_UPDATE_RIDE:
                price = intent.getDoubleExtra("price", 0);
                pickupKm = intent.getDoubleExtra("pickupKm", 0);
                tripKm = intent.getDoubleExtra("tripKm", 0);
                pickupMin = intent.getIntExtra("pickupMin", 0);
                tripMin = intent.getIntExtra("tripMin", 0);
                rating = intent.getDoubleExtra("rating", 0);
                platform = intent.getStringExtra("platform");
                if (platform == null) platform = "uber";
                updateOverlayContent();
                if (!isShowing) showOverlay();
                break;
            case ACTION_SCAN:
                triggerScan();
                break;
        }
        return START_STICKY;
    }

    private void showOverlay() {
        if (isShowing || !android.provider.Settings.canDrawOverlays(this)) return;

        overlayView = buildOverlayView();

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 0;

        windowManager.addView(overlayView, params);
        isShowing = true;
        updateOverlayContent();
    }

    private void hideOverlay() {
        if (!isShowing || overlayView == null) return;
        try {
            windowManager.removeView(overlayView);
        } catch (Exception e) { Log.e(TAG, "removeView error", e); }
        overlayView = null;
        overlayTextView = null;
        isShowing = false;
    }

    private View buildOverlayView() {
        Context ctx = getApplicationContext();
        LinearLayout root = new LinearLayout(ctx);
        root.setOrientation(LinearLayout.HORIZONTAL);
        root.setBackgroundColor(COLOR_GREEN);
        root.setPadding(dp(8), dp(8), dp(8), dp(8));

        // Tekst z danymi kursu
        overlayTextView = new TextView(ctx);
        overlayTextView.setTextColor(COLOR_TEXT);
        overlayTextView.setTextSize(13f);
        overlayTextView.setTypeface(Typeface.DEFAULT_BOLD);
        overlayTextView.setText("Oczekuję na kurs...");
        overlayTextView.setPadding(dp(4), 0, dp(4), 0);

        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        root.addView(overlayTextView, textParams);

        // Przycisk Skanuj
        TextView scanBtn = new TextView(ctx);
        scanBtn.setText("Skanuj");
        scanBtn.setTextColor(COLOR_TEXT);
        scanBtn.setTextSize(12f);
        scanBtn.setTypeface(Typeface.DEFAULT_BOLD);
        scanBtn.setBackgroundColor(0x44FFFFFF);
        scanBtn.setPadding(dp(10), dp(4), dp(10), dp(4));
        scanBtn.setOnClickListener(v -> triggerScan());

        LinearLayout.LayoutParams scanParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT);
        scanParams.setMarginStart(dp(6));
        root.addView(scanBtn, scanParams);

        // Przycisk X
        TextView closeBtn = new TextView(ctx);
        closeBtn.setText("✕");
        closeBtn.setTextColor(COLOR_TEXT);
        closeBtn.setTextSize(14f);
        closeBtn.setPadding(dp(8), dp(4), dp(4), dp(4));
        closeBtn.setOnClickListener(v -> hideOverlay());

        root.addView(closeBtn);

        return root;
    }

    private void updateOverlayContent() {
        if (overlayTextView == null) return;

        double totalKm = pickupKm + tripKm;
        int totalMin = pickupMin + tripMin;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        double minPerKm = Double.parseDouble(prefs.getString("minPricePerKm", "2.5"));
        double minPerH = Double.parseDouble(prefs.getString("minPricePerHour", "40"));
        double minRating = Double.parseDouble(prefs.getString("minRating", "4.5"));
        double fuelCost = Double.parseDouble(prefs.getString("fuelCostPerKm", "0.6"));

        double pricePerKm = totalKm > 0 ? price / totalKm : 0;
        double pricePerHour = totalMin > 0 ? (price / totalMin) * 60.0 : 0;
        double profit = price - (totalKm * fuelCost);

        boolean profitableKm = pricePerKm >= minPerKm;
        boolean profitableH = pricePerHour >= minPerH;
        boolean profitableRating = rating <= 0 || rating >= minRating;
        boolean isProfitable = profitableKm && profitableH && profitableRating;

        // Kolor belki
        int bgColor = isProfitable ? COLOR_GREEN : COLOR_RED;
        if (overlayView != null) overlayView.setBackgroundColor(bgColor);

        // Tekst belki — odczytaj ustawienia co pokazać
        boolean showPrice = prefs.getBoolean("showPrice", true);
        boolean showKm1 = prefs.getBoolean("showKm1", true);
        boolean showKm2 = prefs.getBoolean("showKm2", true);
        boolean showTotalKm = prefs.getBoolean("showTotalKm", true);
        boolean showPerKm = prefs.getBoolean("showPricePerKm", true);
        boolean showPerH = prefs.getBoolean("showPricePerHour", true);
        boolean showRating = prefs.getBoolean("showRating", true);
        boolean showProfit = prefs.getBoolean("showProfit", false);

        StringBuilder sb = new StringBuilder();

        if (showPrice) sb.append(String.format("%.2f zł", price));
        if (showKm1 && pickupKm > 0) append(sb, String.format("%.1f km", pickupKm));
        if (showKm2 && tripKm > 0) {
            if (showKm1 && pickupKm > 0) sb.append("+").append(String.format("%.1f km", tripKm));
            else append(sb, String.format("%.1f km", tripKm));
        }
        if (showTotalKm && totalKm > 0) append(sb, String.format("Razem: %.1f km", totalKm));
        if (showPerKm && pricePerKm > 0) append(sb, String.format("%.2f zł/km", pricePerKm));
        if (totalMin > 0) append(sb, totalMin + " min");
        if (showPerH && pricePerHour > 0) append(sb, String.format("%.0f zł/h", pricePerHour));
        if (showRating && rating > 0) append(sb, String.format("ocena: %.2f", rating));
        if (showProfit) append(sb, String.format("zysk: %.1f zł", profit));

        final String text = sb.length() > 0 ? sb.toString() : "Brak danych";
        overlayTextView.post(() -> overlayTextView.setText(text));

        // Wyślij do React Native
        sendToReactNative(isProfitable, pricePerKm, pricePerHour);
    }

    private void append(StringBuilder sb, String s) {
        if (sb.length() > 0) sb.append(" | ");
        sb.append(s);
    }

    private void triggerScan() {
        Log.d(TAG, "Manual scan triggered");
        sendToReactNativeAction("OverlayScanPressed");
    }

    private void sendToReactNative(boolean profitable, double perKm, double perH) {
        try {
            ReactApplication app = (ReactApplication) getApplicationContext();
            ReactContext ctx = app.getReactNativeHost().getReactInstanceManager().getCurrentReactContext();
            if (ctx == null) return;
            WritableMap map = Arguments.createMap();
            map.putBoolean("isProfitable", profitable);
            map.putDouble("pricePerKm", perKm);
            map.putDouble("pricePerHour", perH);
            map.putDouble("price", price);
            map.putDouble("pickupKm", pickupKm);
            map.putDouble("tripKm", tripKm);
            map.putInt("totalMin", pickupMin + tripMin);
            map.putDouble("rating", rating);
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
               .emit("OverlayRideUpdated", map);
        } catch (Exception ignored) {}
    }

    private void sendToReactNativeAction(String event) {
        try {
            ReactApplication app = (ReactApplication) getApplicationContext();
            ReactContext ctx = app.getReactNativeHost().getReactInstanceManager().getCurrentReactContext();
            if (ctx == null) return;
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
               .emit(event, null);
        } catch (Exception ignored) {}
    }

    private int dp(int value) {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        return Math.round(value * dm.density);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "TaxiAnalysis Overlay", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Utrzymuje nakładkę RideHelper w tle");
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TaxiAnalysis aktywny")
            .setContentText("Nasłuchuję ofert kursów...")
            .setSmallIcon(android.R.drawable.ic_menu_mapmode)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        hideOverlay();
        super.onDestroy();
    }
}
`;

// ─── OverlayModule.java (React Native bridge) ────────────────────────────────
const OVERLAY_MODULE_JAVA = `package com.taxianalysis.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Promise;

/**
 * OverlayModule — Native Module dostępny z React Native.
 * Pozwala kontrolować nakładkę i przekazywać ustawienia.
 */
public class OverlayModule extends ReactContextBaseJavaModule {

    private static final String PREFS_NAME = "TaxiAnalysisPrefs";

    public OverlayModule(ReactApplicationContext ctx) {
        super(ctx);
    }

    @Override
    public String getName() { return "OverlayModule"; }

    @ReactMethod
    public void showOverlay() {
        Intent i = new Intent(getReactApplicationContext(), FloatingOverlayService.class);
        i.setAction(FloatingOverlayService.ACTION_SHOW);
        getReactApplicationContext().startService(i);
    }

    @ReactMethod
    public void hideOverlay() {
        Intent i = new Intent(getReactApplicationContext(), FloatingOverlayService.class);
        i.setAction(FloatingOverlayService.ACTION_HIDE);
        getReactApplicationContext().startService(i);
    }

    @ReactMethod
    public void startOverlayService() {
        Intent i = new Intent(getReactApplicationContext(), FloatingOverlayService.class);
        getReactApplicationContext().startForegroundService(i);
    }

    @ReactMethod
    public void stopOverlayService() {
        getReactApplicationContext().stopService(
            new Intent(getReactApplicationContext(), FloatingOverlayService.class));
    }

    @ReactMethod
    public void openOverlayPermissionSettings() {
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(i);
    }

    @ReactMethod
    public void openAccessibilitySettings() {
        Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(i);
    }

    @ReactMethod
    public void hasOverlayPermission(Promise promise) {
        boolean has = Settings.canDrawOverlays(getReactApplicationContext());
        promise.resolve(has);
    }

    @ReactMethod
    public void hasAccessibilityPermission(Promise promise) {
        AccessibilityManager am = (AccessibilityManager)
            getReactApplicationContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
        boolean enabled = am != null && am.isEnabled();
        promise.resolve(enabled);
    }

    @ReactMethod
    public void saveSettings(ReadableMap settings) {
        SharedPreferences.Editor ed = getReactApplicationContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();

        if (settings.hasKey("minPricePerKm"))  ed.putString("minPricePerKm",  String.valueOf(settings.getDouble("minPricePerKm")));
        if (settings.hasKey("minPricePerHour")) ed.putString("minPricePerHour", String.valueOf(settings.getDouble("minPricePerHour")));
        if (settings.hasKey("minRating"))       ed.putString("minRating",       String.valueOf(settings.getDouble("minRating")));
        if (settings.hasKey("maxDeadKmRatio"))  ed.putString("maxDeadKmRatio",  String.valueOf(settings.getDouble("maxDeadKmRatio")));
        if (settings.hasKey("fuelCostPerKm"))   ed.putString("fuelCostPerKm",   String.valueOf(settings.getDouble("fuelCostPerKm")));

        if (settings.hasKey("showPrice"))      ed.putBoolean("showPrice",      settings.getBoolean("showPrice"));
        if (settings.hasKey("showKm1"))        ed.putBoolean("showKm1",        settings.getBoolean("showKm1"));
        if (settings.hasKey("showKm2"))        ed.putBoolean("showKm2",        settings.getBoolean("showKm2"));
        if (settings.hasKey("showTotalKm"))    ed.putBoolean("showTotalKm",    settings.getBoolean("showTotalKm"));
        if (settings.hasKey("showPricePerKm")) ed.putBoolean("showPricePerKm", settings.getBoolean("showPricePerKm"));
        if (settings.hasKey("showPricePerHour"))ed.putBoolean("showPricePerHour",settings.getBoolean("showPricePerHour"));
        if (settings.hasKey("showRating"))     ed.putBoolean("showRating",     settings.getBoolean("showRating"));
        if (settings.hasKey("showProfit"))     ed.putBoolean("showProfit",     settings.getBoolean("showProfit"));

        ed.apply();
    }
}
`;

// ─── OverlayPackage.java ──────────────────────────────────────────────────────
const OVERLAY_PACKAGE_JAVA = `package com.taxianalysis.app;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class OverlayPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        return Arrays.asList(new OverlayModule(ctx));
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext ctx) {
        return Collections.emptyList();
    }
}
`;

// ─── MainApplication patch — dodaj OverlayPackage ────────────────────────────
function patchMainApplication(mainAppPath) {
  if (!fs.existsSync(mainAppPath)) return;
  let content = fs.readFileSync(mainAppPath, "utf8");
  if (content.includes("OverlayPackage")) return; // już dodane

  // Dodaj import
  content = content.replace(
    /^(package com\.taxianalysis\.app;)/m,
    "$1\n\nimport com.taxianalysis.app.OverlayPackage;"
  );

  // Dodaj do getPackages()
  content = content.replace(
    /List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);/,
    `List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new OverlayPackage());`
  );

  fs.writeFileSync(mainAppPath, content, "utf8");
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
const withFloatingOverlay = (config) => {
  // 1) AndroidManifest
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    if (!app.service) app.service = [];

    if (!app.service.some((s) => s.$["android:name"] === ".FloatingOverlayService")) {
      app.service.push({
        $: {
          "android:name": ".FloatingOverlayService",
          "android:foregroundServiceType": "specialUse",
          "android:exported": "false",
        },
      });
    }

    // SYSTEM_ALERT_WINDOW uses-permission
    if (!cfg.modResults.manifest["uses-permission"]) cfg.modResults.manifest["uses-permission"] = [];
    const perms = cfg.modResults.manifest["uses-permission"];
    const alertPerm = "android.permission.SYSTEM_ALERT_WINDOW";
    if (!perms.some((p) => p.$["android:name"] === alertPerm)) {
      perms.push({ $: { "android:name": alertPerm } });
    }

    return cfg;
  });

  // 2) Java files
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const javaDir = path.join(root, "android", "app", "src", "main", "java", "com", "taxianalysis", "app");
      fs.mkdirSync(javaDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, "FloatingOverlayService.java"), OVERLAY_SERVICE_JAVA, "utf8");
      fs.writeFileSync(path.join(javaDir, "OverlayModule.java"), OVERLAY_MODULE_JAVA, "utf8");
      fs.writeFileSync(path.join(javaDir, "OverlayPackage.java"), OVERLAY_PACKAGE_JAVA, "utf8");

      // Patch MainApplication
      const mainApp = path.join(javaDir, "MainApplication.java");
      patchMainApplication(mainApp);

      console.log("[withFloatingOverlay] Files written.");
      return cfg;
    },
  ]);

  return config;
};

module.exports = withFloatingOverlay;
