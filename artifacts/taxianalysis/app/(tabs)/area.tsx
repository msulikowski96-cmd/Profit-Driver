import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useSettings } from "@/context/SettingsContext";

const SCREEN_W = Dimensions.get("window").width;
const SCREEN_H = Dimensions.get("window").height;
const PREVIEW_W = SCREEN_W - 40;
const PREVIEW_H = 260;

interface Rect { x: number; y: number; w: number; h: number }

export default function AreaScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const isWeb = Platform.OS === "web";

  const hasSavedArea = settings.scanArea != null;

  // Normalized rect in preview coordinates
  const [rect, setRect] = useState<Rect>(
    settings.scanArea
      ? {
          x: (settings.scanArea.x / SCREEN_W) * PREVIEW_W,
          y: (settings.scanArea.y / SCREEN_H) * PREVIEW_H,
          w: (settings.scanArea.width / SCREEN_W) * PREVIEW_W,
          h: (settings.scanArea.height / SCREEN_H) * PREVIEW_H,
        }
      : { x: 20, y: 60, w: PREVIEW_W - 40, h: 120 }
  );
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, rx: 0, ry: 0, rw: 0, rh: 0 });

  // PanResponder for moving the rect
  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        setDragging(true);
        startRef.current = {
          x: gs.x0, y: gs.y0,
          rx: rect.x, ry: rect.y, rw: rect.w, rh: rect.h,
        };
      },
      onPanResponderMove: (_, gs) => {
        const dx = gs.moveX - startRef.current.x;
        const dy = gs.moveY - startRef.current.y;
        setRect((r) => ({
          ...r,
          x: Math.max(0, Math.min(PREVIEW_W - r.w, startRef.current.rx + dx)),
          y: Math.max(0, Math.min(PREVIEW_H - r.h, startRef.current.ry + dy)),
        }));
      },
      onPanResponderRelease: () => setDragging(false),
    })
  ).current;

  // PanResponder for resizing (bottom-right handle)
  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        setResizing(true);
        startRef.current = {
          x: gs.x0, y: gs.y0,
          rx: rect.x, ry: rect.y, rw: rect.w, rh: rect.h,
        };
      },
      onPanResponderMove: (_, gs) => {
        const dx = gs.moveX - startRef.current.x;
        const dy = gs.moveY - startRef.current.y;
        setRect((r) => ({
          ...r,
          w: Math.max(60, Math.min(PREVIEW_W - r.x, startRef.current.rw + dx)),
          h: Math.max(40, Math.min(PREVIEW_H - r.y, startRef.current.rh + dy)),
        }));
      },
      onPanResponderRelease: () => setResizing(false),
    })
  ).current;

  const saveArea = async () => {
    const realX = (rect.x / PREVIEW_W) * SCREEN_W;
    const realY = (rect.y / PREVIEW_H) * SCREEN_H;
    const realW = (rect.w / PREVIEW_W) * SCREEN_W;
    const realH = (rect.h / PREVIEW_H) * SCREEN_H;
    await updateSettings({
      scanArea: { x: realX, y: realY, width: realW, height: realH },
    });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const clearArea = async () => {
    await updateSettings({ scanArea: null });
    setRect({ x: 20, y: 60, w: PREVIEW_W - 40, h: 120 });
  };

  const intervalOptions = [200, 300, 400, 500, 750, 1000];

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top + 16 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isWeb && { paddingBottom: 34 + 84 }]}>
        <Text style={styles.pageTitle}>Obszar skanowania</Text>
        <Text style={styles.subtitle}>
          Zaznacz obszar ekranu, w którym pojawia się karta oferty kursu w aplikacji kierowcy.
        </Text>

        {/* Screen preview with draggable rect */}
        <View style={styles.previewWrapper}>
          <Text style={styles.previewLabel}>Podgląd ekranu (symulacja)</Text>
          <View style={styles.previewScreen}>
            {/* Mock app UI */}
            <View style={styles.mockHeader} />
            <View style={styles.mockMap} />
            <View style={styles.mockCard}>
              <Text style={styles.mockCardText}>21,59 zł · ★4,79</Text>
              <Text style={styles.mockCardSub}>21 min (16.9 km) od miejsca odbioru</Text>
              <Text style={styles.mockCardSub}>8 min (4.8 km) przejazd</Text>
            </View>

            {/* Selection rectangle */}
            <View
              style={[
                styles.selectionRect,
                {
                  left: rect.x, top: rect.y, width: rect.w, height: rect.h,
                  borderColor: settings.showOutline ? Colors.light.tint : "transparent",
                  backgroundColor: `${Colors.light.tint}18`,
                },
                (dragging || resizing) && { opacity: 0.9 },
              ]}
              {...movePanResponder.panHandlers}
            >
              <Text style={styles.selectionLabel}>Obszar skanowania</Text>
              {/* Resize handle */}
              <View
                style={styles.resizeHandle}
                {...resizePanResponder.panHandlers}
              >
                <Feather name="maximize-2" size={12} color={Colors.light.tint} />
              </View>
              {/* Corner dots */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
            </View>
          </View>
          <Text style={styles.hint}>
            Przeciągnij prostokąt aby go przesunąć · Uchwyt w rogu aby zmienić rozmiar
          </Text>
        </View>

        {/* Show outline toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Pokaż obrys obszaru</Text>
              <Text style={styles.toggleDesc}>Wyświetla ramkę na ekranie podczas skanowania</Text>
            </View>
            <Switch
              value={settings.showOutline}
              onValueChange={(v) => updateSettings({ showOutline: v })}
              trackColor={{ false: Colors.light.borderLight, true: Colors.light.tintGlow }}
              thumbColor={settings.showOutline ? Colors.light.tint : Colors.light.textMuted}
              ios_backgroundColor={Colors.light.borderLight}
            />
          </View>
        </View>

        {/* Scan interval */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Interwał skanowania</Text>
          <View style={styles.intervalRow}>
            {intervalOptions.map((ms) => (
              <TouchableOpacity
                key={ms}
                style={[
                  styles.intervalBtn,
                  settings.scanInterval === ms && styles.intervalBtnActive,
                ]}
                onPress={() => updateSettings({ scanInterval: ms })}
              >
                <Text
                  style={[
                    styles.intervalText,
                    settings.scanInterval === ms && styles.intervalTextActive,
                  ]}
                >
                  {ms}ms
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.intervalHint}>
            Zalecane: 300–500 ms. Krótszy interwał = szybsza reakcja, ale wyższe zużycie baterii.
          </Text>
        </View>

        {/* Current area info */}
        {settings.scanArea && (
          <View style={[styles.card, styles.savedCard]}>
            <Feather name="check-circle" size={16} color={Colors.light.tint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.savedTitle}>Obszar zapisany</Text>
              <Text style={styles.savedSub}>
                x: {Math.round(settings.scanArea.x)}, y: {Math.round(settings.scanArea.y)} ·{" "}
                {Math.round(settings.scanArea.width)}×{Math.round(settings.scanArea.height)} px
              </Text>
            </View>
            <TouchableOpacity onPress={clearArea}>
              <Feather name="trash-2" size={16} color={Colors.light.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveArea}>
          <Feather name="save" size={18} color="#000" />
          <Text style={styles.saveBtnText}>Zapisz obszar skanowania</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Na fizycznym urządzeniu Android aplikacja użyje zapisanego obszaru do odczytu danych z ekranu przez Accessibility Service lub OCR.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.light.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 20 },
  previewWrapper: { marginBottom: 16 },
  previewLabel: { fontSize: 11, color: Colors.light.textMuted, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  previewScreen: {
    width: PREVIEW_W, height: PREVIEW_H,
    backgroundColor: "#0D0D14",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1.5, borderColor: Colors.light.border,
    position: "relative",
  },
  mockHeader: { height: 32, backgroundColor: Colors.light.backgroundSecondary, margin: 8, borderRadius: 8 },
  mockMap: { flex: 1, backgroundColor: "#1A2030", margin: 8, marginTop: 0, borderRadius: 8 },
  mockCard: {
    position: "absolute", bottom: 8, left: 8, right: 8,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 12, padding: 10, gap: 3,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  mockCardText: { color: Colors.light.text, fontSize: 13, fontFamily: "Inter_700Bold" },
  mockCardSub: { color: Colors.light.textSecondary, fontSize: 10, fontFamily: "Inter_400Regular" },
  selectionRect: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
  },
  selectionLabel: {
    position: "absolute", top: 4, left: 6,
    color: Colors.light.tint, fontSize: 9, fontFamily: "Inter_600SemiBold",
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
  },
  resizeHandle: {
    position: "absolute", right: -2, bottom: -2,
    width: 24, height: 24, backgroundColor: Colors.light.backgroundCard,
    borderRadius: 6, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.light.tint,
  },
  corner: {
    position: "absolute", width: 8, height: 8,
    backgroundColor: Colors.light.tint, borderRadius: 2,
  },
  cornerTL: { top: -4, left: -4 },
  cornerTR: { top: -4, right: -4 },
  cornerBL: { bottom: -4, left: -4 },
  hint: { fontSize: 11, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  card: {
    backgroundColor: Colors.light.backgroundCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.light.border, padding: 14, marginBottom: 12,
  },
  cardTitle: { color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { color: Colors.light.text, fontSize: 15, fontFamily: "Inter_500Medium" },
  toggleDesc: { color: Colors.light.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  intervalRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  intervalBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  intervalBtnActive: { borderColor: Colors.light.tint, backgroundColor: Colors.light.tintGlow },
  intervalText: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" },
  intervalTextActive: { color: Colors.light.tint },
  intervalHint: { color: Colors.light.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 16 },
  savedCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderColor: `${Colors.light.tint}40`,
    backgroundColor: Colors.light.tintGlow,
  },
  savedTitle: { color: Colors.light.tint, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  savedSub: { color: Colors.light.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" },
  saveBtn: {
    backgroundColor: Colors.light.tint, paddingVertical: 15, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
  },
  saveBtnText: { color: "#000", fontSize: 16, fontFamily: "Inter_700Bold" },
  note: { color: Colors.light.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17 },
});
