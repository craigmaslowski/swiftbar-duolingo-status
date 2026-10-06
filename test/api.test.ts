import { describe, expect, it, vi } from "vitest";
import { fetchStreak, parseStreak } from "../src/api.ts";
import fixture from "./fixtures/user.json" with { type: "json" };

describe("parseStreak", () => {
  it("parses the fixture", () => {
    expect(parseStreak(fixture, "KingsKraken")).toEqual({ length: 1653, endDate: "2026-10-05", timeZone: undefined });
  });

  it("reads updatedTimeZone when present", () => {
    const json = structuredClone(fixture) as any;
    json.users[0].streakData.updatedTimeZone = "America/Los_Angeles";
    expect(parseStreak(json, "x").timeZone).toBe("America/Los_Angeles");
  });

  it("treats a null currentStreak as no streak", () => {
    const json = { users: [{ streakData: { currentStreak: null } }] };
    expect(parseStreak(json, "x")).toEqual({ length: 0, endDate: null, timeZone: undefined });
  });

  it("throws for an unknown user", () => {
    expect(() => parseStreak({ users: [] }, "nobody")).toThrow('user "nobody" not found');
  });

  it("throws when streakData is missing", () => {
    expect(() => parseStreak({ users: [{}] }, "x")).toThrow("missing streakData");
  });
});

describe("fetchStreak", () => {
  it("requests the user and parses the body", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    await expect(fetchStreak("Kings Kraken", fetchImpl as typeof fetch)).resolves.toMatchObject({ length: 1653 });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://www.duolingo.com/2017-06-30/users?username=Kings%20Kraken",
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": expect.any(String) }) }),
    );
  });

  it("throws on HTTP errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(fetchStreak("x", fetchImpl as typeof fetch)).rejects.toThrow("HTTP 503");
  });
});
