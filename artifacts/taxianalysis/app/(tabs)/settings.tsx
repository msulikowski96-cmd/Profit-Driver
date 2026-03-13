import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { Settings, useSettings } from "@/context/SettingsContext";
import { useRideHistory } from "@/context/RideHistoryContext";
import { SetupStep } from "@/components/SetupStep";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { clearHistory } = useRideHistory();
  const isWeb = Platform.OS === "web";

  const handleUpdate = async (key: keyof Settings, value: string | boolean) => {
    let parsed: number | boolean = value as boolean;
    if (typeof value === "string") {
      parsed = parseFloat(value.replace(",", "."));
      if (isNaN(parsed as number)) return;
    }
    await updateSettings({ [key]: parsed });
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const handleReset = () => {
    if (Platform.OS === "web") {
      resetSettings();
      return;
    }
    Alert.alert(
      "Resetuj ustawienia",
      "Przywrócić domyślne ustawienia?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Resetuj",
          style: "destructive",
          onPress: () => resetSettings(),
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 67 : insets.top + 16,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scroll,
          isWeb && { paddingBottom: 34 + 84 },
        ]}
      >
        <Text style={styles.pageTitle}>Ustawienia</Text>

        {/* Profitability thresholds */}
        <SectionHeader
          icon="target"
          label="Progi opłacalności"
        />

        <View style={styles.card}>
          <NumericRow
            label="Min. zarobek / km"
            suffix="zł/km"
            value={settings.minPricePerKm.toString()}
            onSave={(v) => handleUpdate("minPricePerKm", v)}
          />
          <Divider />
          <NumericRow
            label="Min. zarobek / godz."
            suffix="zł/h"
            value={settings.minPricePerHour.toString()}
            onSave={(v) => handleUpdate("minPricePerHour", v)}
          />
          <Divider />
          <NumericRow
            label="Koszt paliwa / km"
            suffix="zł/km"
            value={settings.fuelCostPerKm.toString()}
            onSave={(v) => handleUpdate("fuelCostPerKm", v)}
          />
        </View>

        {/* Platforms */}
        <SectionHeader icon="layers" label="Platformy" />

        <View style={styles.card}>
          <SwitchRow
            label="Uber Driver"
            color="#FFFFFF"
            value={settings.uberEnabled}
            onToggle={(v) => handleUpdate("uberEnabled", v)}
          />
          <Divider />
          <SwitchRow
            label="Bolt Driver"
            color={Colors.light.bolt}
            value={settings.boltEnabled}
            onToggle={(v) => handleUpdate("boltEnabled", v)}
          />
          <Divider />
          <SwitchRow
            label="FreeNow"
            color={Colors.light.freeNow}
            value={settings.freeNowEnabled}
            onToggle={(v) => handleUpdate("freeNowEnabled", v)}
          />
        </View>

        {/* Scan interval */}
        <SectionHeader icon="radio" label="Skanowanie" />

        <View style={styles.card}>
          <NumericRow
            label="Interwał skanowania"
            suffix="ms"
            value={settings.scanInterval.toString()}
            onSave={(v) => handleUpdate("scanInterval", v)}
          />
        </View>

        {/* Setup guide */}
        <SectionHeader icon="info" label="Konfiguracja na urządzeniu" />

        <View style={styles.guideCard}>
          <SetupStep
            number={1}
            icon="eye"
            title="Włącz Accessibility Service"
            description="Przejdź do Ustawienia → Dostępność → Zainstalowane aplikacje → TaxiAnalysis i włącz usługę. Pozwoli to aplikacji odczytywać dane z ekranu."
          />
          <SetupStep
            number={2}
            icon="layers"
            title="Zezwól na wyświetlanie nad innymi aplikacjami"
            description="Przejdź do Ustawienia → Aplikacje → TaxiAnalysis → Wyświetlanie nad innymi aplikacjami i włącz. To pozwoli pokazywać pasek z analizą."
          />
          <SetupStep
            number={3}
            icon="bell"
            title="Włącz powiadomienia"
            description="Zezwól aplikacji na wysyłanie powiadomień, aby otrzymywać alerty o nowych ofertach kursów nawet gdy ekran jest wygaszony."
          />
          <SetupStep
            number={4}
            icon="battery-charging"
            title="Wyłącz oszczędzanie baterii"
            description="W ustawieniach baterii dodaj TaxiAnalysis do wyjątków, aby aplikacja działała nieprzerwanie w tle."
          />
          <SetupStep
            number={5}
            icon="check-square"
            title="Uruchom aplikację"
            description="Wróć do głównego ekranu TaxiAnalysis i naciśnij 'Analizuj kurs'. Podczas jazdy nakładka z analizą pojawi się automatycznie."
          />
        </View>

        {/* Danger zone */}
        <SectionHeader icon="alert-triangle" label="Strefa niebezpieczna" />

        <View style={styles.dangerCard}>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleReset}
          >
            <Feather name="refresh-ccw" size={16} color={Colors.light.warning} />
            <Text style={[styles.dangerBtnText, { color: Colors.light.warning }]}>
              Przywróć domyślne ustawienia
            </Text>
          </TouchableOpacity>
          <View style={styles.dangerDivider} />
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              if (Platform.OS === "web") {
                clearHistory();
              } else {
                Alert.alert("Usuń historię", "Czy na pewno chcesz usunąć całą historię?", [
                  { text: "Anuluj", style: "cancel" },
                  {
                    text: "Usuń",
                    style: "destructive",
                    onPress: () => clearHistory(),
                  },
                ]);
              }
            }}
          >
            <Feather name="trash-2" size={16} color={Colors.light.danger} />
            <Text style={[styles.dangerBtnText, { color: Colors.light.danger }]}>
              Usuń całą historię kursów
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>TaxiAnalysis v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather
        name={icon as keyof typeof Feather.glyphMap}
        size={14}
        color={Colors.light.textMuted}
      />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function NumericRow({
  label,
  suffix,
  value,
  onSave,
}: {
  label: string;
  suffix: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    setEditing(false);
    onSave(draft);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
            onBlur={save}
            onSubmitEditing={save}
          />
          <Text style={styles.rowSuffix}>{suffix}</Text>
          <TouchableOpacity onPress={save}>
            <Feather name="check" size={18} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.valueBtn}
          onPress={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <Text style={styles.rowValue}>{value}</Text>
          <Text style={styles.rowSuffix}>{suffix}</Text>
          <Feather
            name="edit-2"
            size={13}
            color={Colors.light.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SwitchRow({
  label,
  color,
  value,
  onToggle,
}: {
  label: string;
  color: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.switchLabel}>
        <View style={[styles.platformDot, { backgroundColor: color }]} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: Colors.light.borderLight,
          true: Colors.light.tintGlow,
        }}
        thumbColor={value ? Colors.light.tint : Colors.light.textMuted}
        ios_backgroundColor={Colors.light.borderLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    color: Colors.light.textMuted,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  valueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowSuffix: {
    color: Colors.light.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editInput: {
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    minWidth: 60,
    textAlign: "right",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tint,
    paddingVertical: 2,
  },
  switchLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  guideCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  dangerCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${Colors.light.danger}30`,
    overflow: "hidden",
  },
  dangerDivider: {
    height: 1,
    backgroundColor: `${Colors.light.danger}20`,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  dangerBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  version: {
    textAlign: "center",
    color: Colors.light.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 24,
    marginBottom: 8,
  },
});
