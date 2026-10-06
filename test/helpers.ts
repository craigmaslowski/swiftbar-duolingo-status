import type { StreakView } from "../src/status.ts";

export const LA = "America/Los_Angeles";

/** A Date at the given wall-clock time in Los Angeles in October 2026 (PDT, UTC-7). */
export function laTime(date: string, time: string): Date {
  return new Date(`${date}T${time}-07:00`);
}

export function view(overrides: Partial<StreakView> = {}): StreakView {
  return {
    status: "pending",
    length: 1653,
    timeZone: LA,
    today: "2026-10-05",
    minutes: 19 * 60 + 5,
    msLeft: (4 * 60 + 55) * 60_000,
    ...overrides,
  };
}
