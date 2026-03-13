import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { RideAnalysis, Platform as RidePlatform } from "@/context/RideHistoryContext";
import { useRideHistory } from "@/context/RideHistoryContext";
import { useSettings } from "@/context/SettingsContext";
import { calculateRide, getAveragePrice, recordPrice, CalculationResult } from "@/utils/calculator";
import { OverlayPreview } from "@/components/OverlayPreview";
import { ResultCard } from "@/components/ResultCard";
import { RideInputModal, RideInputData } from "@/components/RideInputModal";
import { PlatformBadge } from "@/components/PlatformBadge";
import { useRideNotifications, NotificationRideData } from "@/modules/useRideNotifications";

interface FullAnalysis {
  ride: RideAnalysis;
  result: CalculationResult;
}

const PLATFORM_LABELS: Record<RidePlatform, string> = {
  uber: "Uber Driver",
  bolt: "Bolt Driver",
  freeNow: "FreeNow",
};

export default function AnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { addRide, history } = useRideHistory();

  const [showModal, setShowModal] = useState(false);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysis | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<NotificationRideData | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<RideInputData> | null>(null);

  // Animacja dla baneru powiadomienia
  const bannerAnim = useRef(new Animated.Value(-80)).current;

  const isWeb = Platform.OS === "web";

  // ── Obsługa powiadomień z Ubera/Bolta/FreeNow ────────────────────────────
  useRideNotifications((notification) => {
    // Dane z powiadomienia → wstępnie wypełnij formularz
    setPrefillData({
      platform: notification.platform,
      serviceType: notification.serviceType,
      paymentType: notification.paymentType,
      price: notification.price ?? 0,
      rating: notification.rating,
      pickupDistance: notification.pickupDistance ?? 0,
      pickupTime: notification.pickupTime ?? 0,
      tripDistance: notification.tripDistance ?? 0,
      tripTime: notification.tripTime ?? 0,
      pickupAddress: notification.pickupAddress,
      destinationAddress: notification.destinationAddress,
    });
    setPendingNotification(notification);

    // Pokaż baner
    Animated.sequence([
      Animated.spring(bannerAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();

    // Haptyczny feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  });

  const dismissBanner = () => {
    Animated.timing(bannerAnim, {
      toValue: -80,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setPendingNotification(null));
  };

  const openFromNotification = () => {
    dismissBanner();
    setShowModal(true);
  };

  // ── Analiza kursu ─────────────────────────────────────────────────────────
  const handleAnalyze = async (data: RideInputData) => {
    setShowModal(false);
    setPrefillData(null);

    const result = calculateRide(
      {
        price: data.price,
        pickupDistance: data.pickupDistance,
        pickupTime: data.pickupTime,
        tripDistance: data.tripDistance,
        tripTime: data.tripTime,
        rating: data.rating,
      },
      settings
    );

    recordPrice(data.price);

    const analysis: RideAnalysis = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      platform: data.platform,
      serviceType: data.serviceType,
      paymentType: data.paymentType,
      price: data.price,
      pickupDistance: data.pickupDistance,
      pickupTime: data.pickupTime,
      tripDistance: data.tripDistance,
      tripTime: data.tripTime,
      rating: data.rating,
      pickupAddress: data.pickupAddress,
      destinationAddress: data.destinationAddress,
      totalDistance: result.totalDistance,
      totalTime: result.totalTime,
      pricePerKm: result.pricePerKm,
      pricePerHour: result.pricePerHour,
      pricePerMinute: result.pricePerMinute,
      estimatedProfit: result.estimatedProfit,
      deadKmRatio: result.deadKmRatio,
      deadTimeRatio: result.deadTimeRatio,
      isProfitable: result.isProfitable,
      profitabilityScore: result.profitabilityScore,
      failedReasons: result.failedReasons,
    };

    setFullAnalysis({ ride: analysis, result });
    setShowOverlay(true);
    await addRide(analysis);

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(
        result.isProfitable
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    }
  };

  const recentRides = history.slice(0, 3);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: isWeb ? insets.top + 67 : insets.top + 16 },
      ]}
    >
      {/* Baner przychodzącego powiadomienia */}
      {pendingNotification && (
        <Animated.View
          style={[
            styles.notifBanner,
            { transform: [{ translateY: bannerAnim }] },
          ]}
        >
          <View style={styles.notifLeft}>
            <View style={styles.notifDot} />
            <View>
              <Text style={styles.notifTitle}>
                Nowe zlecenie — {PLATFORM_LABELS[pendingNotification.platform]}
              </Text>
              <Text style={styles.notifSub} numberOfLines={1}>
                {pendingNotification.rawText.split("\n")[0]}
              </Text>
            </View>
          </View>
          <View style={styles.notifActions}>
            <TouchableOpacity style={styles.notifAnalyzeBtn} onPress={openFromNotification}>
              <Text style={styles.notifAnalyzeBtnText}>Analizuj</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissBanner} style={styles.notifClose}>
              <Feather name="x" size={16} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scroll,
          isWeb && { paddingBottom: 34 + 84 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>TaxiAnalysis</Text>
            <Text style={styles.subtitle}>Sprawdź opłacalność kursu</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Info o trybie automatycznym (Android) */}
        {Platform.OS === "android" && (
          <View style={styles.autoInfoCard}>
            <Feather name="bell" size={14} color={Colors.light.tint} />
            <Text style={styles.autoInfoText}>
              Tryb automatyczny aktywny — aplikacja wykryje powiadomienie z Ubera/Bolta/FreeNow i wypełni formularz automatycznie.
            </Text>
          </View>
        )}
        {isWeb && (
          <View style={[styles.autoInfoCard, { borderColor: Colors.light.warningGlow }]}>
            <Feather name="monitor" size={14} color={Colors.light.warning} />
            <Text style={[styles.autoInfoText, { color: Colors.light.warning }]}>
              Podgląd web — tryb automatyczny działa tylko w skompilowanym APK na Androidzie.
            </Text>
          </View>
        )}

        {/* Overlay preview */}
        {showOverlay && fullAnalysis ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Belka RideHelper (Overlay)</Text>
            <OverlayPreview
              analysis={fullAnalysis.ride}
              overlayElements={settings.overlayElements}
              avgPrice={getAveragePrice()}
              onDismiss={() => setShowOverlay(false)}
            />
          </View>
        ) : null}

        {/* Result card */}
        {fullAnalysis ? (
          <View style={styles.section}>
            <ResultCard result={fullAnalysis.result} ride={fullAnalysis.ride} />
          </View>
        ) : (
          <EmptyState onPress={() => setShowModal(true)} />
        )}

        {/* Recent rides */}
        {recentRides.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ostatnie kursy</Text>
            {recentRides.map((ride) => (
              <View key={ride.id} style={styles.miniCard}>
                <PlatformBadge platform={ride.platform} size="sm" />
                <View style={styles.miniMiddle}>
                  <Text style={styles.miniPrice}>{ride.price.toFixed(2)} zł</Text>
                  <Text style={styles.miniDetail}>
                    {ride.serviceType} · {ride.totalDistance.toFixed(1)} km · {ride.totalTime} min
                  </Text>
                </View>
                <Text style={[styles.miniScore, {
                  color: ride.isProfitable ? Colors.light.tint : Colors.light.danger
                }]}>
                  {ride.profitabilityScore}/100
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: (isWeb ? 34 + 84 : insets.bottom + 84) + 16 }]}
        onPress={() => { setPrefillData(null); setShowModal(true); }}
        testID="analyze-fab"
        activeOpacity={0.85}
      >
        <Feather name="zap" size={24} color="#000" />
        <Text style={styles.fabText}>Analizuj kurs</Text>
      </TouchableOpacity>

      <RideInputModal
        visible={showModal}
        onClose={() => { setShowModal(false); setPrefillData(null); }}
        onAnalyze={handleAnalyze}
        prefillData={prefillData ?? undefined}
      />
    </View>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Feather name="zap" size={40} color={Colors.light.tint} />
      </View>
      <Text style={styles.emptyTitle}>Gotowy do analizy</Text>
      <Text style={styles.emptyDesc}>
        Naciśnij przycisk poniżej, aby wprowadzić dane kursu ręcznie,
        lub poczekaj na powiadomienie — formularz wypełni się automatycznie.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
        <Text style={styles.emptyBtnText}>Wpisz dane ręcznie</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  notifBanner: {
    position: "absolute",
    top: 0,
    left: 0, right: 0,
    zIndex: 100,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  notifLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  notifDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  notifTitle: { color: Colors.light.text, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notifSub: { color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" },
  notifActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifAnalyzeBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  notifAnalyzeBtnText: { color: "#000", fontSize: 12, fontFamily: "Inter_700Bold" },
  notifClose: { padding: 4 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  greeting: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },
  subtitle: { fontSize: 14, color: Colors.light.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  liveIndicator: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.light.tintGlow, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.light.tint,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.tint },
  liveText: { color: Colors.light.tint, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  autoInfoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.light.tintGlow,
    borderWidth: 1, borderColor: `${Colors.light.tint}40`,
    borderRadius: 12, padding: 10, marginBottom: 16,
  },
  autoInfoText: {
    flex: 1, color: Colors.light.tint, fontSize: 12,
    fontFamily: "Inter_400Regular", lineHeight: 17,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    color: Colors.light.textMuted, fontSize: 11, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },
  miniCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  miniMiddle: { flex: 1, gap: 2 },
  miniPrice: { color: Colors.light.text, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  miniDetail: { color: Colors.light.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" },
  miniScore: { fontSize: 13, fontFamily: "Inter_700Bold" },
  fab: {
    position: "absolute", alignSelf: "center",
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.light.tint,
    paddingVertical: 16, paddingHorizontal: 28, borderRadius: 50, gap: 10,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: "#000", fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.light.tintGlow, borderWidth: 1, borderColor: Colors.light.tint,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyDesc: {
    fontSize: 14, color: Colors.light.textSecondary, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20, maxWidth: 300,
  },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.light.tintGlow,
    borderWidth: 1, borderColor: Colors.light.tint,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  emptyBtnText: { color: Colors.light.tint, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
