import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert, Platform, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  OverlayElements, Settings, useSettings,
} from "@/context/SettingsContext";
import { useRideHistory } from "@/context/RideHistoryContext";
import { SetupStep } from "@/components/SetupStep";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, updateOverlayElements, resetSettings } = useSettings();
  const { clearHistory } = useRideHistory();
  const isWeb = Platform.OS === "web";

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

  const handleOverlay = async (key: keyof OverlayElements, value: boolean) => {
    await updateOverlayElements({ [key]: value });
    haptic();
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

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top + 16 }]}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, isWeb && { paddingBottom: 34 + 84 }]}>
        <Text style={styles.pageTitle}>Ustawienia</Text>

        {/* Profitability thresholds */}
        <SectionHeader icon="target" label="Progi opłacalności" />
        <View style={styles.card}>
          <NumericRow label="Min. cena kursu" suffix="zł" value={settings.minPrice.toString()} onSave={(v) => handleNum("minPrice", v)} />
          <Divider />
          <NumericRow label="Min. zarobek / km" suffix="zł/km" value={settings.minPricePerKm.toString()} onSave={(v) => handleNum("minPricePerKm", v)} />
          <Divider />
          <NumericRow label="Min. zarobek / godz." suffix="zł/h" value={settings.minPricePerHour.toString()} onSave={(v) => handleNum("minPricePerHour", v)} />
          <Divider />
          <NumericRow label="Min. ocena pasażera" suffix="★" value={settings.minRating.toString()} onSave={(v) => handleNum("minRating", v)} />
          <Divider />
          <NumericRow label="Max. udział martwych km" suffix="%" value={(settings.maxDeadKmRatio * 100).toString()} onSave={(v) => handleNum("maxDeadKmRatio", (parseFloat(v) / 100).toString())} />
          <Divider />
          <NumericRow label="Koszt paliwa / km" suffix="zł/km" value={settings.fuelCostPerKm.toString()} onSave={(v) => handleNum("fuelCostPerKm", v)} />
        </View>

        {/* Overlay elements */}
        <SectionHeader icon="layout" label="Elementy belki (Overlay)" />
        <View style={styles.card}>
          <OverlayToggle label="Cena kursu" value={settings.overlayElements.showPrice} onToggle={(v) => handleOverlay("showPrice", v)} />
          <Divider />
          <OverlayToggle label="Km do pasażera (km1)" value={settings.overlayElements.showKm1} onToggle={(v) => handleOverlay("showKm1", v)} />
          <Divider />
          <OverlayToggle label="Km kursu (km2)" value={settings.overlayElements.showKm2} onToggle={(v) => handleOverlay("showKm2", v)} />
          <Divider />
          <OverlayToggle label="Suma km (km1+km2)" value={settings.overlayElements.showTotalKm} onToggle={(v) => handleOverlay("showTotalKm", v)} />
          <Divider />
          <OverlayToggle label="Zarobek zł/km" value={settings.overlayElements.showPricePerKm} onToggle={(v) => handleOverlay("showPricePerKm", v)} />
          <Divider />
          <OverlayToggle label="Zarobek zł/h" value={settings.overlayElements.showPricePerHour} onToggle={(v) => handleOverlay("showPricePerHour", v)} />
          <Divider />
          <OverlayToggle label="Ocena pasażera ★" value={settings.overlayElements.showRating} onToggle={(v) => handleOverlay("showRating", v)} />
          <Divider />
          <OverlayToggle label="Szacowany zysk" value={settings.overlayElements.showProfit} onToggle={(v) => handleOverlay("showProfit", v)} />
          <Divider />
          <OverlayToggle label="% martwych km" value={settings.overlayElements.showDeadKmRatio} onToggle={(v) => handleOverlay("showDeadKmRatio", v)} />
        </View>

        {/* Platforms */}
        <SectionHeader icon="layers" label="Platformy" />
        <View style={styles.card}>
          <SwitchRow label="Uber Driver" color="#FFFFFF" value={settings.uberEnabled} onToggle={(v) => handleBool("uberEnabled", v)} />
          <Divider />
          <SwitchRow label="Bolt Driver" color={Colors.light.bolt} value={settings.boltEnabled} onToggle={(v) => handleBool("boltEnabled", v)} />
          <Divider />
          <SwitchRow label="FreeNow" color={Colors.light.freeNow} value={settings.freeNowEnabled} onToggle={(v) => handleBool("freeNowEnabled", v)} />
        </View>

        {/* Permissions setup */}
        <SectionHeader icon="shield" label="Konfiguracja na urządzeniu" />
        <View style={styles.guideCard}>
          <SetupStep number={1} icon="eye" title="Accessibility Service"
            description="Ustawienia → Dostępność → Zainstalowane aplikacje → TaxiAnalysis → Włącz. Aplikacja odczytuje dane kursu z ekranu." />
          <SetupStep number={2} icon="layers" title="Wyświetlanie nad aplikacjami"
            description="Ustawienia → Aplikacje → TaxiAnalysis → Wyświetl nad innymi aplikacjami → Włącz. Dzięki temu belka RideHelper pojawia się nad Uber/Bolt." />
          <SetupStep number={3} icon="bell" title="Powiadomienia"
            description="Zezwól na powiadomienia, aby otrzymywać alerty o nowych ofertach w tle." />
          <SetupStep number={4} icon="battery-charging" title="Bez optymalizacji baterii"
            description="Ustawienia → Bateria → TaxiAnalysis → Brak ograniczeń. Aplikacja działa wtedy nieprzerwanie." />
          <SetupStep number={5} icon="check-square" title="Gotowe"
            description="Uruchom TaxiAnalysis, wróć do aplikacji kierowcy i czekaj na ofertę kursu — belka pojawi się automatycznie." />
        </View>

        {/* Danger zone */}
        <SectionHeader icon="alert-triangle" label="Strefa niebezpieczna" />
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

        <Text style={styles.version}>TaxiAnalysis v1.1.0</Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={13} color={Colors.light.textMuted} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function NumericRow({ label, suffix, value, onSave }: {
  label: string; suffix: string; value: string; onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const save = () => { setEditing(false); onSave(draft); };
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput style={styles.editInput} value={draft} onChangeText={setDraft}
            keyboardType="decimal-pad" autoFocus onBlur={save} onSubmitEditing={save} />
          <Text style={styles.rowSuffix}>{suffix}</Text>
          <TouchableOpacity onPress={save}><Feather name="check" size={18} color={Colors.light.tint} /></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.valueBtn} onPress={() => { setDraft(value); setEditing(true); }}>
          <Text style={styles.rowValue}>{value}</Text>
          <Text style={styles.rowSuffix}>{suffix}</Text>
          <Feather name="edit-2" size={12} color={Colors.light.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SwitchRow({ label, color, value, onToggle }: {
  label: string; color: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.switchLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ false: Colors.light.borderLight, true: Colors.light.tintGlow }}
        thumbColor={value ? Colors.light.tint : Colors.light.textMuted}
        ios_backgroundColor={Colors.light.borderLight} />
    </View>
  );
}

