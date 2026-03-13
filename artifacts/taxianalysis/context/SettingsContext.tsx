import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Settings {
  minPricePerKm: number;
  minPricePerHour: number;
  fuelCostPerKm: number;
  scanInterval: number;
  uberEnabled: boolean;
  boltEnabled: boolean;
  freeNowEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  minPricePerKm: 2.5,
  minPricePerHour: 40,
  fuelCostPerKm: 0.6,
  scanInterval: 400,
  uberEnabled: true,
  boltEnabled: true,
  freeNowEnabled: true,
};

const STORAGE_KEY = "taxianalysis_settings";

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
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
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
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

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
