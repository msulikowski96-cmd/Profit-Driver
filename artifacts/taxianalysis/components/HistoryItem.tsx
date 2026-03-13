import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "@/constants/colors";
import { RideAnalysis } from "@/context/RideHistoryContext";
import { PlatformBadge } from "./PlatformBadge";

interface Props {
  item: RideAnalysis;
  onPress?: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return "Przed chwilą";
  if (diff < 3600000)
    return `${Math.round(diff / 60000)} min temu`;
  if (diff < 86400000)
    return `${Math.round(diff / 3600000)} godz. temu`;
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryItem({ item, onPress }: Props) {
  const isGood = item.isProfitable;
  const accent = isGood ? Colors.light.tint : Colors.light.danger;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.indicator, { backgroundColor: accent }]} />

      <View style={styles.left}>
        <View style={styles.topRow}>
          <PlatformBadge platform={item.platform} size="sm" />
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
        <Text style={styles.price}>{item.price.toFixed(2)} zł</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>
            {item.pricePerKm.toFixed(2)} zł/km
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.stat}>
            {Math.round(item.pricePerHour)} zł/h
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.stat}>
            {item.totalDistance.toFixed(1)} km
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isGood ? Colors.light.tintGlow : Colors.light.dangerGlow },
          ]}
        >
          <Feather
            name={isGood ? "check-circle" : "x-circle"}
            size={13}
            color={accent}
          />
          <Text style={[styles.badgeText, { color: accent }]}>
            {item.profitabilityScore}
          </Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  indicator: {
    width: 4,
    alignSelf: "stretch",
  },
  left: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  time: {
    color: Colors.light.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  price: {
    color: Colors.light.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stat: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    color: Colors.light.textMuted,
    fontSize: 12,
  },
  right: {
    paddingRight: 14,
    alignItems: "flex-end",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  profit: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
