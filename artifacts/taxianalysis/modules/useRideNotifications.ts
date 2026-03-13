/**
 * Hook nasłuchujący powiadomień z aplikacji kierowców (Uber Driver, Bolt Driver, FreeNow).
 * Działa tylko w skompilowanym APK z aktywnym NotificationListenerService.
 * W Expo Go zwraca null — brak natywnego wsparcia.
 */

import { useEffect, useRef, useState } from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import { parseRideText } from "@/utils/calculator";
import { Platform as RidePlatform } from "@/context/RideHistoryContext";
import { PaymentType } from "@/components/RideInputModal";

export interface NotificationRideData {
  platform: RidePlatform;
  serviceType: string;
  paymentType: PaymentType;
  price?: number;
  rating?: number;
  pickupDistance?: number;
  pickupTime?: number;
  tripDistance?: number;
  tripTime?: number;
  pickupAddress?: string;
  destinationAddress?: string;
  rawText: string;
  packageName: string;
  timestamp: number;
}

// Mapa pakietów → typ usługi (domyślny)
const PACKAGE_SERVICE_MAP: Record<string, string> = {
  "com.ubercab.driver": "UberX",
  "ee.mtakso.client": "Bolt",
  "com.bolt.android.driver": "Bolt",
  "com.taxify.driver": "Bolt",
  "eu.mytexi.app": "FreeNow",
  "com.freenow.passenger": "FreeNow",
};

function parseServiceType(text: string, platform: RidePlatform, pkg: string): string {
  // Wykryj typ usługi z tekstu powiadomienia
  if (platform === "uber") {
    if (/uber\s*comfort/i.test(text)) return "Uber Comfort";
    if (/uber\s*xl/i.test(text)) return "Uber XL";
    if (/ubergreen/i.test(text)) return "UberGreen";
    if (/uberx/i.test(text)) return "UberX";
  }
  if (platform === "bolt") {
    if (/comfort/i.test(text)) return "Bolt Comfort";
    if (/xl/i.test(text)) return "Bolt XL";
    if (/pet/i.test(text)) return "Bolt Pet";
  }
  if (platform === "freeNow") {
    if (/comfort/i.test(text)) return "FreeNow Comfort";
    if (/xl/i.test(text)) return "FreeNow XL";
  }
  return PACKAGE_SERVICE_MAP[pkg] ?? (platform === "uber" ? "UberX" : platform === "bolt" ? "Bolt" : "FreeNow");
}

function detectPaymentType(text: string): PaymentType {
  if (/gotówk/i.test(text) || /cash/i.test(text)) return "cash";
  if (/kart/i.test(text) || /card/i.test(text)) return "card";
  return "online";
}

type Listener = (data: NotificationRideData) => void;

export function useRideNotifications(onNotification: Listener) {
  const listenerRef = useRef(onNotification);
  listenerRef.current = onNotification;

  useEffect(() => {
    if (Platform.OS !== "android") return;

    // NativeModules.DevSettings nie istnieje w Expo Go dla custom modułów
    // Używamy NativeEventEmitter z null module — bezpieczne podejście
    let emitter: NativeEventEmitter | null = null;
    let subscription: { remove: () => void } | null = null;

    try {
      // DeviceEventEmitter od React Native działa bez custom native module
      const { DeviceEventEmitter } = require("react-native");

      subscription = DeviceEventEmitter.addListener(
        "RideNotificationReceived",
        (event: { text: string; platform: string; packageName: string; timestamp: number }) => {
          const { text, platform, packageName, timestamp } = event;
          const ridePlatform = (["uber", "bolt", "freeNow"].includes(platform)
            ? platform
            : "uber") as RidePlatform;

          // Parsuj tekst powiadomienia
          const parsed = parseRideText(text);
          const serviceType = parseServiceType(text, ridePlatform, packageName);
          const paymentType = detectPaymentType(text);

          const rideData: NotificationRideData = {
            platform: ridePlatform,
            serviceType,
            paymentType,
            price: parsed.price,
            rating: parsed.rating,
            pickupDistance: parsed.pickupDistance,
            pickupTime: parsed.pickupTime,
            tripDistance: parsed.tripDistance,
            tripTime: parsed.tripTime,
            pickupAddress: parsed.pickupAddress,
            destinationAddress: parsed.destinationAddress,
            rawText: text,
            packageName,
            timestamp,
          };

          listenerRef.current(rideData);
        }
      );
    } catch (e) {
      // Expo Go lub platforma nieobsługiwana
      console.log("[useRideNotifications] Native event not available (Expo Go)");
    }

    return () => {
      subscription?.remove();
    };
  }, []);
}

/**
 * Sprawdza czy uprawnienie do czytania powiadomień jest przyznane.
 * Zwraca false w Expo Go.
 */
export function checkNotificationListenerPermission(): boolean {
  if (Platform.OS !== "android") return false;
  try {
    const { NativeModules } = require("react-native");
    // W przyszłości można dodać natywny moduł sprawdzający to uprawnienie
    return false; // domyślnie — wymaga sprawdzenia w ustawieniach
  } catch {
    return false;
  }
}
