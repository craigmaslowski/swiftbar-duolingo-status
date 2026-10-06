# Spec: Duolingo Streak Menu Bar Item (SwiftBar)

- **Date:** 2026-10-05
- **Status:** Implemented
- **Author:** Craig Maslowski

## 1. Summary

A SwiftBar plugin, written in TypeScript and run on Node, that shows in the macOS menu bar whether today's Duolingo streak has been extended. The color shifts from grey through yellow, orange, and red as midnight approaches. It turns green once the day's lesson is done and light blue if the streak is broken. The plugin also sends macOS notifications at 7, 8, and 9 PM if the streak hasn't been extended yet.

## 2. Goals / Non-goals

**Goals**
- See at a glance whether today's streak is done.
- Make the urgency clear as the deadline gets closer, using color and a countdown.
- Send reminder notifications in the evening.
- Allow the username to be configured.
- Keep working when the network fails, using cached data.

**Non-goals (v1)**
- Logging in or reading any private or authenticated Duolingo data.
- Tracking multiple users.
- Showing XP, leagues, or anything other than the streak.

## 3. Data source

`GET https://www.duolingo.com/2017-06-30/users?username={username}`

Public and unauthenticated. The plugin reads only these fields from `users[0]`:

| Field | Use |
|---|---|
| `streakData.currentStreak.length` | Streak count shown in the menu bar |
| `streakData.currentStreak.endDate` | `YYYY-MM-DD`. The last day the streak was extended |
| `streakData.updatedTimeZone` | IANA timezone used to define "today" and "midnight" (e.g. `America/Los_Angeles`) |

Notes:
- `currentStreak` may be `null` when there is no active streak. Treat that as **broken**.
- `users` may be empty if the username is wrong. Treat that as an error.
- If `updatedTimeZone` is missing, fall back to the Mac's local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
  - **Observed 2026-10-05:** the unauthenticated response contains only `streakData.currentStreak`. `updatedTimeZone` is absent, so in practice the local timezone is used.
- Send a normal browser-like `User-Agent` header, in case the API rejects Node's default.
- Request timeout: 10 seconds.

## 4. Status model

All date and time math is done in the streak timezone (`tz`) using `Intl.DateTimeFormat`. No date library is used.

Let `today` be the current date in `tz`, `yesterday` be `today - 1 day`, and `msLeft` be the time from now until the next midnight in `tz`.

| Condition | Status |
|---|---|
| `endDate === today` | `complete` |
| `endDate === yesterday` | `pending` (the streak is alive but needs a lesson today) |
| `currentStreak` is null, or `endDate < yesterday` | `broken` |

### 4.1 Colors

These are taken from Duolingo's brand palette.

