import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { PaymentType } from "@/components/RideInputModal";

export type Platform = "uber" | "bolt" | "freeNow";

export interface RideAnalysis {
  id: string;
  timestamp: number;
  platform: Platform;
  serviceType: string;
  paymentType: PaymentType;
  price: number;
  pickupDistance: number;
  pickupTime: number;
  tripDistance: number;
  tripTime: number;
  rating?: number;
  pickupAddress?: string;
  destinationAddress?: string;
  // Computed
  totalDistance: number;
  totalTime: number;
  pricePerKm: number;
  pricePerHour: number;
  pricePerMinute: number;
  estimatedProfit: number;
  deadKmRatio: number;
  deadTimeRatio: number;
  isProfitable: boolean;
  profitabilityScore: number;
  failedReasons: string[];
}

const STORAGE_KEY = "taxianalysis_history_v3";

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
        } catch {}
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
