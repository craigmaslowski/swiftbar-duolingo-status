import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import type { StreakView } from "./status.ts";
import { formatTimeLeft } from "./time.ts";

const run = promisify(execFile);

/** Reminder times in the streak timezone, `HH:MM`, ascending. */
export const NOTIFY_SLOTS = ["19:00", "20:00", "21:00"] as const;

export interface NotifyState {
  date: string;
  sent: string[];
}

function slotMinutes(slot: string): number {
  const [h, m] = slot.split(":").map(Number);
  return h! * 60 + m!;
}

/**
 * The slot to notify for now, or null. Only the latest passed slot is
 * considered, so waking from sleep late sends one reminder, not a backlog.
 */
export function dueSlot(view: StreakView, state: NotifyState | null): string | null {
  if (view.status !== "pending") return null;

  const passed = NOTIFY_SLOTS.filter((s) => slotMinutes(s) <= view.minutes);
  const latest = passed[passed.length - 1];
  if (!latest) return null;

  const sentToday = state?.date === view.today ? state.sent : [];
  return sentToday.includes(latest) ? null : latest;
}

export function recordSent(view: StreakView, state: NotifyState | null, slot: string): NotifyState {
  const sent = state?.date === view.today ? state.sent : [];
  return { date: view.today, sent: [...sent, slot] };
}

export function notificationText(view: StreakView): { title: string; body: string } {
  return {
    title: "Duolingo streak at risk",
    body: `${view.length}-day streak — ${formatTimeLeft(view.msLeft)} left`,
  };
}

/** Post via SwiftBar's URL scheme, falling back to AppleScript. */
export async function sendNotification(title: string, body: string): Promise<void> {
  const pluginId = basename(process.env.SWIFTBAR_PLUGIN_PATH ?? "duolingo-status.js");
  const params = new URLSearchParams({ plugin: pluginId, title, body });
  try {
    await run("open", ["-g", `swiftbar://notify?${params.toString().replace(/\+/g, "%20")}`], { timeout: 5000 });
  } catch {
    const script = `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`;
    await run("osascript", ["-e", script], { timeout: 5000 });
  }
}