function OverlayToggle({ label, value, onToggle }: {
  label: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.overlayLabelRow}>
        <Feather name="layout" size={13} color={value ? Colors.light.tint : Colors.light.textMuted} />
        <Text style={[styles.rowLabel, !value && { color: Colors.light.textSecondary }]}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ false: Colors.light.borderLight, true: Colors.light.tintGlow }}
        thumbColor={value ? Colors.light.tint : Colors.light.textMuted}
        ios_backgroundColor={Colors.light.borderLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 8 },
  sectionLabel: { color: Colors.light.textMuted, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, overflow: "hidden" },
  divider: { height: 1, backgroundColor: Colors.light.border, marginHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13 },
  rowLabel: { flex: 1, color: Colors.light.text, fontSize: 14, fontFamily: "Inter_400Regular" },
  valueBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  rowValue: { color: Colors.light.textSecondary, fontSize: 14, fontFamily: "Inter_500Medium" },
  rowSuffix: { color: Colors.light.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  editInput: {
    color: Colors.light.text, fontSize: 14, fontFamily: "Inter_500Medium",
    minWidth: 55, textAlign: "right",
    borderBottomWidth: 1, borderBottomColor: Colors.light.tint, paddingVertical: 2,
  },
  switchLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  overlayLabelRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  guideCard: {
    backgroundColor: Colors.light.backgroundCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.light.border, padding: 14,
  },
  dangerCard: {
    backgroundColor: Colors.light.backgroundCard, borderRadius: 16,
    borderWidth: 1, borderColor: `${Colors.light.danger}30`, overflow: "hidden",
  },
  dangerSep: { height: 1, backgroundColor: `${Colors.light.danger}20` },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 15 },
  dangerBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  version: { textAlign: "center", color: Colors.light.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 20, marginBottom: 8 },
});
