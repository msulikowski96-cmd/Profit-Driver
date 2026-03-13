import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import { useEffect, useCallback } from "react";

const { OverlayModule } = NativeModules;

export interface OverlayRideData {
  isProfitable: boolean;
  pricePerKm: number;
  pricePerHour: number;
  price: number;
  pickupKm: number;
  tripKm: number;
  totalMin: number;
  rating: number;
}

const emitter = OverlayModule ? new NativeEventEmitter(OverlayModule) : null;

export function useOverlay({
  onRideUpdated,
  onScanPressed,
}: {
  onRideUpdated?: (data: OverlayRideData) => void;
  onScanPressed?: () => void;
} = {}) {
  useEffect(() => {
    if (!emitter) return;
    const subs = [
      onRideUpdated && emitter.addListener("OverlayRideUpdated", onRideUpdated),
      onScanPressed && emitter.addListener("OverlayScanPressed", onScanPressed),
    ].filter(Boolean);
    return () => subs.forEach((s) => s?.remove());
  }, [onRideUpdated, onScanPressed]);

  const showOverlay = useCallback(() => {
    if (!OverlayModule) return;
    OverlayModule.showOverlay();
  }, []);

  const hideOverlay = useCallback(() => {
    if (!OverlayModule) return;
    OverlayModule.hideOverlay();
  }, []);

  const startService = useCallback(() => {
    if (!OverlayModule) return;
    OverlayModule.startOverlayService();
  }, []);

  const stopService = useCallback(() => {
    if (!OverlayModule) return;
    OverlayModule.stopOverlayService();
  }, []);

  const openOverlayPermission = useCallback(() => {
    if (!OverlayModule) return;
    OverlayModule.openOverlayPermissionSettings();
  }, []);

  const openAccessibility = useCallback(() => {
    if (!OverlayModule) return;
    OverlayModule.openAccessibilitySettings();
  }, []);

  const checkOverlayPermission = useCallback(async (): Promise<boolean> => {
    if (!OverlayModule) return false;
    try { return await OverlayModule.hasOverlayPermission(); }
    catch { return false; }
  }, []);

  const checkAccessibilityPermission = useCallback(async (): Promise<boolean> => {
    if (!OverlayModule) return false;
    try { return await OverlayModule.hasAccessibilityPermission(); }
    catch { return false; }
  }, []);

  const saveNativeSettings = useCallback((settings: Record<string, number | boolean>) => {
    if (!OverlayModule) return;
    OverlayModule.saveSettings(settings);
  }, []);

  return {
    showOverlay,
    hideOverlay,
    startService,
    stopService,
    openOverlayPermission,
    openAccessibility,
    checkOverlayPermission,
    checkAccessibilityPermission,
    saveNativeSettings,
    isNativeAvailable: !!OverlayModule,
  };
}
