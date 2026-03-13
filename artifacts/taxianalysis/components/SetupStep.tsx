import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  number: number;
  title: string;
  description: string;
  icon: string;
  done?: boolean;
}

export function SetupStep({ number, title, description, icon, done }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, done && styles.iconBoxDone]}>
        {done ? (
          <Feather name="check" size={18} color={Colors.light.tint} />
        ) : (
          <Feather
            name={icon as keyof typeof Feather.glyphMap}
            size={18}
            color={Colors.light.textSecondary}
          />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.step}>Krok {number}</Text>
          {done ? (
            <Text style={styles.doneBadge}>Gotowe</Text>
          ) : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxDone: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintGlow,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  step: {
    color: Colors.light.textMuted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  doneBadge: {
    backgroundColor: Colors.light.tintGlow,
    color: Colors.light.tint,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  title: {
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
