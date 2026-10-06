import { describe, expect, it } from "vitest";
import { dueSlot, notificationText, recordSent } from "../src/notify.ts";
import { view } from "./helpers.ts";

const atMinutes = (h: number, m = 0) => view({ minutes: h * 60 + m });

describe("dueSlot", () => {
  it("returns nothing before 19:00", () => {
    expect(dueSlot(atMinutes(18, 59), null)).toBeNull();
  });

  it("fires 19:00 at 19:05, then not again at 19:15", () => {
    const v = atMinutes(19, 5);
    expect(dueSlot(v, null)).toBe("19:00");
    const state = recordSent(v, null, "19:00");
    expect(dueSlot(atMinutes(19, 15), state)).toBeNull();
  });

  it("only sends the latest slot after waking late", () => {
    const v = atMinutes(20, 30);
    expect(dueSlot(v, null)).toBe("20:00");
    expect(dueSlot(atMinutes(20, 40), recordSent(v, null, "20:00"))).toBeNull();
  });

  it("fires 21:00 after earlier slots were sent", () => {
    const state = { date: "2026-10-05", sent: ["19:00", "20:00"] };
    expect(dueSlot(atMinutes(21), state)).toBe("21:00");
    expect(dueSlot(atMinutes(23, 50), { ...state, sent: [...state.sent, "21:00"] })).toBeNull();
  });

  it("does not fire when complete or broken", () => {
    expect(dueSlot(view({ status: "complete", minutes: 20 * 60 }), null)).toBeNull();
    expect(dueSlot(view({ status: "broken", minutes: 20 * 60 }), null)).toBeNull();
  });

  it("ignores state from a previous day", () => {
    const old = { date: "2026-10-04", sent: ["19:00", "20:00", "21:00"] };
    expect(dueSlot(atMinutes(19, 5), old)).toBe("19:00");
    expect(recordSent(atMinutes(19, 5), old, "19:00")).toEqual({ date: "2026-10-05", sent: ["19:00"] });
  });
});

describe("notificationText", () => {
  it("includes streak length and time left", () => {
    expect(notificationText(view({ msLeft: (4 * 60 + 55) * 60_000 }))).toEqual({
      title: "Duolingo streak at risk",
      body: "1653-day streak — 4h 55m left",
    });
  });
});
