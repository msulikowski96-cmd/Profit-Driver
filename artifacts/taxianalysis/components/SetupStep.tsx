import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

interface Props {
  number: number;
  icon: string;
  title: string;
  description: string;
  done?: boolean;
}

export function SetupStep({ number, icon, title, description, done }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={[styles.badge, done && styles.badgeDone]}>
          {done ? (
            <Feather name="check" size={12} color={Colors.light.tint} />
          ) : (
            <Text style={styles.badgeText}>{number}</Text>
          )}
        </View>
        {number < 5 && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Feather
            name={icon as keyof typeof Feather.glyphMap}
            size={14}
            color={done ? Colors.light.tint : Colors.light.textSecondary}
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
  },
  leftCol: {
    alignItems: "center",
    width: 26,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: Colors.light.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDone: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintGlow,
  },
  badgeText: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
    minHeight: 14,
  },
  content: {
    flex: 1,
    paddingBottom: 16,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
