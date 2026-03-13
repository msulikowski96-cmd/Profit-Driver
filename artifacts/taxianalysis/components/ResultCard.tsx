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
  rating?: number;
}

export function ResultCard({ result, price, pickupDistance, tripDistance, estimatedTime, rating }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.93)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const isGood = result.isProfitable;
  const accent = isGood ? Colors.light.tint : Colors.light.danger;
  const glow = isGood ? Colors.light.tintGlow : Colors.light.dangerGlow;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      {/* Verdict */}
      <View style={[styles.verdictCard, { backgroundColor: glow, borderColor: accent }]}>
        <View style={styles.verdictLeft}>
          <View style={[styles.iconCircle, { backgroundColor: accent }]}>
            <Feather name={isGood ? "check" : "x"} size={22} color="#000" />
          </View>
          <View>
            <Text style={[styles.verdictTitle, { color: accent }]}>
              {isGood ? "Opłacalny kurs" : "Nieopłacalny"}
            </Text>
            <Text style={styles.verdictSub}>
              Wynik: {result.profitabilityScore}/100 · Efektywność: {result.efficiencyScore}/100
            </Text>
          </View>
        </View>
        <Text style={[styles.priceMain, { color: accent }]}>{price.toFixed(2)} zł</Text>
      </View>

      {/* Average price comparison */}
      {result.avgPriceSoFar != null && (
        <View style={styles.avgRow}>
          <Feather name="bar-chart-2" size={13} color={Colors.light.textSecondary} />
          <Text style={styles.avgText}>
            Śr. cena z ostatnich kursów:{" "}
            <Text style={{ color: Colors.light.text, fontFamily: "Inter_600SemiBold" }}>
              {result.avgPriceSoFar.toFixed(2)} zł
            </Text>
            {price > result.avgPriceSoFar
              ? <Text style={{ color: Colors.light.tint }}> ↑ powyżej średniej</Text>
              : <Text style={{ color: Colors.light.danger }}> ↓ poniżej średniej</Text>}
          </Text>
        </View>
      )}

      {/* Main metrics grid */}
      <View style={styles.statsGrid}>
        <StatBox icon="trending-up" label="zł/km" value={result.pricePerKm.toFixed(2)} accent={isGood} />
        <StatBox icon="clock" label="zł/h" value={Math.round(result.pricePerHour).toString()} accent={isGood} />
        <StatBox icon="dollar-sign" label="Zysk" value={`${result.estimatedProfit.toFixed(1)} zł`} accent={isGood} />
        <StatBox icon="activity" label="zł/min" value={result.pricePerMinute.toFixed(2)} accent={null} />
      </View>

      {/* Threshold checks */}
      <View style={styles.thresholdsCard}>
        <Text style={styles.sectionTitle}>Sprawdzenie progów</Text>
        {result.thresholdChecks.map((check) => (
          <View key={check.label} style={styles.checkRow}>
            <Feather
              name={check.passed ? "check-circle" : "x-circle"}
              size={15}
              color={check.passed ? Colors.light.tint : Colors.light.danger}
            />
            <Text style={styles.checkLabel}>{check.label}</Text>
            <View style={styles.checkRight}>
              <Text style={[styles.checkValue, { color: check.passed ? Colors.light.tint : Colors.light.danger }]}>
                {check.value}
              </Text>
              <Text style={styles.checkThreshold}>({check.threshold})</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Route breakdown */}
      <View style={styles.routeCard}>
        <Text style={styles.sectionTitle}>Szczegóły trasy</Text>
        <RouteRow icon="navigation" label="Km do pasażera (martwy km)" value={`${pickupDistance.toFixed(1)} km`} />
        <View style={styles.sep} />
        <RouteRow icon="map-pin" label="Km kursu" value={`${tripDistance.toFixed(1)} km`} />
        <View style={styles.sep} />
        <RouteRow icon="map" label="Suma km" value={`${result.totalDistance.toFixed(1)} km`} />
        <View style={styles.sep} />
        <RouteRow icon="percent" label="Udział martwych km" value={`${(result.deadKmRatio * 100).toFixed(0)}%`} />
        <View style={styles.sep} />
        <RouteRow icon="clock" label="Szacowany czas" value={`${estimatedTime} min`} />
        {rating != null && (
          <>
            <View style={styles.sep} />
            <RouteRow icon="star" label="Ocena pasażera" value={rating.toFixed(2)} />
          </>
        )}
      </View>
    </Animated.View>
  );
}

function StatBox({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent: boolean | null;
}) {
  const color =
    accent === null ? Colors.light.textSecondary :
    accent ? Colors.light.tint : Colors.light.danger;
  return (
    <View style={styles.statBox}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RouteRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.routeRow}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={14} color={Colors.light.textSecondary} />
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  verdictCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  verdictLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  verdictTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  verdictSub: { color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  priceMain: { fontSize: 20, fontFamily: "Inter_700Bold" },
  avgRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.light.backgroundCard, borderRadius: 10,
    padding: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.light.border,
  },
  avgText: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  statsGrid: { flexDirection: "row", gap: 6, marginBottom: 8 },
  statBox: {
    flex: 1, backgroundColor: Colors.light.backgroundCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.light.border,
    padding: 10, alignItems: "center", gap: 3,
  },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  statLabel: { fontSize: 9, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", textAlign: "center" },
  thresholdsCard: {
    backgroundColor: Colors.light.backgroundCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.light.border,
    padding: 14, marginBottom: 8, gap: 8,
  },
  sectionTitle: {
    color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkLabel: { flex: 1, color: Colors.light.text, fontSize: 13, fontFamily: "Inter_400Regular" },
  checkRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  checkThreshold: { fontSize: 11, color: Colors.light.textMuted, fontFamily: "Inter_400Regular" },
  routeCard: {
    backgroundColor: Colors.light.backgroundCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.light.border, padding: 14, gap: 8,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeLabel: { flex: 1, color: Colors.light.text, fontSize: 13, fontFamily: "Inter_400Regular" },
  routeValue: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sep: { height: 1, backgroundColor: Colors.light.border },
});
