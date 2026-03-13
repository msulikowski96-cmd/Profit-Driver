import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Platform as RidePlatform } from "@/context/RideHistoryContext";
import Colors from "@/constants/colors";

const platformConfig: Record<
  RidePlatform,
  { label: string; bg: string; text: string }
> = {
  uber: { label: "Uber", bg: "#1C1C1C", text: "#FFFFFF" },
  bolt: { label: "Bolt", bg: "#1A3D2B", text: "#34D186" },
  freeNow: { label: "FreeNow", bg: "#3D3200", text: "#FFD500" },
};

interface Props {
  platform: RidePlatform;
  size?: "sm" | "md";
}

export function PlatformBadge({ platform, size = "md" }: Props) {
  const config = platformConfig[platform];
  const isSmall = size === "sm";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: config.text },
          isSmall && styles.labelSm,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  labelSm: {
    fontSize: 11,
  },
});