| Name | Hex | Used for |
|---|---|---|
| Green | `#58CC02` | `complete` |
| Grey | `#8E8E93` | `pending` before 17:00 |
| Yellow | `#FFC800` | Gradient stop |
| Orange | `#FF9600` | Gradient stop |
| Red | `#FF4B4B` | Gradient stop |
| Light blue | `#84D8FF` | `broken` (matches Duolingo's color for missed or frozen days) |

**Gradient for `pending`.** The color is based on the local time in `tz` and interpolated linearly in RGB between these stops:

| Time | Color |
|---|---|
| 00:00 – 17:00 | Grey (solid) |
| 17:00 | Switches straight to Yellow |
| 17:00 → 19:00 | Yellow → Orange |
| 19:00 → 21:00 | Orange → Red |
| 21:00 – 24:00 | Red (solid) |

The gradient is a pure function `colorAt(minutesSinceMidnight) → hex` with the stops defined in one constant table.

## 5. Menu bar output

The color is applied to both the text (`color=`) and the icon. The icon is the SF Symbol `flame.fill`. SwiftBar ignores `sfcolor=` for `sfimage=` icons, so the icon color is set with `sfconfig=`. That's base64-encoded JSON: `{"renderingMode":"Palette","colors":["<hex>"],"scale":"large"}`.

| Status | Menu bar text | Example |
|---|---|---|
| `complete` | `{length}` | `1653` (green) |
| `pending` | `{length} · {timeLeft}` | `1653 · 2h 14m` (gradient) |
| `broken` | `{length}` (or `0` if null) | `0` (light blue) |
| stale (see §8) | Same as above, prefixed with `⚠︎` | `⚠︎ 1653 · 2h 14m` |
| error, no cache | `⚠︎` | Grey |

**`timeLeft` format:** `Xh Ym` when an hour or more is left, `Ym` when less than an hour is left. Minutes are rounded down. Example line:

```
1653 · 2h 14m | sfimage=flame.fill sfconfig=<base64> color=#FF9600
```

## 6. Dropdown

```
---
Open Duolingo | href=https://www.duolingo.com/learn
Refresh | refresh=true
```

When the data is stale or there's an error, an extra line appears at the top of the dropdown, e.g. `Last updated 8:40 PM — fetch failed: timeout | color=gray`.

## 7. Notifications

Notifications fire at **19:00, 20:00, and 21:00** in the streak timezone, and only while the status is `pending`.

- **Mechanism:** The plugin opens SwiftBar's URL scheme: `open -g "swiftbar://notify?plugin=<pluginId>&title=...&body=..."`. The notification then shows up as coming from SwiftBar, without needing extra permissions. If that fails, it falls back to `osascript -e 'display notification ...'`.
- **Firing rule:** On each run, find the latest slot time that has passed (e.g. 20:00 at 20:05). If that slot hasn't been sent yet for today's date, send it and record it. This means a Mac that wakes at 20:30 gets one notification, not several missed ones.
- **State:** `{ date: "YYYY-MM-DD", sent: ["19:00", ...] }` is stored in the plugin data directory (§8). The state resets when the date changes.
- **Text:** title `Duolingo streak at risk`, body `{length}-day streak — {timeLeft} left`.
- The slot times are a constant array in the code.

## 8. Caching and errors

- **Data directory:** `$SWIFTBAR_PLUGIN_DATA_PATH`, which SwiftBar provides. If it isn't set, fall back to `~/Library/Caches/swiftbar-duolingo-status/`.
- After every successful fetch, the relevant fields are written to `cache.json` with the `username` and a `fetchedAt` timestamp. A cache for a different username is ignored.
- **On fetch or parse failure:** The plugin loads the cache and recomputes the status from the cached `endDate` against the current time. A cached "complete" correctly turns into "pending" after midnight. The output is marked stale (§5) and the error is shown in the dropdown.
- **Failure with no cache:** Show the error state (§5).
- The plugin always exits 0 and always prints valid SwiftBar output. It never crashes into SwiftBar's error view.

## 9. Configuration

The username comes from SwiftBar environment metadata in the script header:

```
// <swiftbar.environment>[DUOLINGO_USERNAME=KingsKraken]</swiftbar.environment>
```

The code reads `process.env.DUOLINGO_USERNAME` and falls back to `KingsKraken` if it isn't set.

## 10. Scheduling

The plugin refreshes every 10 minutes using cron metadata, so runs line up with clock times:

```
// <swiftbar.schedule>*/10 * * * *</swiftbar.schedule>
```

This makes the 19:00, 20:00, and 21:00 runs happen on time. A filename interval like `.10m.` counts from when SwiftBar launched, so runs would drift. The filename has no interval: `duolingo-status.js`.

> Cron runs on the Mac's local time, while the status logic uses the streak timezone. These are the same as long as you're in Pacific time. Elsewhere, notifications can be up to 10 minutes late, which is acceptable.

Other metadata:
- `<swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>`
- `<swiftbar.title>`
- `<swiftbar.desc>`

## 11. Runtime, build, and install

- **Runtime:** Node 26.10.0, installed via nvm. The code uses ESM, built-in `fetch`, and has **no runtime dependencies**.
- **Build:** esbuild bundles `src/main.ts` into a single file, `dist/duolingo-status.js`, targeting `node26` in ESM format.
- **Shebang problem:** SwiftBar runs plugins with a minimal `PATH` that doesn't include nvm's Node. The install script writes the **absolute path** of the current Node binary (`process.execPath`) into the shebang, e.g. `#!/Users/craigmaslowski/.nvm/versions/node/v26.10.0/bin/node`.
  - You need to re-run the install after switching Node versions. Document this in the README.
- **`npm run install-plugin`:**
  1. Build.
  2. Prepend the shebang and metadata header.
  3. Copy the result to `~/swiftbar-plugins/duolingo-status.js`. The target folder can be overridden with the `SWIFTBAR_PLUGINS_DIR` environment variable.
  4. `chmod +x`.
  5. Run `open -g "swiftbar://refreshallplugins"`.

  It copies rather than symlinks, so the plugins folder only ever contains the built artifact.

## 12. Project layout

```
src/
  main.ts          # entry: orchestrates fetch → status → notify → render; never throws
  api.ts           # fetchStreak(username): fetch + validate → StreakInfo
  time.ts          # tz helpers: todayIn(tz), minutesSinceMidnight(tz, now), msUntilMidnight(tz, now)
  status.ts        # computeStatus(streak, now) → { status, length, msLeft, minutes }
  color.ts         # colorAt(minutes), colorFor(status)
  render.ts        # SwiftBar output string from view model (pure)
  notify.ts        # dueSlot(now, state) (pure) + sendNotification() (side effect)
  cache.ts         # read/write cache.json and notify-state.json
scripts/
  build.ts         # esbuild bundle + shebang/metadata banner
  install-plugin.ts
test/
  fixtures/user.json
  *.test.ts
docs/specs/
```

Every module except `main.ts`, `api.ts`'s network call, `cache.ts`, and `sendNotification` is pure and takes `now: Date` as a parameter so it can be tested.

## 13. Testing (Vitest)

- **status:** `endDate` equal to today, yesterday, or older, a null streak, and day boundaries just before and after midnight in `tz`. Also cases where the Mac's local timezone differs from `tz`.
- **color:** Exact colors at each stop. Midpoints (e.g. 18:00 is halfway between yellow and orange). Grey before 17:00, yellow at exactly 17:00, and red after 21:00.
- **time format:** `2h 14m`, `59m`, `0m`, and exactly `1h 0m`.
- **render:** Snapshot-style checks of the full output for each status, the stale state, and the error state.
- **notify:** No slot before 19:00. One notification at 19:05. No repeat at 19:15. Waking at 20:30 with nothing sent yet gives only the 20:00 slot. No notification when complete. State resets on a new day.
- **api:** Parsing the fixture, an empty `users` array, and a missing `streakData`. `fetch` is mocked.

## 14. Tooling

- Dependencies: TypeScript (strict), esbuild, Vitest, and `@types/node`. All are dev dependencies only. `scripts/` runs directly on Node through its built-in type stripping, so `tsx` isn't needed.
- npm scripts: `build`, `test`, `typecheck`, `install-plugin`.

## 15. Open questions

- Confirm whether `endDate` counts a streak freeze as extended. If a freeze is used, the day may show as `complete` or `pending` depending on how Duolingo reports it. Check against real data the first time a freeze happens.
