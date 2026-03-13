import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { RideAnalysis } from "@/context/RideHistoryContext";

interface Props {
  analysis: RideAnalysis;
  onDismiss?: () => void;
}

export function OverlayPreview({ analysis, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss?.());
  };

  const isGood = analysis.isProfitable;
  const bgColor = isGood ? Colors.light.tint : Colors.light.danger;
  const bgGlow = isGood ? Colors.light.tintGlow : Colors.light.dangerGlow;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: Colors.light.backgroundCard,
          borderColor: bgColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.statusBar, { backgroundColor: bgColor }]}>
        <Feather
          name={isGood ? "check-circle" : "x-circle"}
          size={14}
          color="#fff"
        />
        <Text style={styles.statusText}>
          {isGood ? "OPŁACALNY KURS" : "NIEOPŁACALNY"}
        </Text>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} testID="overlay-close">
          <Feather name="x" size={14} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatItem
          label="Cena"
          value={`${analysis.price.toFixed(2)} zł`}
          accent={isGood}
        />
        <View style={styles.divider} />
        <StatItem
          label="zł/km"
          value={analysis.pricePerKm.toFixed(2)}
          accent={isGood}
        />
        <View style={styles.divider} />
        <StatItem
          label="zł/h"
          value={Math.round(analysis.pricePerHour).toString()}
          accent={isGood}
        />
        <View style={styles.divider} />
        <StatItem
          label="Zysk"
          value={`${analysis.estimatedProfit.toFixed(1)} zł`}
          accent={isGood}
        />
      </View>

      <View style={[styles.bottomRow, { backgroundColor: bgGlow }]}>
        <Feather name="map-pin" size={11} color={bgColor} />
        <Text style={[styles.distanceText, { color: bgColor }]}>
          Podjazd: {analysis.pickupDistance.toFixed(1)} km · Kurs:{" "}
          {analysis.tripDistance.toFixed(1)} km
        </Text>
      </View>
    </Animated.View>
  );
}

function StatItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          { color: accent ? Colors.light.tint : Colors.light.danger },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    marginHorizontal: 16,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    flex: 1,
  },
  closeBtn: {
    padding: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    color: Colors.light.textMuted,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    width: 1,
    height: "100%",
    backgroundColor: Colors.light.border,
    marginHorizontal: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
