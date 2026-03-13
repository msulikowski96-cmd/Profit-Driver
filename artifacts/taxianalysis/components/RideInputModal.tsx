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

export type PaymentType = "cash" | "card" | "online";
export type ServiceType =
  | "UberX" | "Uber Comfort" | "Uber XL"
  | "Bolt" | "Bolt Comfort" | "Bolt XL"
  | "FreeNow" | "FreeNow Comfort";

interface RideFormData {
  platform: RidePlatform;
  serviceType: string;
  paymentType: PaymentType;
  price: string;
  rating: string;
  pickupDistance: string;
  pickupTime: string;
  tripDistance: string;
  tripTime: string;
  pickupAddress: string;
  destinationAddress: string;
}

export interface RideInputData {
  platform: RidePlatform;
  serviceType: string;
  paymentType: PaymentType;
  price: number;
  rating?: number;
  pickupDistance: number;
  pickupTime: number;
  tripDistance: number;
  tripTime: number;
  pickupAddress?: string;
  destinationAddress?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAnalyze: (data: RideInputData) => void;
}

const SERVICE_TYPES: Record<RidePlatform, string[]> = {
  uber: ["UberX", "Uber Comfort", "Uber XL", "UberGreen"],
  bolt: ["Bolt", "Bolt Comfort", "Bolt XL", "Bolt Pet"],
  freeNow: ["FreeNow", "FreeNow Comfort", "FreeNow XL"],
};

const PLATFORMS: { id: RidePlatform; label: string; color: string }[] = [
  { id: "uber", label: "Uber", color: "#FFFFFF" },
  { id: "bolt", label: "Bolt", color: "#34D186" },
  { id: "freeNow", label: "FreeNow", color: "#FFD500" },
];

const PAYMENT_TYPES: { id: PaymentType; label: string; icon: string }[] = [
  { id: "cash", label: "Gotówka", icon: "dollar-sign" },
  { id: "card", label: "Karta", icon: "credit-card" },
  { id: "online", label: "Online", icon: "smartphone" },
];

const EMPTY_FORM: RideFormData = {
  platform: "uber",
  serviceType: "UberX",
  paymentType: "cash",
  price: "",
  rating: "",
  pickupDistance: "",
  pickupTime: "",
  tripDistance: "",
  tripTime: "",
  pickupAddress: "",
  destinationAddress: "",
};

