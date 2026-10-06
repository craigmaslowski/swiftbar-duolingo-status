import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { NotifyState } from "./notify.ts";
import type { StreakInfo } from "./status.ts";

export interface CachedStreak {
  username: string;
  fetchedAt: string;
  streak: StreakInfo;
}

export function dataDir(): string {
  return (
    process.env.SWIFTBAR_PLUGIN_DATA_PATH ??
    join(homedir(), "Library", "Caches", "swiftbar-duolingo-status")
  );
}

async function readJson<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(dataDir(), name), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(name: string, data: unknown): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), JSON.stringify(data, null, 2));
}

export const readCache = () => readJson<CachedStreak>("cache.json");
export const writeCache = (data: CachedStreak) => writeJson("cache.json", data);
export const readNotifyState = () => readJson<NotifyState>("notify-state.json");
export const writeNotifyState = (data: NotifyState) => writeJson("notify-state.json", data);
