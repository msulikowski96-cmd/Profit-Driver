import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { Platform as RidePlatform } from "@/context/RideHistoryContext";
import { parseRideText } from "@/utils/calculator";

interface RideFormData {
  platform: RidePlatform;
  price: string;
  pickupDistance: string;
  tripDistance: string;
  estimatedTime: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAnalyze: (
    data: {
      platform: RidePlatform;
      price: number;
      pickupDistance: number;
      tripDistance: number;
      estimatedTime: number;
    }
  ) => void;
}

const PLATFORMS: { id: RidePlatform; label: string; color: string }[] = [
  { id: "uber", label: "Uber", color: "#FFFFFF" },
  { id: "bolt", label: "Bolt", color: "#34D186" },
  { id: "freeNow", label: "FreeNow", color: "#FFD500" },
];

export function RideInputModal({ visible, onClose, onAnalyze }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;

  const [form, setForm] = useState<RideFormData>({
    platform: "uber",
    price: "",
    pickupDistance: "",
    tripDistance: "",
    estimatedTime: "",
  });
  const [ocrText, setOcrText] = useState("");
  const [showOcr, setShowOcr] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 9,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleParseOcr = () => {
    const parsed = parseRideText(ocrText);
    setForm((f) => ({
      ...f,
      price: parsed.price?.toString() ?? f.price,
      pickupDistance:
        parsed.pickupDistance?.toString() ?? f.pickupDistance,
      tripDistance: parsed.tripDistance?.toString() ?? f.tripDistance,
      estimatedTime: parsed.estimatedTime?.toString() ?? f.estimatedTime,
    }));
    setShowOcr(false);
  };

  const handleAnalyze = () => {
    const price = parseFloat(form.price.replace(",", "."));
    const pickupDistance = parseFloat(
      form.pickupDistance.replace(",", ".")
    );
    const tripDistance = parseFloat(form.tripDistance.replace(",", "."));
    const estimatedTime = parseFloat(form.estimatedTime.replace(",", "."));
    if (
      isNaN(price) ||
      isNaN(tripDistance) ||
      isNaN(estimatedTime) ||
      price <= 0
    )
      return;
    onAnalyze({
      platform: form.platform,
      price,
      pickupDistance: isNaN(pickupDistance) ? 0 : pickupDistance,
      tripDistance,
      estimatedTime,
    });
  };

  const isValid = () => {
    const price = parseFloat(form.price.replace(",", "."));
    const tripDistance = parseFloat(form.tripDistance.replace(",", "."));
    const estimatedTime = parseFloat(form.estimatedTime.replace(",", "."));
    return !isNaN(price) && price > 0 && !isNaN(tripDistance) && !isNaN(estimatedTime);
  };

  const update = (key: keyof RideFormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kvView}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + 16,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Pressable>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Analiza kursu</Text>
                <TouchableOpacity onPress={onClose} testID="modal-close">
                  <Feather
                    name="x"
                    size={22}
                    color={Colors.light.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Platform selector */}
              <View style={styles.platformRow}>
                {PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.platformBtn,
                      form.platform === p.id && {
                        borderColor: p.color,
                        backgroundColor: `${p.color}18`,
                      },
                    ]}
                    onPress={() => update("platform", p.id)}
                    testID={`platform-${p.id}`}
                  >
                    <Text
                      style={[
                        styles.platformLabel,
                        { color: form.platform === p.id ? p.color : Colors.light.textSecondary },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* OCR paste */}
              <TouchableOpacity
                style={styles.ocrToggle}
                onPress={() => setShowOcr(!showOcr)}
              >
                <Feather name="clipboard" size={14} color={Colors.light.tint} />
                <Text style={styles.ocrToggleText}>
                  {showOcr ? "Wpisz ręcznie" : "Wklej tekst z ekranu (OCR)"}
                </Text>
              </TouchableOpacity>

              {showOcr ? (
                <View style={styles.ocrBox}>
                  <TextInput
                    style={styles.ocrInput}
                    placeholder="Wklej tekst z oferty kursu (np. '21,59 zł · 16.9 km · 8 min')"
                    placeholderTextColor={Colors.light.textMuted}
                    value={ocrText}
                    onChangeText={setOcrText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={styles.parseBtn}
                    onPress={handleParseOcr}
                  >
                    <Text style={styles.parseBtnText}>Analizuj tekst</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.form}>
                  <InputRow
                    label="Cena kursu"
                    suffix="zł"
                    value={form.price}
                    onChangeText={(v) => update("price", v)}
                    placeholder="np. 21.59"
                    testID="input-price"
                  />
                  <InputRow
                    label="Dystans do pasażera"
                    suffix="km"
                    value={form.pickupDistance}
                    onChangeText={(v) => update("pickupDistance", v)}
                    placeholder="np. 2.1"
                    testID="input-pickup"
                  />
                  <InputRow
                    label="Dystans przejazdu"
                    suffix="km"
                    value={form.tripDistance}
                    onChangeText={(v) => update("tripDistance", v)}
                    placeholder="np. 4.8"
                    testID="input-trip"
                  />
                  <InputRow
                    label="Szacowany czas"
                    suffix="min"
                    value={form.estimatedTime}
                    onChangeText={(v) => update("estimatedTime", v)}
                    placeholder="np. 8"
                    testID="input-time"
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.analyzeBtn,
                  !isValid() && styles.analyzeBtnDisabled,
                ]}
                onPress={handleAnalyze}
                disabled={!isValid()}
                testID="analyze-btn"
              >
                <Feather name="zap" size={18} color="#000" />
                <Text style={styles.analyzeBtnText}>Oblicz opłacalność</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function InputRow({
  label,
  suffix,
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  label: string;
  suffix: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  testID?: string;
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textMuted}
          keyboardType="decimal-pad"
          testID={testID}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  kvView: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  platformRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  platformBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
  },
  platformLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  ocrToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  ocrToggleText: {
    fontSize: 13,
    color: Colors.light.tint,
    fontFamily: "Inter_500Medium",
  },
  ocrBox: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  ocrInput: {
    color: Colors.light.text,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
  },
  parseBtn: {
    backgroundColor: Colors.light.tintGlow,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  parseBtnText: {
    color: Colors.light.tint,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  form: {
    gap: 12,
    paddingBottom: 8,
  },
  inputRow: {
    gap: 6,
  },
  inputLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  suffix: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginLeft: 6,
  },
  analyzeBtn: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  analyzeBtnDisabled: {
    opacity: 0.4,
  },
  analyzeBtnText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
