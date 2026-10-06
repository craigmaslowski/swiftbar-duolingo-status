import { fetchStreak } from "./api.ts";
import { readCache, readNotifyState, writeCache, writeNotifyState } from "./cache.ts";
import { dueSlot, notificationText, recordSent, sendNotification } from "./notify.ts";
import { render, type RenderInput } from "./render.ts";
import { computeStatus, type StreakInfo, type StreakView } from "./status.ts";
import { localTimeZone } from "./time.ts";

const DEFAULT_USERNAME = "KingsKraken";

function message(err: unknown): string {
  if (err instanceof Error) {
    return err.name === "TimeoutError" ? "fetch failed: timeout" : `fetch failed: ${err.message}`;
  }
  return `fetch failed: ${String(err)}`;
}

async function maybeNotify(view: StreakView): Promise<void> {
  const state = await readNotifyState();
  const slot = dueSlot(view, state);
  if (!slot) return;
  const { title, body } = notificationText(view);
  await sendNotification(title, body);
  await writeNotifyState(recordSent(view, state, slot));
}

async function run(now: Date): Promise<RenderInput> {
  const username = process.env.DUOLINGO_USERNAME || DEFAULT_USERNAME;
  const tz = localTimeZone();

  let streak: StreakInfo;
  let stale: { fetchedAt: Date; error: string } | undefined;
  try {
    streak = await fetchStreak(username);
    await writeCache({ username, fetchedAt: now.toISOString(), streak }).catch(() => {});
  } catch (err) {
    const error = message(err);
    const cached = await readCache();
    if (cached?.username !== username) return { kind: "error", error, timeZone: tz };
    streak = cached.streak;
    stale = { fetchedAt: new Date(cached.fetchedAt), error };
  }

  const view = computeStatus(streak, now, tz);
  await maybeNotify(view).catch(() => {});
  return { kind: "ok", view, stale };
}

// Always print valid SwiftBar output and exit 0.
const output = await run(new Date())
  .then(render)
  .catch((err) => render({ kind: "error", error: `error: ${String(err)}`, timeZone: localTimeZone() }));
process.stdout.write(output);
