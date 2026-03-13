import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { RideAnalysis } from "@/context/RideHistoryContext";
import { CalculationResult } from "@/utils/calculator";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Gotówka",
  card: "Karta",
  online: "Online",
};

interface Props {
  result: CalculationResult;
  ride: RideAnalysis;
}

export function ResultCard({ result, ride }: Props) {
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
          <View style={styles.verdictText}>
            <Text style={[styles.verdictTitle, { color: accent }]}>
              {isGood ? "Opłacalny kurs" : "Nieopłacalny"}
            </Text>
            <Text style={styles.verdictSub}>
              Wynik: {result.profitabilityScore}/100 · Efektywność: {result.efficiencyScore}/100
            </Text>
          </View>
        </View>
        <View style={styles.verdictRight}>
          <Text style={[styles.priceMain, { color: accent }]}>{ride.price.toFixed(2)} zł</Text>
          <View style={styles.paymentBadge}>
            <Feather
              name={ride.paymentType === "cash" ? "dollar-sign" : ride.paymentType === "card" ? "credit-card" : "smartphone"}
              size={10}
              color={Colors.light.textMuted}
            />
            <Text style={styles.paymentText}>{PAYMENT_LABELS[ride.paymentType] ?? ride.paymentType}</Text>
          </View>
        </View>
      </View>

      {/* Service type + rating row */}
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Feather name="layers" size={11} color={Colors.light.textSecondary} />
          <Text style={styles.metaText}>{ride.serviceType}</Text>
        </View>
        {ride.rating != null && (
          <View style={[styles.metaChip, { backgroundColor: Colors.light.warningGlow, borderColor: `${Colors.light.warning}40` }]}>
            <Feather name="star" size={11} color={Colors.light.warning} />
            <Text style={[styles.metaText, { color: Colors.light.warning }]}>
              {ride.rating.toFixed(2)}
            </Text>
          </View>
        )}
        {result.avgPriceSoFar != null && (
          <View style={styles.metaChip}>
            <Feather name="bar-chart-2" size={11} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>
              śr. {result.avgPriceSoFar.toFixed(2)} zł
              {ride.price > result.avgPriceSoFar
                ? <Text style={{ color: Colors.light.tint }}> ↑</Text>
                : <Text style={{ color: Colors.light.danger }}> ↓</Text>}
            </Text>
          </View>
        )}
      </View>

      {/* Main metrics grid */}
      <View style={styles.statsGrid}>
        <StatBox icon="trending-up" label="zł/km" value={result.pricePerKm.toFixed(2)} accent={isGood} />
        <StatBox icon="clock" label="zł/h" value={Math.round(result.pricePerHour).toString()} accent={isGood} />
        <StatBox icon="dollar-sign" label="Zysk" value={`${result.estimatedProfit.toFixed(1)} zł`} accent={isGood} />
        <StatBox icon="activity" label="zł/min" value={result.pricePerMinute.toFixed(2)} accent={null} />
      </View>

      {/* Threshold checks */}
      <View style={styles.thresholdsCard}>
        <Text style={styles.cardTitle}>Sprawdzenie progów</Text>
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

      {/* Route breakdown matching Uber notification layout */}
      <View style={styles.routeCard}>
        <Text style={styles.cardTitle}>Szczegóły trasy</Text>

        {/* Pickup section */}
        <View style={styles.routeSection}>
          <View style={styles.routeDot}>
            <View style={styles.routeDotInner} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.routeContent}>
            <View style={styles.routeRowInner}>
              <Text style={styles.routeTimeLabel}>
                {ride.pickupTime} min ({ride.pickupDistance.toFixed(1)} km)
              </Text>
              <Text style={styles.routeTag}>dojazd do pasażera</Text>
            </View>
            {ride.pickupAddress ? (
              <Text style={styles.routeAddress}>{ride.pickupAddress}</Text>
            ) : null}
          </View>
        </View>

        {/* Trip section */}
        <View style={styles.routeSection}>
          <View style={styles.routeDot}>
            <View style={[styles.routeDotInner, styles.routeDotDest]} />
          </View>
          <View style={styles.routeContent}>
            <View style={styles.routeRowInner}>
              <Text style={styles.routeTimeLabel}>
                {ride.tripTime} min ({ride.tripDistance.toFixed(1)} km)
              </Text>
              <Text style={styles.routeTag}>przejazd</Text>
            </View>
            {ride.destinationAddress ? (
              <Text style={styles.routeAddress}>{ride.destinationAddress}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.sep} />

        {/* Totals */}
        <RouteRow icon="map" label="Suma km" value={`${result.totalDistance.toFixed(1)} km`} />
        <View style={styles.sep} />
        <RouteRow icon="clock" label="Suma czasu" value={`${result.totalTime} min`} />
        <View style={styles.sep} />
        <RouteRow
          icon="percent"
          label="Udział martwych km"
          value={`${(result.deadKmRatio * 100).toFixed(0)}%`}
          valueColor={result.deadKmRatio > 0.4 ? Colors.light.danger : Colors.light.textSecondary}
        />
        <View style={styles.sep} />
        <RouteRow
          icon="clock"
          label="Udział czasu podjazdu"
          value={`${(result.deadTimeRatio * 100).toFixed(0)}%`}
          valueColor={result.deadTimeRatio > 0.5 ? Colors.light.danger : Colors.light.textSecondary}
        />
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

function RouteRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.simpleRow}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={14} color={Colors.light.textSecondary} />
      <Text style={styles.simpleLabel}>{label}</Text>
      <Text style={[styles.simpleValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
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
  verdictText: { flex: 1, gap: 2 },
  verdictRight: { alignItems: "flex-end", gap: 4 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  verdictTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  verdictSub: { color: Colors.light.textSecondary, fontSize: 10, fontFamily: "Inter_400Regular" },
  priceMain: { fontSize: 20, fontFamily: "Inter_700Bold" },
  paymentBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  paymentText: { color: Colors.light.textMuted, fontSize: 10, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  metaText: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" },
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
  cardTitle: {
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
  routeSection: { flexDirection: "row", gap: 10, minHeight: 40 },
  routeDot: { alignItems: "center", paddingTop: 3 },
  routeDotInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.light.textSecondary, borderWidth: 2, borderColor: Colors.light.border,
  },
  routeDotDest: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tintGlow,
  },
  routeLine: {
    width: 1.5, flex: 1, minHeight: 20,
    backgroundColor: Colors.light.border, marginTop: 3,
  },
  routeContent: { flex: 1, paddingBottom: 8, gap: 2 },
  routeRowInner: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  routeTimeLabel: { color: Colors.light.text, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  routeTag: {
    color: Colors.light.textMuted, fontSize: 11, fontFamily: "Inter_400Regular",
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
  },
  routeAddress: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" },
  sep: { height: 1, backgroundColor: Colors.light.border },
  simpleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  simpleLabel: { flex: 1, color: Colors.light.text, fontSize: 13, fontFamily: "Inter_400Regular" },
  simpleValue: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
