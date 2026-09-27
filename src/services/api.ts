import type {
  FarmProfile,
  PredictionInput,
  PredictionResult,
  Reading,
  User,
} from "@/lib/types";
import { supabase } from "../lib/supabase";

let _cachedResult: Reading | null = null;

/**
 * Modern API surface powered by Supabase Auth and Database
 */

export async function login(identifier: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier, // Assuming email is used instead of phone for simplicity here
    password,
  });
  if (error) throw error;

  // Transform to local User type
  const userObj = data.user;
  const { data: profileData } = await supabase.from("farm_profiles").select("*").eq("user_id", userObj?.id).single();

  const user: User = {
    user_id: userObj!.id,
    name: userObj!.user_metadata?.['name'] || "Farmer",
    email: userObj!.email || identifier,
    has_farm_profile: !!profileData,
  };

  return { token: data.session.access_token, user };
}

export async function signup(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      }
    }
  });
  if (error) throw error;

  const userObj = data.user;
  const user: User = {
    user_id: userObj!.id,
    name,
    email,
    has_farm_profile: false,
  };

  return { token: data.session?.access_token || "", user };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getFarmProfile(): Promise<FarmProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("farm_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data as FarmProfile;
}

export async function saveFarmProfile(profile: FarmProfile): Promise<FarmProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("farm_profiles")
    .upsert({
      user_id: user.id,
      location: profile.location,
      latitude: profile.latitude,
      longitude: profile.longitude,
      land_size: profile.land_size,
      soil_type: profile.soil_type,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmProfile;
}

export async function updateUser(patch: Partial<User>): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, ...patch }
  });

  if (error) throw error;
  return {
    user_id: data.user.id,
    name: data.user.user_metadata['name'],
    email: data.user.email || '',
    has_farm_profile: patch.has_farm_profile ?? false
  };
}

export async function getReadings(): Promise<Reading[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error || !data) return [];
  // map reading_id for UI mock mapping if needed, or just return data
  return data.map((row: any) => ({
    ...row,
    reading_id: parseInt(row.id.substring(0, 8), 16) % 10000 // Hash UUID just to satisfy old reading_id number type
  })) as Reading[];
}

export async function getLatestReading(): Promise<Reading | null> {
  const all = await getReadings();
  return all[0] ?? null;
}

export async function getReading(id: number): Promise<Reading | null> {
  const all = await getReadings();
  return all.find((r) => r.reading_id === id) ?? null;
}

export async function predict(input: PredictionInput): Promise<PredictionResult> {
  const { data: { user } } = await supabase.auth.getUser();

  const response = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) throw new Error("Failed to fetch prediction");
  const rawData = await response.json();

  const prediction = {
    crop: rawData.recommended_crop,
    crop_confidence: 0.92,
    fertilizer: rawData.recommended_fertilizer,
    fertilizer_confidence: 0.88,
    explanation: `Soil condition is ${rawData.soil_fertility}. Analysis shows N is ${rawData.nutrient_levels.N}, P is ${rawData.nutrient_levels.P}, K is ${rawData.nutrient_levels.K}, and pH is ${rawData.nutrient_levels.pH}. Best combination is ${rawData.recommended_crop} grown with ${rawData.recommended_fertilizer}.`
  };

  // If user is logged in, save reading to Supabase
  if (user) {
    await supabase.from("readings").insert({
      user_id: user.id,
      n: input.N,
      p: input.P,
      k: input.K,
      ph: input.ph,
      temperature: input.temperature,
      humidity: input.humidity,
      rainfall: input.rainfall,
      crop: prediction.crop,
      crop_confidence: prediction.crop_confidence,
      fertilizer: prediction.fertilizer,
      fertilizer_confidence: prediction.fertilizer_confidence,
      explanation: prediction.explanation
    });
  }

  _cachedResult = { ...input, ...prediction, reading_id: Math.floor(Math.random() * 1000), date: new Date().toISOString() };
  return { ...prediction, reading_id: _cachedResult.reading_id };
}

// Memory-based implementation for getting cached result
export function getCachedResult(): Reading | null {
  return _cachedResult;
}

export { getWeather } from "./weatherService";