export function RideInputModal({ visible, onClose, onAnalyze }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(700)).current;

  const [form, setForm] = useState<RideFormData>(EMPTY_FORM);
  const [ocrText, setOcrText] = useState("");
  const [showOcr, setShowOcr] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);

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
        toValue: 700,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const update = <K extends keyof RideFormData>(key: K, val: RideFormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setPlatform = (p: RidePlatform) => {
    setForm((f) => ({
      ...f,
      platform: p,
      serviceType: SERVICE_TYPES[p][0],
    }));
  };

  const handleParseOcr = () => {
    const parsed = parseRideText(ocrText);
    setForm((f) => ({
      ...f,
      price: parsed.price != null ? String(parsed.price) : f.price,
      pickupDistance:
        parsed.pickupDistance != null ? String(parsed.pickupDistance) : f.pickupDistance,
      tripDistance:
        parsed.tripDistance != null ? String(parsed.tripDistance) : f.tripDistance,
      pickupTime:
        parsed.pickupTime != null ? String(parsed.pickupTime) : f.pickupTime,
      tripTime:
        parsed.tripTime != null ? String(parsed.tripTime) : f.tripTime,
      rating: parsed.rating != null ? String(parsed.rating) : f.rating,
      pickupAddress: parsed.pickupAddress ?? f.pickupAddress,
      destinationAddress: parsed.destinationAddress ?? f.destinationAddress,
    }));
    setShowOcr(false);
  };

  const isValid = () => {
    const price = parseFloat(form.price.replace(",", "."));
    const tripDist = parseFloat(form.tripDistance.replace(",", "."));
    const tripTime = parseFloat(form.tripTime.replace(",", "."));
    return !isNaN(price) && price > 0 && !isNaN(tripDist) && !isNaN(tripTime);
  };

  const handleAnalyze = () => {
    const price = parseFloat(form.price.replace(",", "."));
    const pickupDistance = parseFloat(form.pickupDistance.replace(",", ".")) || 0;
    const pickupTime = parseFloat(form.pickupTime.replace(",", ".")) || 0;
    const tripDistance = parseFloat(form.tripDistance.replace(",", "."));
    const tripTime = parseFloat(form.tripTime.replace(",", "."));
    const rating = parseFloat(form.rating.replace(",", "."));

    onAnalyze({
      platform: form.platform,
      serviceType: form.serviceType,
      paymentType: form.paymentType,
      price,
      rating: isNaN(rating) ? undefined : rating,
      pickupDistance,
      pickupTime,
      tripDistance,
      tripTime,
      pickupAddress: form.pickupAddress.trim() || undefined,
      destinationAddress: form.destinationAddress.trim() || undefined,
    });
  };

  const services = SERVICE_TYPES[form.platform];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
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

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Dane kursu</Text>
                <TouchableOpacity onPress={onClose} testID="modal-close">
                  <Feather name="x" size={22} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Platform */}
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
                      onPress={() => setPlatform(p.id)}
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

                {/* Service type chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceScroll} contentContainerStyle={styles.serviceRow}>
                  {services.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.serviceChip,
                        form.serviceType === s && styles.serviceChipActive,
                      ]}
                      onPress={() => update("serviceType", s)}
                    >
                      <Text style={[styles.serviceChipText, form.serviceType === s && styles.serviceChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Payment type */}
                <View style={styles.paymentRow}>
                  {PAYMENT_TYPES.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.paymentBtn,
                        form.paymentType === p.id && styles.paymentBtnActive,
                      ]}
                      onPress={() => update("paymentType", p.id)}
                    >
                      <Feather
                        name={p.icon as keyof typeof Feather.glyphMap}
                        size={13}
                        color={form.paymentType === p.id ? Colors.light.tint : Colors.light.textSecondary}
                      />
                      <Text style={[styles.paymentLabel, form.paymentType === p.id && styles.paymentLabelActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* OCR toggle */}
                <TouchableOpacity style={styles.ocrToggle} onPress={() => setShowOcr(!showOcr)}>
                  <Feather name="clipboard" size={14} color={Colors.light.tint} />
                  <Text style={styles.ocrToggleText}>
                    {showOcr ? "Wpisz ręcznie" : "Wklej tekst z ekranu (OCR)"}
                  </Text>
                </TouchableOpacity>

                {showOcr && (
                  <View style={styles.ocrBox}>
                    <TextInput
                      style={styles.ocrInput}
                      placeholder={"Wklej tekst z powiadomienia:\nprzy. 21 min (11.8 km)\nprzejazd 3 min (1.1 km)\n★ 5,00 · 12,86 zł"}
                      placeholderTextColor={Colors.light.textMuted}
                      value={ocrText}
                      onChangeText={setOcrText}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                    />
                    <TouchableOpacity style={styles.parseBtn} onPress={handleParseOcr}>
                      <Text style={styles.parseBtnText}>Analizuj tekst</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.form}>
                  {/* Cena + Ocena */}
                  <View style={styles.row2}>
                    <InputField
                      label="Cena kursu"
                      suffix="zł"
                      value={form.price}
                      onChangeText={(v) => update("price", v)}
                      placeholder="12.86"
                      testID="input-price"
                      flex={3}
                    />
                    <InputField
                      label="Ocena ★"
                      suffix=""
                      value={form.rating}
                      onChangeText={(v) => update("rating", v)}
                      placeholder="5.00"
                      testID="input-rating"
                      flex={2}
                    />
                  </View>

                  {/* Separator label */}
                  <View style={styles.sectionDivider}>
                    <View style={styles.sectionLine} />
                    <View style={styles.sectionLabelWrap}>
                      <Feather name="navigation" size={11} color={Colors.light.textMuted} />
                      <Text style={styles.sectionLabel}>Dojazd do pasażera</Text>
                    </View>
                    <View style={styles.sectionLine} />
                  </View>

                  {/* Pickup: czas + km */}
                  <View style={styles.row2}>
                    <InputField
                      label="Czas podjazdu"
                      suffix="min"
                      value={form.pickupTime}
                      onChangeText={(v) => update("pickupTime", v)}
                      placeholder="21"
                      testID="input-pickup-time"
                      flex={1}
                    />
                    <InputField
                      label="Km do pasażera"
                      suffix="km"
                      value={form.pickupDistance}
                      onChangeText={(v) => update("pickupDistance", v)}
                      placeholder="11.8"
                      testID="input-pickup-dist"
                      flex={1}
                    />
                  </View>

                  {/* Separator label */}
                  <View style={styles.sectionDivider}>
                    <View style={styles.sectionLine} />
                    <View style={styles.sectionLabelWrap}>
                      <Feather name="map-pin" size={11} color={Colors.light.textMuted} />
                      <Text style={styles.sectionLabel}>Przejazd</Text>
                    </View>
                    <View style={styles.sectionLine} />
                  </View>

                  {/* Trip: czas + km */}
                  <View style={styles.row2}>
                    <InputField
                      label="Czas kursu"
                      suffix="min"
                      value={form.tripTime}
                      onChangeText={(v) => update("tripTime", v)}
                      placeholder="3"
                      testID="input-trip-time"
                      flex={1}
                    />
                    <InputField
                      label="Km kursu"
                      suffix="km"
                      value={form.tripDistance}
                      onChangeText={(v) => update("tripDistance", v)}
                      placeholder="1.1"
                      testID="input-trip-dist"
                      flex={1}
                    />
                  </View>

                  {/* Addresses (collapsible) */}
                  <TouchableOpacity
                    style={styles.addressToggle}
                    onPress={() => setShowAddresses(!showAddresses)}
                  >
                    <Feather name="map" size={13} color={Colors.light.textSecondary} />
                    <Text style={styles.addressToggleText}>
                      {showAddresses ? "Ukryj adresy" : "Dodaj adresy (opcjonalne)"}
                    </Text>
                    <Feather
                      name={showAddresses ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={Colors.light.textMuted}
                    />
                  </TouchableOpacity>

                  {showAddresses && (
                    <>
                      <InputField
                        label="Adres odbioru"
                        suffix=""
                        value={form.pickupAddress}
                        onChangeText={(v) => update("pickupAddress", v)}
                        placeholder="ul. Pocztowa 3, Komorniki"
                        testID="input-pickup-addr"
                        flex={1}
                      />
                      <InputField
                        label="Adres docelowy"
                        suffix=""
                        value={form.destinationAddress}
                        onChangeText={(v) => update("destinationAddress", v)}
                        placeholder="ul. Zbożowa 4, Komorniki"
                        testID="input-dest-addr"
                        flex={1}
                      />
                    </>
                  )}
                </View>
              </ScrollView>

              {/* Analyze button */}
              <TouchableOpacity
                style={[styles.analyzeBtn, !isValid() && styles.analyzeBtnDisabled]}
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

function InputField({
  label, suffix, value, onChangeText, placeholder, testID, flex,
}: {
  label: string; suffix: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; testID?: string; flex: number;
}) {
  const isText = suffix === "" && (label.toLowerCase().includes("adres") || label.toLowerCase().includes("addr"));
  return (
    <View style={{ flex, gap: 5 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textMuted}
          keyboardType={isText ? "default" : "decimal-pad"}
          testID={testID}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  kvView: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "95%",
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  platformRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
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
  serviceScroll: { marginBottom: 10 },
  serviceRow: { gap: 6, paddingRight: 4 },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  serviceChipActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintGlow,
  },
  serviceChipText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  serviceChipTextActive: {
    color: Colors.light.tint,
  },
  paymentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  paymentBtnActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintGlow,
  },
  paymentLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  paymentLabelActive: {
    color: Colors.light.tint,
  },
  ocrToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
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
  form: { gap: 10, paddingBottom: 8 },
  row2: { flexDirection: "row", gap: 10 },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.light.border },
  sectionLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionLabel: {
    color: Colors.light.textMuted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  addressToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  addressToggleText: {
    flex: 1,
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  inputLabel: {
    color: Colors.light.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  suffix: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginLeft: 4,
  },
  analyzeBtn: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
