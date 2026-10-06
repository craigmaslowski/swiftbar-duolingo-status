import { describe, expect, it } from "vitest";
import { addDays, formatTimeLeft, msUntilMidnight, zonedTime } from "../src/time.ts";
import { LA, laTime } from "./helpers.ts";

describe("formatTimeLeft", () => {
  it.each([
    [(2 * 60 + 14) * 60_000, "2h 14m"],
    [59 * 60_000 + 59_999, "59m"],
    [30_000, "0m"],
    [0, "0m"],
    [60 * 60_000, "1h 0m"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatTimeLeft(ms)).toBe(expected);
  });
});

describe("zonedTime", () => {
  it("reports date and minutes in the given zone", () => {
    const now = laTime("2026-10-05", "21:30:30");
    expect(zonedTime(now, LA)).toEqual({ date: "2026-10-05", minutes: 21 * 60 + 30.5 });
    expect(zonedTime(now, "Asia/Tokyo").date).toBe("2026-10-06");
  });
});

describe("msUntilMidnight", () => {
  it("counts down to midnight in the zone", () => {
    expect(msUntilMidnight(laTime("2026-10-05", "21:46:00"), LA)).toBe((2 * 60 + 14) * 60_000);
    expect(msUntilMidnight(laTime("2026-10-05", "23:59:59"), LA)).toBe(1000);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});
