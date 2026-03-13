import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ScanArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayElements {
  showPrice: boolean;
  showKm1: boolean;
  showKm2: boolean;
  showTotalKm: boolean;
  showPricePerKm: boolean;
  showPricePerHour: boolean;
  showRating: boolean;
  showProfit: boolean;
  showDeadKmRatio: boolean;
}

export interface Settings {
  minPricePerKm: number;
  minPricePerHour: number;
  minPrice: number;
  minRating: number;
  maxDeadKmRatio: number;
  fuelCostPerKm: number;
  scanInterval: number;
  showOutline: boolean;
  scanArea: ScanArea | null;
  uberEnabled: boolean;
  boltEnabled: boolean;
  freeNowEnabled: boolean;
  overlayElements: OverlayElements;
  accessibilityEnabled: boolean;
  overlayPermissionEnabled: boolean;
  colorByThreshold: boolean;
  overlayFontSize: number;
}

const DEFAULT_OVERLAY_ELEMENTS: OverlayElements = {
  showPrice: true,
  showKm1: true,
  showKm2: true,
  showTotalKm: true,
  showPricePerKm: true,
  showPricePerHour: true,
  showRating: true,
  showProfit: true,
  showDeadKmRatio: false,
};

export const DEFAULT_SETTINGS: Settings = {
  minPricePerKm: 2.5,
  minPricePerHour: 40,
  minPrice: 10,
  minRating: 4.5,
  maxDeadKmRatio: 0.5,
  fuelCostPerKm: 0.6,
  scanInterval: 400,
  showOutline: true,
  scanArea: null,
  uberEnabled: true,
  boltEnabled: true,
  freeNowEnabled: true,
  overlayElements: DEFAULT_OVERLAY_ELEMENTS,
  accessibilityEnabled: false,
  overlayPermissionEnabled: false,
  colorByThreshold: true,
  overlayFontSize: 13,
};

const STORAGE_KEY = "taxianalysis_settings_v3";

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  updateOverlayElements: (partial: Partial<OverlayElements>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            overlayElements: {
              ...DEFAULT_OVERLAY_ELEMENTS,
              ...(parsed.overlayElements ?? {}),
            },
          });
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateOverlayElements = useCallback(
    async (partial: Partial<OverlayElements>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          overlayElements: { ...prev.overlayElements, ...partial },
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, updateOverlayElements, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
