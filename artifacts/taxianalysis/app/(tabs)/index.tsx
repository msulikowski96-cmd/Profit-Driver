import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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
import { calculateRide, getAveragePrice, recordPrice } from "@/utils/calculator";
import { OverlayPreview } from "@/components/OverlayPreview";
import { ResultCard } from "@/components/ResultCard";
import { RideInputModal } from "@/components/RideInputModal";
import { PlatformBadge } from "@/components/PlatformBadge";
import { CalculationResult } from "@/utils/calculator";

interface FullAnalysis {
  ride: RideAnalysis;
  result: CalculationResult;
}

export default function AnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { addRide, history } = useRideHistory();

  const [showModal, setShowModal] = useState(false);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysis | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const isWeb = Platform.OS === "web";

  const handleAnalyze = async (data: {
    platform: RidePlatform;
    price: number;
    pickupDistance: number;
    tripDistance: number;
    estimatedTime: number;
    rating?: number;
  }) => {
    setShowModal(false);

    const result = calculateRide(
      {
        price: data.price,
        pickupDistance: data.pickupDistance,
        tripDistance: data.tripDistance,
        estimatedTime: data.estimatedTime,
        rating: data.rating,
      },
      settings
    );

    recordPrice(data.price);

    const analysis: RideAnalysis = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      platform: data.platform,
      price: data.price,
      pickupDistance: data.pickupDistance,
      tripDistance: data.tripDistance,
      estimatedTime: data.estimatedTime,
      rating: data.rating,
      totalDistance: result.totalDistance,
      pricePerKm: result.pricePerKm,
      pricePerHour: result.pricePerHour,
      pricePerMinute: result.pricePerMinute,
      estimatedProfit: result.estimatedProfit,
      deadKmRatio: result.deadKmRatio,
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
            <ResultCard
              result={fullAnalysis.result}
              price={fullAnalysis.ride.price}
              pickupDistance={fullAnalysis.ride.pickupDistance}
              tripDistance={fullAnalysis.ride.tripDistance}
              estimatedTime={fullAnalysis.ride.estimatedTime}
              rating={fullAnalysis.ride.rating}
            />
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
                <Text style={styles.miniPrice}>{ride.price.toFixed(2)} zł</Text>
                <Text style={styles.miniKm}>{ride.totalDistance.toFixed(1)} km</Text>
                <View style={styles.miniRight}>
                  <Text style={[styles.miniScore, {
                    color: ride.isProfitable ? Colors.light.tint : Colors.light.danger
                  }]}>
                    {ride.profitabilityScore}/100
                  </Text>
                  <View style={[styles.miniDot, {
                    backgroundColor: ride.isProfitable ? Colors.light.tint : Colors.light.danger
                  }]} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: (isWeb ? 34 + 84 : insets.bottom + 84) + 16 }]}
        onPress={() => setShowModal(true)}
        testID="analyze-fab"
        activeOpacity={0.85}
      >
        <Feather name="zap" size={24} color="#000" />
        <Text style={styles.fabText}>Analizuj kurs</Text>
      </TouchableOpacity>

      <RideInputModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onAnalyze={handleAnalyze}
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
        Naciśnij przycisk poniżej, aby wprowadzić dane oferty kursu i sprawdzić
        jej opłacalność w czasie rzeczywistym.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
        <Text style={styles.emptyBtnText}>Analizuj pierwszy kurs</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20,
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
  miniPrice: { flex: 1, color: Colors.light.text, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  miniKm: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
  miniRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniScore: { fontSize: 12, fontFamily: "Inter_700Bold" },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
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
    textAlign: "center", lineHeight: 20, maxWidth: 280,
  },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.light.tintGlow,
    borderWidth: 1, borderColor: Colors.light.tint,
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  emptyBtnText: { color: Colors.light.tint, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
