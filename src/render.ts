import { COLORS, colorFor } from "./color.ts";
import type { StreakView } from "./status.ts";
import { formatTimeLeft, zonedTime } from "./time.ts";

export const DUOLINGO_URL = "https://www.duolingo.com/learn";
const WARNING = "⚠︎";

export type RenderInput =
  | { kind: "ok"; view: StreakView; stale?: { fetchedAt: Date; error: string } }
  | { kind: "error"; error: string; timeZone: string };

/** Keep free text from breaking SwiftBar's `text | params` line format. */
function sanitize(text: string): string {
  return text.replace(/[|\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

function line(text: string, params: Record<string, string>): string {
  const p = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  return `${text} | ${p}`;
}

/**
 * SwiftBar ignores `sfcolor` for `sfimage` icons; their color comes only from
 * `sfconfig`, a base64 JSON symbol configuration.
 */
export function sfconfig(color: string): string {
  const config = { renderingMode: "Palette", colors: [color], scale: "large" };
  return Buffer.from(JSON.stringify(config)).toString("base64");
}

function menuBarLine(text: string, color: string): string {
  return line(text, { sfimage: "flame.fill", sfconfig: sfconfig(color), color });
}

function formatFetchedAt(fetchedAt: Date, timeZone: string, today: string): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone, hour: "numeric", minute: "2-digit" };
  if (zonedTime(fetchedAt, timeZone).date !== today) {
    opts.month = "short";
    opts.day = "numeric";
  }
  return new Intl.DateTimeFormat("en-US", opts).format(fetchedAt);
}

export function render(input: RenderInput): string {
  const lines: string[] = [];

  if (input.kind === "error") {
    lines.push(menuBarLine(WARNING, COLORS.grey), "---");
    lines.push(line(sanitize(input.error), { color: "gray" }));
  } else {
    const { view, stale } = input;
    let text = String(view.length);
    if (view.status === "pending") text += ` · ${formatTimeLeft(view.msLeft)}`;
    if (stale) text = `${WARNING} ${text}`;

    lines.push(menuBarLine(text, colorFor(view.status, view.minutes)), "---");
    if (stale) {
      const at = formatFetchedAt(stale.fetchedAt, view.timeZone, view.today);
      lines.push(line(`Last updated ${at} — ${sanitize(stale.error)}`, { color: "gray" }));
    }
  }

  lines.push(line("Open Duolingo", { href: DUOLINGO_URL }));
  lines.push(line("Refresh", { refresh: "true" }));
  return lines.join("\n") + "\n";
}
