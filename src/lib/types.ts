export interface User {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  has_farm_profile: boolean;
}

export interface FarmProfile {
  user_id: string;
  location: string;
  latitude: number;
  longitude: number;
  land_size: string;
  soil_type: string;
}

export interface Reading {
  reading_id: number;
  date: string;
  N: number;
  P: number;
  K: number;
  ph: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  crop: string;
  crop_confidence: number;
  fertilizer: string;
  fertilizer_confidence: number;
  explanation: string;
}

export interface Weather {
  temperature: number;
  humidity: number;
  rainfall: number;
  location: string;
  fetched_at: string;
}

export interface PredictionInput {
  N: number;
  P: number;
  K: number;
  ph: number;
  temperature: number;
  humidity: number;
  rainfall: number;
}

export interface PredictionResult {
  crop: string;
  crop_confidence: number;
  fertilizer: string;
  fertilizer_confidence: number;
  explanation: string;
  reading_id: number;
}

export const SOIL_TYPES = [
  "Alluvial",
  "Black",
  "Red",
  "Laterite",
  "Arid",
  "Mountain",
  "Not sure",
] as const;

/** Provisional validation ranges — to be verified against the ML training dataset. */
export const FIELD_RANGES = {
  N: { min: 0, max: 140, label: "Nitrogen (N)", unit: "kg/ha" },
  P: { min: 5, max: 145, label: "Phosphorus (P)", unit: "kg/ha" },
  K: { min: 5, max: 205, label: "Potassium (K)", unit: "kg/ha" },
  ph: { min: 3.5, max: 9.9, label: "Soil pH", unit: "" },
  temperature: { min: 8, max: 45, label: "Temperature", unit: "°C" },
  humidity: { min: 14, max: 100, label: "Humidity", unit: "%" },
  rainfall: { min: 20, max: 300, label: "Rainfall", unit: "mm" },
} as const;

export type FieldKey = keyof typeof FIELD_RANGES;

export const CROP_EMOJI: Record<string, string> = {
  Rice: "🌾",
  Wheat: "🌾",
  Maize: "🌽",
  Cotton: "🌱",
  Sugarcane: "🎋",
  Chickpea: "🫘",
  Banana: "🍌",
};
