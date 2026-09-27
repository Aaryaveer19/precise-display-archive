/**
 * Tiny localStorage wrapper used by the mock services.
 * Replace usage in api.ts with real REST calls when the backend is ready.
 */
const isBrowser = () => typeof window !== "undefined";

export function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function remove(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

export const KEYS = {
  token: "sf_token",
  user: "sf_user",
  farm: "sf_farm",
  readings: "sf_readings",
  lastResult: "sf_last_result",
};

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
