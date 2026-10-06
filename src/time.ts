export interface ZonedTime {
  /** Calendar date in the zone, `YYYY-MM-DD`. */
  date: string;
  /** Minutes since local midnight in the zone, including fractional seconds. */
  minutes: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function zonedTime(now: Date, timeZone: string): ZonedTime {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60,
  };
}

/**
 * Milliseconds until the next midnight in the zone. Uses wall-clock time, which
 * is exact unless a DST transition falls between now and midnight (US/EU zones
 * transition in the early morning, so evenings are unaffected).
 */
export function msUntilMidnight(now: Date, timeZone: string): number {
  const { minutes } = zonedTime(now, timeZone);
  const ms = (24 * 60 - minutes) * 60_000 - now.getMilliseconds();
  return Math.max(0, Math.round(ms));
}

/** Shift a `YYYY-MM-DD` date by whole days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** `2h 14m` when an hour or more is left, otherwise `14m`. Minutes round down. */
export function formatTimeLeft(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
