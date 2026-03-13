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
import { RideAnalysis } from "@/context/RideHistoryContext";
import { useRideHistory } from "@/context/RideHistoryContext";
import { useSettings } from "@/context/SettingsContext";
import { calculateRide } from "@/utils/calculator";
import { OverlayPreview } from "@/components/OverlayPreview";
import { ResultCard } from "@/components/ResultCard";
import { RideInputModal } from "@/components/RideInputModal";
import { PlatformBadge } from "@/components/PlatformBadge";
import { Platform as RidePlatform } from "@/context/RideHistoryContext";

export default function AnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { addRide, history } = useRideHistory();

  const [showModal, setShowModal] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<RideAnalysis | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentRideData, setCurrentRideData] = useState<{
    price: number;
    pickupDistance: number;
    tripDistance: number;
    estimatedTime: number;
  } | null>(null);

  const isWeb = Platform.OS === "web";

  const handleAnalyze = async (data: {
    platform: RidePlatform;
    price: number;
    pickupDistance: number;
    tripDistance: number;
    estimatedTime: number;
  }) => {
    setShowModal(false);

    const result = calculateRide(
      {
        price: data.price,
        pickupDistance: data.pickupDistance,
        tripDistance: data.tripDistance,
        estimatedTime: data.estimatedTime,
      },
      settings
    );

    const analysis: RideAnalysis = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      platform: data.platform,
      price: data.price,
      pickupDistance: data.pickupDistance,
      tripDistance: data.tripDistance,
      estimatedTime: data.estimatedTime,
      totalDistance: result.totalDistance,
      pricePerKm: result.pricePerKm,
      pricePerHour: result.pricePerHour,
      estimatedProfit: result.estimatedProfit,
      isProfitable: result.isProfitable,
    };

    setCurrentAnalysis(analysis);
    setCurrentRideData({
      price: data.price,
      pickupDistance: data.pickupDistance,
      tripDistance: data.tripDistance,
      estimatedTime: data.estimatedTime,
    });
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
        {
          paddingTop: isWeb
            ? insets.top + 67
            : insets.top + 16,
        },
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
          <View style={[styles.liveIndicator]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Overlay preview */}
        {showOverlay && currentAnalysis ? (
          <View style={styles.overlaySection}>
            <Text style={styles.sectionLabel}>Nakładka (Overlay)</Text>
            <OverlayPreview
              analysis={currentAnalysis}
              onDismiss={() => setShowOverlay(false)}
            />
          </View>
        ) : null}

        {/* Result card */}
        {currentAnalysis && currentRideData ? (
          <View style={styles.resultSection}>
            <ResultCard
              result={{
                totalDistance: currentAnalysis.totalDistance,
                pricePerKm: currentAnalysis.pricePerKm,
                pricePerHour: currentAnalysis.pricePerHour,
                estimatedProfit: currentAnalysis.estimatedProfit,
                isProfitable: currentAnalysis.isProfitable,
                profitabilityScore: Math.round(
                  Math.min(
                    ((currentAnalysis.pricePerKm / settings.minPricePerKm) * 50 +
                      (currentAnalysis.pricePerHour / settings.minPricePerHour) * 50) /
                      2,
                    100
                  )
                ),
              }}
              price={currentRideData.price}
              pickupDistance={currentRideData.pickupDistance}
              tripDistance={currentRideData.tripDistance}
              estimatedTime={currentRideData.estimatedTime}
            />
          </View>
        ) : (
          <EmptyState onPress={() => setShowModal(true)} />
        )}

        {/* Recent history */}
        {recentRides.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>Ostatnie kursy</Text>
            {recentRides.map((ride) => (
              <View key={ride.id} style={styles.miniCard}>
                <PlatformBadge platform={ride.platform} size="sm" />
                <Text style={styles.miniPrice}>{ride.price.toFixed(2)} zł</Text>
                <View
                  style={[
                    styles.miniDot,
                    {
                      backgroundColor: ride.isProfitable
                        ? Colors.light.tint
                        : Colors.light.danger,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.miniStatus,
                    {
                      color: ride.isProfitable
                        ? Colors.light.tint
                        : Colors.light.danger,
                    },
                  ]}
                >
                  {ride.isProfitable ? "Opłacalny" : "Nieopłacalny"}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: (isWeb ? 34 + 84 : insets.bottom + 84) + 16 },
        ]}
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
        jej opłacalność.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
        <Text style={styles.emptyBtnText}>Analizuj pierwszy kurs</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tintGlow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.tint,
  },
  liveText: {
    color: Colors.light.tint,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  overlaySection: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: Colors.light.textMuted,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  resultSection: {
    marginBottom: 24,
  },
  recentSection: {
    marginTop: 8,
  },
  miniCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  miniPrice: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniStatus: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 50,
    gap: 10,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.light.tintGlow,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.light.tintGlow,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: Colors.light.tint,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
