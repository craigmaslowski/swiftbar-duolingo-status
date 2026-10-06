import type { StreakInfo } from "./status.ts";

const API_URL = "https://www.duolingo.com/2017-06-30/users";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const TIMEOUT_MS = 10_000;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Extract streak fields from the users API response. Throws on unexpected shapes. */
export function parseStreak(json: unknown, username: string): StreakInfo {
  const users = isObject(json) ? json.users : undefined;
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error(`user "${username}" not found`);
  }

  const streakData = isObject(users[0]) ? users[0].streakData : undefined;
  if (!isObject(streakData)) throw new Error("response missing streakData");

  const timeZone = typeof streakData.updatedTimeZone === "string" ? streakData.updatedTimeZone : undefined;
  const current = streakData.currentStreak;
  if (current === null || current === undefined) {
    return { length: 0, endDate: null, timeZone };
  }
  if (!isObject(current) || typeof current.length !== "number" || typeof current.endDate !== "string") {
    throw new Error("response has malformed currentStreak");
  }
  return { length: current.length, endDate: current.endDate, timeZone };
}

export async function fetchStreak(username: string, fetchImpl: typeof fetch = fetch): Promise<StreakInfo> {
  const url = `${API_URL}?username=${encodeURIComponent(username)}`;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseStreak(await res.json(), username);
}
