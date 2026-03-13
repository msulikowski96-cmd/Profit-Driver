import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "@/constants/colors";
import { RideAnalysis } from "@/context/RideHistoryContext";
import { PlatformBadge } from "./PlatformBadge";

const PAYMENT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  cash: "dollar-sign",
  card: "credit-card",
  online: "smartphone",
};

interface Props {
  item: RideAnalysis;
  onPress?: () => void;
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Przed chwilą";
  if (diff < 3600000) return `${Math.round(diff / 60000)} min temu`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} godz. temu`;
  return new Date(ts).toLocaleDateString("pl-PL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function HistoryItem({ item, onPress }: Props) {
  const isGood = item.isProfitable;
  const accent = isGood ? Colors.light.tint : Colors.light.danger;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.indicator, { backgroundColor: accent }]} />
      <View style={styles.left}>
        {/* Top row: platform + service + payment + time */}
        <View style={styles.topRow}>
          <PlatformBadge platform={item.platform} size="sm" />
          <Text style={styles.serviceLabel}>{item.serviceType}</Text>
          <Feather
            name={PAYMENT_ICONS[item.paymentType] ?? "dollar-sign"}
            size={11}
            color={Colors.light.textMuted}
          />
          {item.rating != null && (
            <View style={styles.ratingChip}>
              <Feather name="star" size={10} color={Colors.light.warning} />
              <Text style={styles.ratingText}>{item.rating.toFixed(2)}</Text>
            </View>
          )}
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>

        {/* Price */}
        <Text style={styles.price}>{item.price.toFixed(2)} zł</Text>

        {/* Route: pickup + trip */}
        <View style={styles.routeRow}>
          <Text style={styles.routeSeg}>
            {item.pickupTime} min ({item.pickupDistance.toFixed(1)} km)
          </Text>
          <Feather name="arrow-right" size={10} color={Colors.light.textMuted} />
          <Text style={styles.routeSeg}>
            {item.tripTime} min ({item.tripDistance.toFixed(1)} km)
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.stat}>{item.pricePerKm.toFixed(2)} zł/km</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.stat}>{Math.round(item.pricePerHour)} zł/h</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.stat}>{(item.deadKmRatio * 100).toFixed(0)}% martwe km</Text>
        </View>

        {/* Fail reason */}
        {!isGood && item.failedReasons.length > 0 && (
          <Text style={styles.failReason} numberOfLines={1}>
            ✗ {item.failedReasons[0]}
          </Text>
        )}
      </View>

      {/* Right: score + profit */}
      <View style={styles.right}>
        <View style={[styles.scoreBadge, { backgroundColor: isGood ? Colors.light.tintGlow : Colors.light.dangerGlow }]}>
          <Text style={[styles.scoreText, { color: accent }]}>{item.profitabilityScore}</Text>
        </View>
        <Text style={[styles.profit, { color: accent }]}>
          +{item.estimatedProfit.toFixed(1)} zł
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.light.border,
    overflow: "hidden", marginBottom: 8,
  },
  indicator: { width: 4, alignSelf: "stretch" },
  left: { flex: 1, padding: 11, gap: 4 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  serviceLabel: {
    color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_500Medium",
  },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.light.warningGlow,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  ratingText: { color: Colors.light.warning, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  time: { color: Colors.light.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  price: { color: Colors.light.text, fontSize: 17, fontFamily: "Inter_700Bold" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  routeSeg: { color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  stat: { color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" },
  dot: { color: Colors.light.textMuted, fontSize: 11 },
  failReason: { color: Colors.light.danger, fontSize: 11, fontFamily: "Inter_400Regular" },
  right: { paddingRight: 12, alignItems: "flex-end", gap: 5 },
  scoreBadge: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  profit: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
