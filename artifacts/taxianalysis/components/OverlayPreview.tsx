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
import { OverlayElements } from "@/context/SettingsContext";

interface Props {
  analysis: RideAnalysis;
  overlayElements: OverlayElements;
  avgPrice: number | null;
  onDismiss?: () => void;
}

export function OverlayPreview({ analysis, overlayElements, avgPrice, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-140)).current;
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
        toValue: -140,
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
  const accent = isGood ? Colors.light.tint : Colors.light.danger;
  const bgGlow = isGood ? Colors.light.tintGlow : Colors.light.dangerGlow;

  // Build overlay stat cells from enabled elements
  const cells: { label: string; value: string }[] = [];

  if (overlayElements.showPrice)
    cells.push({ label: "Cena", value: `${analysis.price.toFixed(2)} zł` });
  if (overlayElements.showKm1)
    cells.push({ label: "Km do pas.", value: `${analysis.pickupDistance.toFixed(1)} km` });
  if (overlayElements.showKm2)
    cells.push({ label: "Km kursu", value: `${analysis.tripDistance.toFixed(1)} km` });
  if (overlayElements.showTotalKm)
    cells.push({ label: "Suma km", value: `${analysis.totalDistance.toFixed(1)} km` });
  if (overlayElements.showPricePerKm)
    cells.push({ label: "zł/km", value: analysis.pricePerKm.toFixed(2) });
  if (overlayElements.showPricePerHour)
    cells.push({ label: "zł/h", value: Math.round(analysis.pricePerHour).toString() });
  if (overlayElements.showRating && analysis.rating != null)
    cells.push({ label: "Ocena", value: analysis.rating.toFixed(2) });
  if (overlayElements.showProfit)
    cells.push({ label: "Zysk", value: `${analysis.estimatedProfit.toFixed(1)} zł` });
  if (overlayElements.showDeadKmRatio)
    cells.push({ label: "Martwe %", value: `${(analysis.deadKmRatio * 100).toFixed(0)}%` });

  // Show max 6 cells in overlay bar (space constraint)
  const visibleCells = cells.slice(0, 6);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: Colors.light.backgroundCard,
          borderColor: accent,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: accent }]}>
        <View style={styles.statusLeft}>
          <Feather
            name={isGood ? "check-circle" : "x-circle"}
            size={13}
            color="#000"
          />
          <Text style={styles.statusText}>
            {isGood ? "OPŁACALNY" : "NIEOPŁACALNY"}
          </Text>
          {avgPrice != null && (
            <Text style={styles.avgBadge}>
              śr. {avgPrice.toFixed(2)} zł
            </Text>
          )}
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.scoreText}>{analysis.profitabilityScore}/100</Text>
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn} testID="overlay-close">
            <Feather name="x" size={13} color="rgba(0,0,0,0.7)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row */}
      {visibleCells.length > 0 && (
        <View style={styles.statsRow}>
          {visibleCells.map((cell, i) => (
            <React.Fragment key={cell.label}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.cell}>
                <Text style={styles.cellLabel}>{cell.label}</Text>
                <Text style={[styles.cellValue, { color: accent }]}>
                  {cell.value}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Failed reasons */}
      {!isGood && analysis.failedReasons.length > 0 && (
        <View style={[styles.reasonsRow, { backgroundColor: Colors.light.dangerGlow }]}>
          <Feather name="alert-circle" size={11} color={Colors.light.danger} />
          <Text style={styles.reasonText} numberOfLines={1}>
            {analysis.failedReasons[0]}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    marginHorizontal: 0,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  avgBadge: {
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
  },
  scoreText: {
    color: "rgba(0,0,0,0.7)",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    padding: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  cellLabel: {
    color: Colors.light.textMuted,
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  cellValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  divider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 2,
  },
  reasonsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
  },
  reasonText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.light.danger,
    flex: 1,
  },
});
