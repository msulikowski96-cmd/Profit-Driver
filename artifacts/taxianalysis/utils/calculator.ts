import { Settings } from "@/context/SettingsContext";

export interface RideData {
  price: number;
  pickupDistance: number;
  tripDistance: number;
  estimatedTime: number;
}

export interface CalculationResult {
  totalDistance: number;
  pricePerKm: number;
  pricePerHour: number;
  estimatedProfit: number;
  isProfitable: boolean;
  profitabilityScore: number;
}

export function calculateRide(
  ride: RideData,
  settings: Settings
): CalculationResult {
  const totalDistance = ride.pickupDistance + ride.tripDistance;
  const pricePerKm = totalDistance > 0 ? ride.price / totalDistance : 0;
  const pricePerHour =
    ride.estimatedTime > 0 ? (ride.price / ride.estimatedTime) * 60 : 0;
  const fuelCost = totalDistance * settings.fuelCostPerKm;
  const estimatedProfit = ride.price - fuelCost;

  const kmOk = pricePerKm >= settings.minPricePerKm;
  const hourOk = pricePerHour >= settings.minPricePerHour;
  const isProfitable = kmOk && hourOk;

  const kmScore = Math.min((pricePerKm / settings.minPricePerKm) * 50, 100);
  const hourScore = Math.min(
    (pricePerHour / settings.minPricePerHour) * 50,
    100
  );
  const profitabilityScore = Math.round((kmScore + hourScore) / 2);

  return {
    totalDistance,
    pricePerKm,
    pricePerHour,
    estimatedProfit,
    isProfitable,
    profitabilityScore,
  };
}

export function parseRideText(text: string): Partial<RideData> {
  const result: Partial<RideData> = {};

  // price: "21,59 zł" or "21.59 zł"
  const priceMatch = text.match(
    /(\d+[.,]\d+|\d+)\s*z[łl]/i
  );
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1].replace(",", "."));
  }

  // distances: "16.9 km" or "4,8 km"
  const kmMatches = text.match(/(\d+[.,]\d+|\d+)\s*km/gi);
  if (kmMatches && kmMatches.length >= 1) {
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

  // time: "21 min" or "8 min"
  const timeMatches = text.match(/(\d+)\s*min/gi);
  if (timeMatches && timeMatches.length > 0) {
    const times = timeMatches.map((m) => {
      const num = m.match(/(\d+)/);
      return num ? parseInt(num[1]) : 0;
    });
    // pick the last time mention (trip time), sum all or use trip-specific
    result.estimatedTime = times.reduce((a, b) => a + b, 0);
  }

  return result;
}
