import { describe, expect, it } from "vitest";
import { computeStatus } from "../src/status.ts";
import { LA, laTime } from "./helpers.ts";

const noon = laTime("2026-10-05", "12:00:00");

describe("computeStatus", () => {
  it("is complete when endDate is today", () => {
    expect(computeStatus({ length: 1653, endDate: "2026-10-05" }, noon, LA).status).toBe("complete");
  });

  it("is pending when endDate is yesterday", () => {
    const v = computeStatus({ length: 1653, endDate: "2026-10-04" }, noon, LA);
    expect(v).toMatchObject({ status: "pending", length: 1653, today: "2026-10-05", minutes: 720 });
    expect(v.msLeft).toBe(12 * 60 * 60_000);
  });

  it("is broken when endDate is older than yesterday", () => {
    expect(computeStatus({ length: 1653, endDate: "2026-10-03" }, noon, LA).status).toBe("broken");
  });

  it("is broken with length 0 when there is no current streak", () => {
    expect(computeStatus({ length: 0, endDate: null }, noon, LA)).toMatchObject({ status: "broken", length: 0 });
  });

  it("flips from complete to pending at midnight", () => {
    const streak = { length: 1653, endDate: "2026-10-05" };
    expect(computeStatus(streak, laTime("2026-10-05", "23:59:59"), LA).status).toBe("complete");
    expect(computeStatus(streak, laTime("2026-10-06", "00:00:01"), LA).status).toBe("pending");
  });

  it("prefers the streak timezone over the fallback", () => {
    // 21:00 in LA is already the next day in Tokyo.
    const now = laTime("2026-10-05", "21:00:00");
    const v = computeStatus({ length: 5, endDate: "2026-10-05", timeZone: LA }, now, "Asia/Tokyo");
    expect(v).toMatchObject({ status: "complete", timeZone: LA, today: "2026-10-05" });
  });

  it("uses the fallback timezone when the streak has none", () => {
    const now = laTime("2026-10-05", "21:00:00");
    const v = computeStatus({ length: 5, endDate: "2026-10-05" }, now, "Asia/Tokyo");
    expect(v).toMatchObject({ status: "pending", timeZone: "Asia/Tokyo", today: "2026-10-06" });
  });
});
