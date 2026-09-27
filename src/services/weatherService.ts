import type { Weather } from "@/lib/types";
import { delay } from "./storage";

/**
 * Weather is isolated here so it can later call our own backend endpoint
 * (React -> Backend -> Weather provider) without touching any UI component.
 * Later: return (await fetch(`/api/weather?lat=${lat}&lon=${lon}`)).json()
 */
export async function getWeather(location = "Mumbai, Maharashtra"): Promise<Weather> {
  await delay(1100);

  if (Math.random() < 0.08) {
    throw new Error("WEATHER_UNAVAILABLE");
  }

  const jitter = (base: number, spread: number) =>
    Number((base + (Math.random() * 2 - 1) * spread).toFixed(1));

  return {
    temperature: jitter(28, 2),
    humidity: Math.round(jitter(72, 6)),
    rainfall: Math.round(jitter(120, 20)),
    location,
    fetched_at: new Date().toISOString(),
  };
}
