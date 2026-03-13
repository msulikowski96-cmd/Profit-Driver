import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Platform = "uber" | "bolt" | "freeNow";

export interface RideAnalysis {
  id: string;
  timestamp: number;
  platform: Platform;
  price: number;
  pickupDistance: number;
  tripDistance: number;
  estimatedTime: number;
  totalDistance: number;
  pricePerKm: number;
  pricePerHour: number;
  estimatedProfit: number;
  isProfitable: boolean;
}

const STORAGE_KEY = "taxianalysis_history";

interface RideHistoryContextType {
  history: RideAnalysis[];
  addRide: (ride: RideAnalysis) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const RideHistoryContext = createContext<RideHistoryContextType | null>(null);

export function RideHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [history, setHistory] = useState<RideAnalysis[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setHistory(JSON.parse(data));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const addRide = useCallback(async (ride: RideAnalysis) => {
    setHistory((prev) => {
      const next = [ride, ...prev].slice(0, 100);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <RideHistoryContext.Provider value={{ history, addRide, clearHistory }}>
      {children}
    </RideHistoryContext.Provider>
  );
}

export function useRideHistory() {
  const ctx = useContext(RideHistoryContext);
  if (!ctx)
    throw new Error("useRideHistory must be used inside RideHistoryProvider");
  return ctx;
}
