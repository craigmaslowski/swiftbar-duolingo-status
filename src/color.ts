import type { Status } from "./status.ts";

export const COLORS = {
  green: "#58CC02",
  grey: "#8E8E93",
  yellow: "#FFC800",
  orange: "#FF9600",
  red: "#FF4B4B",
  lightBlue: "#84D8FF",
} as const;

/** Gradient stops for a pending streak, in minutes since midnight. Grey before the first stop. */
export const GRADIENT_STOPS: ReadonlyArray<{ minutes: number; color: string }> = [
  { minutes: 17 * 60, color: COLORS.yellow },
  { minutes: 19 * 60, color: COLORS.orange },
  { minutes: 21 * 60, color: COLORS.red },
];

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0").toUpperCase()).join("");
}

function mix(a: string, b: string, t: number): string {
  const ra = toRgb(a);
  const rb = toRgb(b);
  return toHex([0, 1, 2].map((i) => ra[i]! + (rb[i]! - ra[i]!) * t) as [number, number, number]);
}

/** Color for a pending streak at the given time of day. */
export function colorAt(minutes: number): string {
  const first = GRADIENT_STOPS[0]!;
  if (minutes < first.minutes) return COLORS.grey;

  for (let i = 1; i < GRADIENT_STOPS.length; i++) {
    const from = GRADIENT_STOPS[i - 1]!;
    const to = GRADIENT_STOPS[i]!;
    if (minutes < to.minutes) {
      return mix(from.color, to.color, (minutes - from.minutes) / (to.minutes - from.minutes));
    }
  }
  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1]!.color;
}

export function colorFor(status: Status, minutes: number): string {
  switch (status) {
    case "complete":
      return COLORS.green;
    case "broken":
      return COLORS.lightBlue;
    case "pending":
      return colorAt(minutes);
  }
}
