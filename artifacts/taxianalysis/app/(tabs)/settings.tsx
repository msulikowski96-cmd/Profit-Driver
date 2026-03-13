import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { OverlayElements, Settings, useSettings } from "@/context/SettingsContext";
import { useRideHistory } from "@/context/RideHistoryContext";
import { useOverlay } from "@/modules/useOverlay";

const IS_ANDROID = Platform.OS === "android";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, updateOverlayElements, resetSettings } = useSettings();
  const { clearHistory } = useRideHistory();

  // Permissions state
  const [overlayPerm, setOverlayPerm] = useState<boolean | null>(null);
  const [accessibilityPerm, setAccessibilityPerm] = useState<boolean | null>(null);
  const [serviceRunning, setServiceRunning] = useState(false);

  const {
    isNativeAvailable,
    checkOverlayPermission,
    checkAccessibilityPermission,
    openOverlayPermission,
    openAccessibility,
    startService,
    stopService,
    showOverlay,
    saveNativeSettings,
  } = useOverlay();

  const checkPerms = useCallback(async () => {
    if (!isNativeAvailable) return;
    const [o, a] = await Promise.all([
      checkOverlayPermission(),
      checkAccessibilityPermission(),
    ]);
    setOverlayPerm(o);
    setAccessibilityPerm(a);
  }, [isNativeAvailable, checkOverlayPermission, checkAccessibilityPermission]);

  useEffect(() => {
    checkPerms();
    const interval = setInterval(checkPerms, 3000);
    return () => clearInterval(interval);
  }, [checkPerms]);

  const haptic = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const handleNum = async (key: keyof Settings, value: string) => {
    const parsed = parseFloat(value.replace(",", "."));
    if (!isNaN(parsed)) {
      await updateSettings({ [key]: parsed });
      haptic();
    }
  };

  const handleBool = async (key: keyof Settings, value: boolean) => {
    await updateSettings({ [key]: value });
    haptic();
  };

  const handleOverlayElem = async (key: keyof OverlayElements, value: boolean) => {
    await updateOverlayElements({ [key]: value });
    haptic();
  };

  const handleStartService = () => {
    if (!overlayPerm) { openOverlayPermission(); return; }
    startService();
    showOverlay();
    setServiceRunning(true);
    haptic();
  };

  const handleStopService = () => {
    stopService();
    setServiceRunning(false);
    haptic();
  };

  const saveOverlaySettings = () => {
    saveNativeSettings({
      minPricePerKm: settings.minPricePerKm,
      minPricePerHour: settings.minPricePerHour,
      minRating: settings.minRating,
      maxDeadKmRatio: settings.maxDeadKmRatio,
      fuelCostPerKm: settings.fuelCostPerKm,
      showPrice: settings.overlayElements.showPrice,
      showKm1: settings.overlayElements.showKm1,
      showKm2: settings.overlayElements.showKm2,
      showTotalKm: settings.overlayElements.showTotalKm,
      showPricePerKm: settings.overlayElements.showPricePerKm,
      showPricePerHour: settings.overlayElements.showPricePerHour,
      showRating: settings.overlayElements.showRating,
      showProfit: settings.overlayElements.showProfit,
    });
    haptic();
    if (Platform.OS !== "web") {
      Alert.alert("Zapisano", "Ustawienia belki zostały zapisane.");
    }
  };

  const confirmReset = () => {
    if (Platform.OS === "web") { resetSettings(); return; }
    Alert.alert("Resetuj", "Przywrócić domyślne?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Resetuj", style: "destructive", onPress: () => resetSettings() },
    ]);
  };

  const confirmClear = () => {
    if (Platform.OS === "web") { clearHistory(); return; }
    Alert.alert("Usuń historię", "Czy na pewno?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => clearHistory() },
    ]);
  };

  const permStatus = (val: boolean | null, granted: string = "NADANA", denied: string = "NIEUDZIELONA") =>
    val === null ? "SPRAWDZAM..." : val ? granted : denied;

  const permColor = (val: boolean | null) =>
    val === null ? Colors.light.textMuted : val ? Colors.light.tint : Colors.light.danger;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.pageTitle}>Ustawienia</Text>

        {/* ── UPRAWNIENIA ── */}
        <Card title="Uprawnienia">
          <PermRow
            label="Nakładka"
            statusText={permStatus(overlayPerm)}
            statusColor={permColor(overlayPerm)}
            btnLabel="Nadaj"
            btnIcon="external-link"
            onPress={openOverlayPermission}
            granted={overlayPerm === true}
          />
          <CardDivider />
          <PermRow
            label="Dostępność"
            statusText={permStatus(accessibilityPerm, "WŁĄCZONA", "WYŁĄCZONA")}
            statusColor={permColor(accessibilityPerm)}
            btnLabel="Otwórz"
            btnIcon="accessibility"
            onPress={openAccessibility}
            granted={accessibilityPerm === true}
          />
        </Card>

        {/* ── OBSZAR i OCR ── */}
        <Card title="Obszar i OCR">
          <View style={styles.areaButtons}>
            <TouchableOpacity style={styles.areaBtn} onPress={() => {
              haptic();
              Alert.alert("Zaznacz obszar", "Przejdź do zakładki 'Obszar' aby zaznaczyć fragment ekranu do skanowania.");
            }}>
              <Feather name="crop" size={14} color={Colors.light.text} />
              <Text style={styles.areaBtnText}>Zaznacz obszar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.areaBtnOutline} onPress={() => {
              haptic();
              updateSettings({ scanArea: null });
            }}>
              <Feather name="x" size={14} color={Colors.light.danger} />
              <Text style={[styles.areaBtnText, { color: Colors.light.danger }]}>Wyczyść obszar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Interwał skanowania (ms)</Text>
            <Slider
              style={styles.slider}
              minimumValue={500}
              maximumValue={5000}
              step={100}
              value={settings.scanInterval ?? 1500}
              onSlidingComplete={(v: number) => { handleNum("scanInterval", v.toString()); }}
              minimumTrackTintColor={Colors.light.tint}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.tint}
            />
            <Text style={styles.sliderValue}>{settings.scanInterval ?? 1500} ms</Text>
          </View>

          <CardDivider />
          <View style={styles.row}>
            <Switch
              value={settings.showOutline}
              onValueChange={(v) => handleBool("showOutline", v)}
              trackColor={{ false: Colors.light.borderLight, true: Colors.light.tintGlow }}
              thumbColor={Colors.light.tint}
            />
            <Text style={styles.switchLabelText}>Pokaż obrys</Text>
          </View>
          <CardDivider />
          <View style={styles.statusRow}>
            <Text style={styles.rowLabelGray}>Obszar:</Text>
            <Text style={[styles.statusBadge, {
              color: settings.scanArea ? Colors.light.tint : Colors.light.danger,
            }]}>
              {settings.scanArea ? "USTAWIONY" : "NIEUSTAWIONY"}
            </Text>
          </View>
        </Card>

        {/* ── PROGI i KOLORY ── */}
        <Card title="Progi i kolory">
          <View style={styles.row}>
            <Switch
              value={settings.colorByThreshold}
              onValueChange={(v) => handleBool("colorByThreshold", v)}
              trackColor={{ false: Colors.light.borderLight, true: Colors.light.tintGlow }}
              thumbColor={Colors.light.tint}
            />
            <Text style={styles.switchLabelText}>Kolor wg progów</Text>
          </View>
          <CardDivider />
          <ThresholdRow
            icon="tool"
            label="Min. zł/km (np. 1,50)"
            value={settings.minPricePerKm.toString()}
            onSave={(v) => handleNum("minPricePerKm", v)}
          />
          <CardDivider />
          <ThresholdRow
            icon="clock"
            label="Min. zł/h (np. 40)"
            value={settings.minPricePerHour.toString()}
            onSave={(v) => handleNum("minPricePerHour", v)}
          />
          <CardDivider />
          <ThresholdRow
            icon="star"
            label="Min. ocena (np. 4,90)"
            value={settings.minRating.toString()}
            onSave={(v) => handleNum("minRating", v)}
          />
          <CardDivider />
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Rozmiar tekstu</Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={20}
              step={1}
              value={settings.overlayFontSize}
              onSlidingComplete={(v: number) => handleNum("overlayFontSize", v.toString())}
              minimumTrackTintColor={Colors.light.tint}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.tint}
            />
          </View>
        </Card>

        {/* ── CO POKAZYWAĆ NA BELCE ── */}
        <Card title="Co pokazywać na belce">
          <View style={styles.chipGrid}>
            <OverlayChip
              label="Pokaż cenę"
              active={settings.overlayElements.showPrice}
              onToggle={(v) => handleOverlayElem("showPrice", v)}
            />
            <OverlayChip
              label="Pokaż k1+k2"
              active={settings.overlayElements.showKm1 && settings.overlayElements.showKm2}
              onToggle={(v) => { handleOverlayElem("showKm1", v); handleOverlayElem("showKm2", v); }}
            />
            <OverlayChip
              label="Pokaż sumę km"
              active={settings.overlayElements.showTotalKm}
              onToggle={(v) => handleOverlayElem("showTotalKm", v)}
            />
            <OverlayChip
              label="Pokaż zł/km"
              active={settings.overlayElements.showPricePerKm}
              onToggle={(v) => handleOverlayElem("showPricePerKm", v)}
            />
            <OverlayChip
              label="Pokaż zł/h"
              active={settings.overlayElements.showPricePerHour}
              onToggle={(v) => handleOverlayElem("showPricePerHour", v)}
            />
            <OverlayChip
              label="Pokaż ocenę"
              active={settings.overlayElements.showRating}
              onToggle={(v) => handleOverlayElem("showRating", v)}
            />
          </View>

          <TouchableOpacity style={styles.saveBarBtn} onPress={saveOverlaySettings}>
            <Feather name="save" size={14} color={Colors.light.text} />
            <Text style={styles.saveBarBtnText}>Zapisz ustawienia belki</Text>
          </TouchableOpacity>
        </Card>

        {/* ── NAKŁADKA ── */}
        <Card title="Nakładka">
          {serviceRunning ? (
            <TouchableOpacity style={styles.stopServiceBtn} onPress={handleStopService}>
              <Text style={styles.stopServiceBtnText}>Zatrzymaj nakładkę</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.startServiceBtn} onPress={handleStartService}>
              <Text style={styles.startServiceBtnText}>Uruchom nakładkę</Text>
            </TouchableOpacity>
          )}
          <View style={styles.serviceStatusRow}>
            <Text style={styles.rowLabelGray}>Serwis:</Text>
            <Text style={[styles.statusBadge, {
              color: serviceRunning ? Colors.light.tint : Colors.light.danger,
              marginLeft: 8,
            }]}>
              {serviceRunning ? "DZIAŁA" : "NIE DZIAŁA"}
            </Text>
          </View>
          {!isNativeAvailable && (
            <Text style={styles.nativeNote}>
              Nakładka działa tylko w APK (pełna kompilacja). W Expo Go niedostępna.
            </Text>
          )}
        </Card>

        {/* ── STREFA NIEBEZPIECZNA ── */}
        <View style={styles.dangerCard}>
          <TouchableOpacity style={styles.dangerBtn} onPress={confirmReset}>
            <Feather name="refresh-ccw" size={16} color={Colors.light.warning} />
            <Text style={[styles.dangerBtnText, { color: Colors.light.warning }]}>Przywróć domyślne</Text>
          </TouchableOpacity>
          <View style={styles.dangerSep} />
          <TouchableOpacity style={styles.dangerBtn} onPress={confirmClear}>
            <Feather name="trash-2" size={16} color={Colors.light.danger} />
            <Text style={[styles.dangerBtnText, { color: Colors.light.danger }]}>Usuń całą historię kursów</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>TaxiAnalysis v1.2.0</Text>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.cardWrap}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function CardDivider() {
  return <View style={styles.divider} />;
}

