import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { RideAnalysis, useRideHistory } from "@/context/RideHistoryContext";
import { HistoryItem } from "@/components/HistoryItem";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, clearHistory } = useRideHistory();
  const isWeb = Platform.OS === "web";

  const profitable = history.filter((r) => r.isProfitable).length;
  const unprofitable = history.length - profitable;
  const avgProfit =
    history.length > 0
      ? history.reduce((s, r) => s + r.estimatedProfit, 0) / history.length
      : 0;

  const handleClear = () => {
    if (Platform.OS === "web") {
      clearHistory();
      return;
    }
    Alert.alert(
      "Wyczyść historię",
      "Czy na pewno chcesz usunąć całą historię kursów?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RideAnalysis }) => (
    <HistoryItem item={item} />
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 67 : insets.top + 16,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historia kursów</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            testID="clear-history"
          >
            <Feather name="trash-2" size={16} color={Colors.light.danger} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Summary stats */}
      {history.length > 0 ? (
        <View style={styles.statsRow}>
          <SummaryChip
            icon="check-circle"
            value={profitable.toString()}
            label="Opłacalnych"
            color={Colors.light.tint}
          />
          <SummaryChip
            icon="x-circle"
            value={unprofitable.toString()}
            label="Nieopłacalnych"
            color={Colors.light.danger}
          />
          <SummaryChip
            icon="dollar-sign"
            value={`${avgProfit.toFixed(1)} zł`}
            label="Śr. zysk"
            color={Colors.light.warning}
          />
        </View>
      ) : null}

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          isWeb && { paddingBottom: 34 + 84 },
          history.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyHistory />}
        contentInsetAdjustmentBehavior="automatic"
      />
    </View>
  );
}

function SummaryChip({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: `${color}14`, borderColor: `${color}30` },
      ]}
    >
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={14}
        color={color}
      />
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

function EmptyHistory() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name="clock" size={36} color={Colors.light.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Brak historii</Text>
      <Text style={styles.emptyText}>
        Przeanalizowane kursy pojawią się tutaj
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.dangerGlow,
    borderWidth: 1,
    borderColor: `${Colors.light.danger}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  chipValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  chipLabel: {
    fontSize: 10,
    color: Colors.light.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
