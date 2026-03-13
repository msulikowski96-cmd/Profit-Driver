import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { CalculationResult } from "@/utils/calculator";

interface Props {
  result: CalculationResult;
  price: number;
  pickupDistance: number;
  tripDistance: number;
  estimatedTime: number;
}

export function ResultCard({
  result,
  price,
  pickupDistance,
  tripDistance,
  estimatedTime,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scoreAnim, {
        toValue: result.profitabilityScore,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const isGood = result.isProfitable;
  const accent = isGood ? Colors.light.tint : Colors.light.danger;
  const glow = isGood ? Colors.light.tintGlow : Colors.light.dangerGlow;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      {/* Main verdict */}
      <View
        style={[
          styles.verdictCard,
          { backgroundColor: glow, borderColor: accent },
        ]}
      >
        <View style={styles.verdictLeft}>
          <View style={[styles.iconCircle, { backgroundColor: accent }]}>
            <Feather
              name={isGood ? "check" : "x"}
              size={24}
              color="#000"
            />
          </View>
          <View>
            <Text style={[styles.verdictTitle, { color: accent }]}>
              {isGood ? "Opłacalny kurs" : "Nieopłacalny kurs"}
            </Text>
            <Text style={styles.verdictSub}>
              Wynik: {result.profitabilityScore}/100
            </Text>
          </View>
        </View>
        <Text style={[styles.priceMain, { color: accent }]}>
          {price.toFixed(2)} zł
        </Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatBox
          icon="trending-up"
          label="Zarobek/km"
          value={`${result.pricePerKm.toFixed(2)} zł`}
          accent={isGood}
        />
        <StatBox
          icon="clock"
          label="Zarobek/h"
          value={`${Math.round(result.pricePerHour)} zł`}
          accent={isGood}
        />
        <StatBox
          icon="dollar-sign"
          label="Szac. zysk"
          value={`${result.estimatedProfit.toFixed(2)} zł`}
          accent={isGood}
        />
        <StatBox
          icon="map"
          label="Łączny km"
          value={`${result.totalDistance.toFixed(1)} km`}
          accent={null}
        />
      </View>

      {/* Route breakdown */}
      <View style={styles.routeCard}>
        <Text style={styles.routeTitle}>Szczegóły trasy</Text>
        <RouteRow
          icon="navigation"
          label="Podjazd do pasażera"
          value={`${pickupDistance.toFixed(1)} km`}
        />
        <View style={styles.routeDivider} />
        <RouteRow
          icon="map-pin"
          label="Dystans przejazdu"
          value={`${tripDistance.toFixed(1)} km`}
        />
        <View style={styles.routeDivider} />
        <RouteRow
          icon="clock"
          label="Szacowany czas"
          value={`${estimatedTime} min`}
        />
      </View>
    </Animated.View>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: boolean | null;
}) {
  const color =
    accent === null
      ? Colors.light.textSecondary
      : accent
        ? Colors.light.tint
        : Colors.light.danger;

  return (
    <View style={styles.statBox}>
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={16}
        color={color}
      />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RouteRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.routeRow}>
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={15}
        color={Colors.light.textSecondary}
      />
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  verdictCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  verdictLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  verdictTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  verdictSub: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  priceMain: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  routeCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    gap: 10,
  },
  routeTitle: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeLabel: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  routeValue: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  routeDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
});
