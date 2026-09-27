import type {
  FarmProfile,
  PredictionInput,
  PredictionResult,
  Reading,
  User,
} from "@/lib/types";
import { KEYS, delay, read, remove, write } from "./storage";
import { seedReadings } from "./mockData";

/**
 * Single API surface for the whole app. Every function below is a mock today
 * and maps 1:1 to a REST endpoint tomorrow, e.g.
 *   login()  -> POST /api/auth/login
 *   predict()-> POST /api/predict
 * UI components must never call fetch/axios directly.
 */

function currentUser(): User | null {
  return read<User | null>(KEYS.user, null);
}

function readings(): Reading[] {
  return read<Reading[]>(KEYS.readings, seedReadings);
}

export async function login(identifier: string, _password: string) {
  await delay(900);
  const existing = currentUser();
  const user: User = existing ?? {
    user_id: "u_1",
    name: "Ramesh Patil",
    phone: /^\d{10}$/.test(identifier) ? identifier : "9876543210",
    has_farm_profile: true,
  };
  write(KEYS.token, "mock.jwt.token");
  write(KEYS.user, user);
  if (!read<FarmProfile | null>(KEYS.farm, null) && user.has_farm_profile) {
    write<FarmProfile>(KEYS.farm, {
      user_id: user.user_id,
      location: "Mumbai, Maharashtra",
      latitude: 19.076,
      longitude: 72.8777,
      land_size: "4.5",
      soil_type: "Alluvial",
    });
  }
  return { token: "mock.jwt.token", user };
}

export async function signup(name: string, phone: string, _password: string) {
  await delay(1000);
  const user: User = {
    user_id: "u_" + Date.now(),
    name,
    phone,
    has_farm_profile: false,
  };
  write(KEYS.token, "mock.jwt.token");
  write(KEYS.user, user);
  write(KEYS.readings, []);
  remove(KEYS.farm);
  return { token: "mock.jwt.token", user };
}

export function logout() {
  remove(KEYS.token);
}

export async function getFarmProfile(): Promise<FarmProfile | null> {
  await delay(350);
  return read<FarmProfile | null>(KEYS.farm, null);
}

export async function saveFarmProfile(profile: FarmProfile): Promise<FarmProfile> {
  await delay(700);
  write(KEYS.farm, profile);
  const user = currentUser();
  if (user) write(KEYS.user, { ...user, has_farm_profile: true });
  return profile;
}

export async function updateUser(patch: Partial<User>): Promise<User> {
  await delay(500);
  const user = currentUser();
  const next = { ...(user as User), ...patch } as User;
  write(KEYS.user, next);
  return next;
}

export async function getReadings(): Promise<Reading[]> {
  await delay(600);
  return [...readings()].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function getLatestReading(): Promise<Reading | null> {
  await delay(450);
  const all = await getReadings();
  return all[0] ?? null;
}

export async function getReading(id: number): Promise<Reading | null> {
  await delay(400);
  return readings().find((r) => r.reading_id === id) ?? null;
}

export async function predict(input: PredictionInput): Promise<PredictionResult> {
  const response = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("Failed to fetch prediction");
  }
  const rawData = await response.json();

  const prediction = {
    crop: rawData.recommended_crop,
    crop_confidence: 0.92,
    fertilizer: rawData.recommended_fertilizer,
    fertilizer_confidence: 0.88,
    explanation: `Soil condition is ${rawData.soil_fertility}. Analysis shows N is ${rawData.nutrient_levels.N}, P is ${rawData.nutrient_levels.P}, K is ${rawData.nutrient_levels.K}, and pH is ${rawData.nutrient_levels.pH}. Best combination is ${rawData.recommended_crop} grown with ${rawData.recommended_fertilizer}.`
  };

  const all = readings();
  const reading_id = all.reduce((m, r) => Math.max(m, r.reading_id), 0) + 1;
  const reading: Reading = {
    reading_id,
    date: new Date().toISOString(),
    ...input,
    ...prediction,
  };
  write(KEYS.readings, [reading, ...all]);
  write(KEYS.lastResult, reading);
  return { ...prediction, reading_id };
}

export function getCachedResult(): Reading | null {
  return read<Reading | null>(KEYS.lastResult, null);
}

export { getWeather } from "./weatherService";
