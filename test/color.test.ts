import { describe, expect, it } from "vitest";
import { COLORS, colorAt, colorFor } from "../src/color.ts";

const at = (h: number, m = 0) => colorAt(h * 60 + m);

describe("colorAt", () => {
  it("is grey before 17:00", () => {
    expect(at(0)).toBe(COLORS.grey);
    expect(at(16, 59)).toBe(COLORS.grey);
  });

  it("hits each stop exactly", () => {
    expect(at(17)).toBe(COLORS.yellow);
    expect(at(19)).toBe(COLORS.orange);
    expect(at(21)).toBe(COLORS.red);
  });

  it("interpolates between stops", () => {
    // Halfway between #FFC800 and #FF9600, and between #FF9600 and #FF4B4B.
    expect(at(18)).toBe("#FFAF00");
    expect(at(20)).toBe("#FF7126");
  });

  it("stays red until midnight", () => {
    expect(at(23, 59)).toBe(COLORS.red);
  });
});

describe("colorFor", () => {
  it("maps statuses", () => {
    expect(colorFor("complete", 22 * 60)).toBe(COLORS.green);
    expect(colorFor("broken", 22 * 60)).toBe(COLORS.lightBlue);
    expect(colorFor("pending", 22 * 60)).toBe(COLORS.red);
  });
});
