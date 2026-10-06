import { addDays, msUntilMidnight, zonedTime } from "./time.ts";

export type Status = "complete" | "pending" | "broken";

export interface StreakInfo {
  /** 0 when there is no active streak. */
  length: number;
  /** Last day the streak was extended (`YYYY-MM-DD`), or null with no active streak. */
  endDate: string | null;
  /** Streak timezone reported by Duolingo, when present. */
  timeZone?: string;
}

export interface StreakView {
  status: Status;
  length: number;
  timeZone: string;
  /** Today's date in the streak timezone. */
  today: string;
  /** Minutes since midnight in the streak timezone. */
  minutes: number;
  msLeft: number;
}

export function computeStatus(streak: StreakInfo, now: Date, fallbackTimeZone: string): StreakView {
  const timeZone = streak.timeZone ?? fallbackTimeZone;
  const { date: today, minutes } = zonedTime(now, timeZone);
  const yesterday = addDays(today, -1);

  let status: Status;
  if (streak.endDate === null || streak.endDate < yesterday) {
    status = "broken";
  } else if (streak.endDate >= today) {
    // `>` only happens if Duolingo's day boundary is ahead of ours; it's still done.
    status = "complete";
  } else {
    status = "pending";
  }

  return {
    status,
    length: status === "broken" && streak.endDate === null ? 0 : streak.length,
    timeZone,
    today,
    minutes,
    msLeft: msUntilMidnight(now, timeZone),
  };
}
