import { Settings } from "@/context/SettingsContext";
import { PaymentType } from "@/components/RideInputModal";

export interface RideData {
  price: number;
  pickupDistance: number;
  pickupTime: number;
  tripDistance: number;
  tripTime: number;
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
  totalTime: number;
  pricePerKm: number;
  pricePerHour: number;
  pricePerMinute: number;
  estimatedProfit: number;
  deadKmRatio: number;
  deadTimeRatio: number;
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
  const totalTime = ride.pickupTime + ride.tripTime;

  // Price per km based on total distance driven
  const pricePerKm = totalDistance > 0 ? ride.price / totalDistance : 0;
  // Price per hour based on total time including pickup
  const pricePerHour = totalTime > 0 ? (ride.price / totalTime) * 60 : 0;
  const pricePerMinute = totalTime > 0 ? ride.price / totalTime : 0;

  const fuelCost = totalDistance * settings.fuelCostPerKm;
  const estimatedProfit = ride.price - fuelCost;

  // Dead km = pickup distance / total distance
  const deadKmRatio = totalDistance > 0 ? ride.pickupDistance / totalDistance : 0;
  // Dead time ratio = pickup time / total time
  const deadTimeRatio = totalTime > 0 ? ride.pickupTime / totalTime : 0;

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
      value: pricePerKm.toFixed(2),
      threshold: `min ${settings.minPricePerKm.toFixed(2)}`,
      passed: pricePerKm >= settings.minPricePerKm,
    },
    {
      label: "zł / godz.",
      value: Math.round(pricePerHour).toString(),
      threshold: `min ${Math.round(settings.minPricePerHour)}`,
      passed: pricePerHour >= settings.minPricePerHour,
    },
    {
      label: "Ocena kierowcy",
      value: ride.rating != null ? ride.rating.toFixed(2) : "–",
      threshold: `min ${settings.minRating.toFixed(2)}`,
      passed: ride.rating == null || ride.rating >= settings.minRating,
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
  // Weights: zł/km 35%, zł/h 35%, price 15%, rating 10%, dead_km 5%
  const kmScore = Math.min((pricePerKm / Math.max(settings.minPricePerKm, 0.01)) * 35, 35);
  const hourScore = Math.min((pricePerHour / Math.max(settings.minPricePerHour, 1)) * 35, 35);
  const priceScore = Math.min((ride.price / Math.max(settings.minPrice, 0.01)) * 15, 15);
  const ratingScore =
    ride.rating != null && settings.minRating > 0
      ? Math.min((ride.rating / settings.minRating) * 10, 10)
      : 10;
  const deadKmScore =
    settings.maxDeadKmRatio > 0
      ? Math.min(
          ((settings.maxDeadKmRatio - deadKmRatio) / settings.maxDeadKmRatio) * 5,
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
    totalTime,
    pricePerKm,
    pricePerHour,
    pricePerMinute,
    estimatedProfit,
    deadKmRatio,
    deadTimeRatio,
    efficiencyScore,
    isProfitable,
    profitabilityScore,
    thresholdChecks,
    avgPriceSoFar,
    failedReasons,
  };
}

export interface ParsedRideText {
  price?: number;
  rating?: number;
  pickupDistance?: number;
  pickupTime?: number;
  tripDistance?: number;
  tripTime?: number;
  pickupAddress?: string;
  destinationAddress?: string;
}

/**
 * Parses Uber/Bolt/FreeNow notification text.
 *
 * Uber format example:
 * "12,86 zł  Płatność gotówką  ★ 5,00
 *  21 min (11.8 km) od miejsca odbioru
 *  ulica Pocztowa 3, Komorniki
 *  3 min (1.1 km) przejazd
 *  ulica Zbożowa 4, Komorniki"
 */
export function parseRideText(text: string): ParsedRideText {
  const result: ParsedRideText = {};
  const normalized = text.replace(/\r/g, "\n");

  // Price: "12,86 zł" or "12.86 zł"
  const priceMatch = normalized.match(/(\d+[.,]\d+|\d+)\s*z[łl]/i);
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1].replace(",", "."));
  }

  // Rating: "★ 5,00" or "★5.00" or "* 5.00"
  const ratingMatch = normalized.match(/[★*✩]\s*(\d[.,]\d{1,2})/);
  if (ratingMatch) {
    result.rating = parseFloat(ratingMatch[1].replace(",", "."));
  }

  // Uber/Bolt pattern: "21 min (11.8 km) od miejsca odbioru" for pickup
  // then "3 min (1.1 km) przejazd" for trip
  const pickupMatch = normalized.match(
    /(\d+)\s*min\s*\((\d+[.,]\d+|\d+)\s*km\)\s*(?:od miejsca odbioru|do pasażera|podjazd|pickup)/i
  );
  if (pickupMatch) {
    result.pickupTime = parseInt(pickupMatch[1]);
    result.pickupDistance = parseFloat(pickupMatch[2].replace(",", "."));
  }

  const tripMatch = normalized.match(
    /(\d+)\s*min\s*\((\d+[.,]\d+|\d+)\s*km\)\s*(?:przejazd|kurs|trip|ride)/i
  );
  if (tripMatch) {
    result.tripTime = parseInt(tripMatch[1]);
    result.tripDistance = parseFloat(tripMatch[2].replace(",", "."));
  }

  // Fallback: if only bare km values without labels
  if (result.pickupDistance == null && result.tripDistance == null) {
    const kmMatches = [...normalized.matchAll(/(\d+[.,]\d+|\d+)\s*km/gi)];
    if (kmMatches.length >= 2) {
      result.pickupDistance = parseFloat(kmMatches[0][1].replace(",", "."));
      result.tripDistance = parseFloat(kmMatches[1][1].replace(",", "."));
    } else if (kmMatches.length === 1) {
      result.tripDistance = parseFloat(kmMatches[0][1].replace(",", "."));
    }
  }

  // Fallback: bare min values
  if (result.pickupTime == null && result.tripTime == null) {
    const minMatches = [...normalized.matchAll(/(\d+)\s*min/gi)];
    if (minMatches.length >= 2) {
      result.pickupTime = parseInt(minMatches[0][1]);
      result.tripTime = parseInt(minMatches[1][1]);
    } else if (minMatches.length === 1) {
      result.tripTime = parseInt(minMatches[0][1]);
    }
  }

  // Addresses: lines after "od miejsca odbioru" / "przejazd"
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/od miejsca odbioru|podjazd|pickup/i.test(lines[i]) && lines[i + 1]) {
      result.pickupAddress = lines[i + 1];
    }
    if (/przejazd|kurs|trip/i.test(lines[i]) && lines[i + 1]) {
      result.destinationAddress = lines[i + 1];
    }
  }

  return result;
}
