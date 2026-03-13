import { Settings } from "@/context/SettingsContext";

export interface RideData {
  price: number;
  pickupDistance: number;
  tripDistance: number;
  estimatedTime: number;
  rating?: number;
}

export interface ThresholdCheck {
  label: string;
  value: string;
  threshold: string;
  passed: boolean;
}

export interface CalculationResult {
  totalDistance: number;
  pricePerKm: number;
  pricePerHour: number;
  pricePerMinute: number;
  estimatedProfit: number;
  deadKmRatio: number;
  efficiencyScore: number;
  isProfitable: boolean;
  profitabilityScore: number;
  thresholdChecks: ThresholdCheck[];
  avgPriceSoFar: number | null;
  failedReasons: string[];
}

let rideHistory: number[] = [];

export function recordPrice(price: number) {
  rideHistory = [price, ...rideHistory].slice(0, 20);
}

export function getAveragePrice(): number | null {
  if (rideHistory.length === 0) return null;
  return rideHistory.reduce((a, b) => a + b, 0) / rideHistory.length;
}

export function resetHistory() {
  rideHistory = [];
}

export function calculateRide(
  ride: RideData,
  settings: Settings
): CalculationResult {
  const totalDistance = ride.pickupDistance + ride.tripDistance;
  const pricePerKm = totalDistance > 0 ? ride.price / totalDistance : 0;
  const pricePerHour =
    ride.estimatedTime > 0 ? (ride.price / ride.estimatedTime) * 60 : 0;
  const pricePerMinute =
    ride.estimatedTime > 0 ? ride.price / ride.estimatedTime : 0;
  const fuelCost = totalDistance * settings.fuelCostPerKm;
  const estimatedProfit = ride.price - fuelCost;
  const deadKmRatio =
    totalDistance > 0 ? ride.pickupDistance / totalDistance : 0;

  // ── Threshold checks ───────────────────────────────────────────────────────
  const thresholdChecks: ThresholdCheck[] = [
    {
      label: "Cena kursu",
      value: `${ride.price.toFixed(2)} zł`,
      threshold: `min ${settings.minPrice.toFixed(2)} zł`,
      passed: ride.price >= settings.minPrice,
    },
    {
      label: "zł / km",
      value: `${pricePerKm.toFixed(2)}`,
      threshold: `min ${settings.minPricePerKm.toFixed(2)}`,
      passed: pricePerKm >= settings.minPricePerKm,
    },
    {
      label: "zł / godz.",
      value: `${Math.round(pricePerHour)}`,
      threshold: `min ${Math.round(settings.minPricePerHour)}`,
      passed: pricePerHour >= settings.minPricePerHour,
    },
    {
      label: "Ocena kierowcy",
      value: ride.rating != null ? ride.rating.toFixed(2) : "–",
      threshold: `min ${settings.minRating.toFixed(2)}`,
      passed:
        ride.rating == null || ride.rating >= settings.minRating,
    },
    {
      label: "Martwy km (podjazd/całość)",
      value: `${(deadKmRatio * 100).toFixed(0)}%`,
      threshold: `max ${(settings.maxDeadKmRatio * 100).toFixed(0)}%`,
      passed: deadKmRatio <= settings.maxDeadKmRatio,
    },
  ];

  const failedReasons = thresholdChecks
    .filter((c) => !c.passed)
    .map((c) => `${c.label}: ${c.value} (${c.threshold})`);

  const isProfitable = thresholdChecks.every((c) => c.passed);

  // ── Profitability score (0–100) ────────────────────────────────────────────
  // Weighted: zł/km 35%, zł/h 35%, price 15%, rating 10%, dead_km 5%
  const kmScore = Math.min((pricePerKm / settings.minPricePerKm) * 35, 35);
  const hourScore = Math.min(
    (pricePerHour / settings.minPricePerHour) * 35,
    35
  );
  const priceScore = Math.min((ride.price / settings.minPrice) * 15, 15);
  const ratingScore =
    ride.rating != null && settings.minRating > 0
      ? Math.min((ride.rating / settings.minRating) * 10, 10)
      : 10;
  const deadKmScore =
    settings.maxDeadKmRatio > 0
      ? Math.min(
          ((settings.maxDeadKmRatio - deadKmRatio) / settings.maxDeadKmRatio) *
            5,
          5
        )
      : 5;

  const profitabilityScore = Math.max(
    0,
    Math.round(kmScore + hourScore + priceScore + ratingScore + deadKmScore)
  );

  // ── Efficiency score (broader context) ────────────────────────────────────
  const efficiencyScore = Math.min(
    100,
    Math.round(
      (pricePerKm / 3) * 40 +
        (pricePerHour / 60) * 40 +
        (1 - Math.min(deadKmRatio, 1)) * 20
    )
  );

  const avgPriceSoFar = getAveragePrice();

  return {
    totalDistance,
    pricePerKm,
    pricePerHour,
    pricePerMinute,
    estimatedProfit,
    deadKmRatio,
    efficiencyScore,
    isProfitable,
    profitabilityScore,
    thresholdChecks,
    avgPriceSoFar,
    failedReasons,
  };
}

export function parseRideText(text: string): Partial<RideData> {
  const result: Partial<RideData> = {};

  const priceMatch = text.match(/(\d+[.,]\d+|\d+)\s*z[łl]/i);
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1].replace(",", "."));
  }

  const kmMatches = text.match(/(\d+[.,]\d+|\d+)\s*km/gi);
  if (kmMatches) {
    const distances = kmMatches.map((m) => {
      const num = m.match(/(\d+[.,]\d+|\d+)/);
      return num ? parseFloat(num[1].replace(",", ".")) : 0;
    });
    if (distances.length === 1) {
      result.tripDistance = distances[0];
      result.pickupDistance = 0;
    } else if (distances.length >= 2) {
      result.pickupDistance = distances[0];
      result.tripDistance = distances[1];
    }
  }

  const timeMatches = text.match(/(\d+)\s*min/gi);
  if (timeMatches) {
    const times = timeMatches.map((m) => {
      const num = m.match(/(\d+)/);
      return num ? parseInt(num[1]) : 0;
    });
    result.estimatedTime = times.reduce((a, b) => a + b, 0);
  }

  // rating: "4,79" or "★ 4.79"
  const ratingMatch = text.match(/[★*]\s*(\d[.,]\d{1,2})/);
  if (ratingMatch) {
    result.rating = parseFloat(ratingMatch[1].replace(",", "."));
  }

  return result;
}
