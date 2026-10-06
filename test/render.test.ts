import { describe, expect, it } from "vitest";
import { render, sfconfig } from "../src/render.ts";
import { LA, laTime, view } from "./helpers.ts";

const dropdown = "Open Duolingo | href=https://www.duolingo.com/learn\nRefresh | refresh=true\n";

describe("sfconfig", () => {
  it("encodes a single-color palette symbol config", () => {
    expect(JSON.parse(Buffer.from(sfconfig("#58CC02"), "base64").toString())).toEqual({
      renderingMode: "Palette",
      colors: ["#58CC02"],
      scale: "large",
    });
  });
});

describe("render", () => {
  it("complete: green count, no countdown", () => {
    expect(render({ kind: "ok", view: view({ status: "complete" }) })).toBe(
      `1653 | sfimage=flame.fill sfconfig=${sfconfig("#58CC02")} color=#58CC02\n---\n` + dropdown,
    );
  });

  it("pending: gradient color with time left", () => {
    const v = view({ minutes: 19 * 60, msLeft: (2 * 60 + 14) * 60_000 });
    expect(render({ kind: "ok", view: v })).toBe(
      `1653 · 2h 14m | sfimage=flame.fill sfconfig=${sfconfig("#FF9600")} color=#FF9600\n---\n` + dropdown,
    );
  });

  it("broken: light blue", () => {
    expect(render({ kind: "ok", view: view({ status: "broken", length: 0 }) })).toBe(
      `0 | sfimage=flame.fill sfconfig=${sfconfig("#84D8FF")} color=#84D8FF\n---\n` + dropdown,
    );
  });

  it("stale: warning prefix and last-updated line", () => {
    const v = view({ minutes: 21 * 60, msLeft: 3 * 60 * 60_000 });
    const out = render({
      kind: "ok",
      view: v,
      stale: { fetchedAt: laTime("2026-10-05", "20:40:00"), error: "fetch failed: timeout" },
    });
    expect(out).toBe(
      `⚠︎ 1653 · 3h 0m | sfimage=flame.fill sfconfig=${sfconfig("#FF4B4B")} color=#FF4B4B\n---\n` +
        "Last updated 8:40 PM — fetch failed: timeout | color=gray\n" +
        dropdown,
    );
  });

  it("stale from a previous day includes the date", () => {
    const out = render({
      kind: "ok",
      view: view(),
      stale: { fetchedAt: laTime("2026-10-04", "20:40:00"), error: "x" },
    });
    expect(out).toContain("Last updated Oct 4, 8:40 PM — x | color=gray");
  });

  it("error without cache: grey warning, sanitized message", () => {
    expect(render({ kind: "error", error: "fetch failed: bad | thing\nhere", timeZone: LA })).toBe(
      `⚠︎ | sfimage=flame.fill sfconfig=${sfconfig("#8E8E93")} color=#8E8E93\n---\n` +
        "fetch failed: bad thing here | color=gray\n" +
        dropdown,
    );
  });
});