function PermRow({
  label, statusText, statusColor, btnLabel, btnIcon, onPress, granted,
}: {
  label: string; statusText: string; statusColor: string;
  btnLabel: string; btnIcon: string; onPress: () => void; granted: boolean;
}) {
  return (
    <View style={styles.permRow}>
      <Text style={styles.permLabel}>{label}:</Text>
      <Text style={[styles.permStatus, { color: statusColor }]}>{statusText}</Text>
      {!granted && (
        <TouchableOpacity style={styles.permBtn} onPress={onPress}>
          <Feather name={btnIcon as keyof typeof Feather.glyphMap} size={13} color={Colors.light.text} />
          <Text style={styles.permBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ThresholdRow({
  icon, label, value, onSave,
}: {
  icon: string; label: string; value: string; onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const save = () => { setEditing(false); onSave(draft); };

  return (
    <View style={styles.threshRow}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={18} color={Colors.light.textSecondary} style={{ width: 28 }} />
      <View style={styles.threshContent}>
        <Text style={styles.threshLabel}>{label}</Text>
        {editing ? (
          <View style={styles.threshEditRow}>
            <TextInput
              style={styles.threshInput}
              value={draft}
              onChangeText={setDraft}
              keyboardType="decimal-pad"
              autoFocus
              onBlur={save}
              onSubmitEditing={save}
            />
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setDraft(value); setEditing(true); }}>
            <Text style={styles.threshValue}>{value}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.threshUnderline} />
      </View>
    </View>
  );
}

function OverlayChip({
  label, active, onToggle,
}: {
  label: string; active: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={() => onToggle(!active)}
    >
      {active && <Feather name="check" size={12} color={Colors.light.tint} style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { paddingHorizontal: 18, paddingBottom: 110 },
  pageTitle: {
    fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 20,
  },

  // Card
  cardWrap: { marginBottom: 4 },
  cardTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text,
    marginTop: 20, marginBottom: 8, marginLeft: 2,
  },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border,
    overflow: "hidden", paddingVertical: 4,
  },
  divider: { height: 1, backgroundColor: Colors.light.border, marginHorizontal: 14 },

  // Permissions
  permRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 8,
  },
  permLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text, width: 90 },
  permStatus: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  permBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  permBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },

  // Rows
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  switchLabelText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.text },
  rowLabelGray: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  statusRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  statusBadge: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Area buttons
  areaButtons: {
    flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  areaBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  areaBtnOutline: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: `${Colors.light.danger}50`, borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  areaBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },

  // Slider
  sliderRow: { paddingHorizontal: 14, paddingVertical: 10 },
  sliderLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.text, marginBottom: 4 },
  slider: { width: "100%", height: 36 },
  sliderValue: { fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", textAlign: "right" },

  // Thresholds
  threshRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  threshContent: { flex: 1 },
  threshLabel: { fontSize: 12, color: Colors.light.textMuted, fontFamily: "Inter_400Regular", marginBottom: 2 },
  threshValue: { fontSize: 18, fontFamily: "Inter_400Regular", color: Colors.light.text, minHeight: 26 },
  threshEditRow: { flexDirection: "row", alignItems: "center" },
  threshInput: {
    fontSize: 18, fontFamily: "Inter_400Regular", color: Colors.light.text,
    minWidth: 80, borderBottomWidth: 1, borderBottomColor: Colors.light.tint,
    paddingVertical: 2,
  },
  threshUnderline: { height: 1, backgroundColor: Colors.light.border, marginTop: 6 },

  // Chips
  chipGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 14,
  },
  chip: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: {
    borderColor: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}15`,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },
  chipTextActive: { color: Colors.light.tint },

  // Save bar button
  saveBarBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 14, marginBottom: 14, alignSelf: "flex-start",
  },
  saveBarBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text },

  // Service
  startServiceBtn: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
    marginHorizontal: 14, marginTop: 10, marginBottom: 6, alignSelf: "flex-start",
  },
  startServiceBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.text },
  stopServiceBtn: {
    borderWidth: 1, borderColor: `${Colors.light.danger}60`, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
    marginHorizontal: 14, marginTop: 10, marginBottom: 6, alignSelf: "flex-start",
    backgroundColor: `${Colors.light.danger}15`,
  },
  stopServiceBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.danger },
  serviceStatusRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12,
  },
  nativeNote: {
    fontSize: 11, color: Colors.light.textMuted, fontFamily: "Inter_400Regular",
    paddingHorizontal: 14, paddingBottom: 12, lineHeight: 16,
  },

  // Danger zone
  dangerCard: {
    marginTop: 24,
    backgroundColor: Colors.light.backgroundCard, borderRadius: 16,
    borderWidth: 1, borderColor: `${Colors.light.danger}30`, overflow: "hidden",
  },
  dangerSep: { height: 1, backgroundColor: `${Colors.light.danger}20` },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 15 },
  dangerBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  version: {
    textAlign: "center", color: Colors.light.textMuted,
    fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 24, marginBottom: 8,
  },
});
