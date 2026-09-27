import type { Reading } from "@/lib/types";

export const seedReadings: Reading[] = [
  {
    reading_id: 3,
    date: "2026-09-27T08:15:00.000Z",
    N: 78,
    P: 45,
    K: 60,
    ph: 6.5,
    temperature: 28,
    humidity: 72,
    rainfall: 120,
    crop: "Rice",
    crop_confidence: 0.91,
    fertilizer: "Urea",
    fertilizer_confidence: 0.87,
    explanation:
      "Rice is recommended because the current soil nutrient levels, pH and weather conditions are suitable for rice cultivation.",
  },
  {
    reading_id: 2,
    date: "2026-09-25T06:40:00.000Z",
    N: 52,
    P: 38,
    K: 44,
    ph: 7.1,
    temperature: 31,
    humidity: 58,
    rainfall: 85,
    crop: "Maize",
    crop_confidence: 0.87,
    fertilizer: "DAP",
    fertilizer_confidence: 0.84,
    explanation:
      "Maize suits this field because nitrogen is moderate, the soil is slightly alkaline and rainfall is lower than rice needs.",
  },
  {
    reading_id: 1,
    date: "2026-09-18T07:05:00.000Z",
    N: 95,
    P: 62,
    K: 48,
    ph: 6.8,
    temperature: 24,
    humidity: 49,
    rainfall: 62,
    crop: "Wheat",
    crop_confidence: 0.89,
    fertilizer: "NPK 10-26-26",
    fertilizer_confidence: 0.82,
    explanation:
      "Wheat fits the cooler temperature, lower humidity and the good nitrogen and phosphorus levels measured in your soil.",
  },
];

const CROPS = [
  {
    crop: "Rice",
    fertilizer: "Urea",
    why: "soil nutrient levels, pH and the high rainfall suit paddy cultivation",
  },
  {
    crop: "Maize",
    fertilizer: "DAP",
    why: "moderate nitrogen, warm temperature and medium rainfall favour maize",
  },
  {
    crop: "Wheat",
    fertilizer: "NPK 10-26-26",
    why: "cooler temperature, lower humidity and balanced nutrients favour wheat",
  },
  {
    crop: "Cotton",
    fertilizer: "Ammonium Sulphate",
    why: "high potassium with warm, drier conditions suits cotton",
  },
  {
    crop: "Chickpea",
    fertilizer: "Single Super Phosphate",
    why: "low rainfall with good phosphorus is well suited to chickpea",
  },
];

/** Deterministic mock "model" so results vary with the inputs. */
export function mockPredict(input: {
  N: number;
  P: number;
  K: number;
  ph: number;
  temperature: number;
  humidity: number;
  rainfall: number;
}) {
  const score = Math.round(input.N + input.rainfall / 2 + input.humidity / 3 + input.K / 4);
  const pick = CROPS[score % CROPS.length]!;
  const cropConfidence = 0.78 + ((score % 17) / 100) * 1.2;
  const fertConfidence = cropConfidence - 0.03 - (score % 5) / 100;
  return {
    crop: pick.crop,
    crop_confidence: Math.min(0.97, Number(cropConfidence.toFixed(2))),
    fertilizer: pick.fertilizer,
    fertilizer_confidence: Math.min(0.95, Number(fertConfidence.toFixed(2))),
    explanation: `${pick.crop} is recommended because the ${pick.why}. Applying ${pick.fertilizer} will help balance the nutrients measured in this reading.`,
  };
}
