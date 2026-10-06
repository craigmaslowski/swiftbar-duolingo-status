# AGENTS.md

This is a SwiftBar plugin, written in TypeScript and run on Node, that shows whether today's Duolingo streak is done. The behavior is defined in `docs/specs/2026-10-05_01_duolingo_menubar_item.md`. Read it before changing any behavior, and keep it in sync with the code.

## Commands

```sh
npm test               # vitest run
npm run typecheck      # tsc --noEmit (TypeScript 7)
npm run build          # dist/duolingo-status.js, `#!/usr/bin/env node` shebang
npm run install-plugin # build with absolute node shebang, copy to ~/swiftbar-plugins, refresh SwiftBar
```

Before finishing a change, run `npm test` and `npm run typecheck`. To try the plugin for real, run `npm run install-plugin`, or run the built file directly. Set `SWIFTBAR_PLUGIN_DATA_PATH` to a scratch directory so you don't overwrite the real cache.

## Layout

- `src/main.ts` is the entry point. It runs fetch, falls back to the cache if that fails, computes the status, sends any due notification, and renders. It must always print valid SwiftBar output and exit 0.
- `src/time.ts`, `status.ts`, `color.ts`, `render.ts`, and the decision functions in `notify.ts` are pure. They take `now: Date` or a precomputed `StreakView`. Keep side effects in `main.ts`, `api.ts` (the fetch), `cache.ts`, and `sendNotification`.
- `scripts/build.ts` holds the esbuild config and the SwiftBar metadata header. The schedule, the default username, and the other `<swiftbar.*>` tags live there.
- `test/` has a Vitest test per module. `test/helpers.ts` has `laTime()` and `view()` fixtures.

## Conventions

- Use ESM and import with `.ts` extensions. `scripts/` runs directly on Node through its built-in type stripping, so use erasable syntax only: no enums, namespaces, or parameter properties.
- **No runtime dependencies.** The plugin is bundled into one file. Dev dependencies are fine.
- Do date and time math with `Intl.DateTimeFormat` in the streak timezone. Don't add a date library.
- Color stops, notification slots, and color values are constant tables (`GRADIENT_STOPS`, `NOTIFY_SLOTS`, `COLORS`). Change behavior by editing those tables, not by adding branches.
- Spec files go in `docs/specs/`, named `YYYY-MM-DD_NN_short_name.md`.

## Gotchas

- **SwiftBar icon color:** `sfcolor=` is ignored for `sfimage=` icons. The icon color must be sent as `sfconfig=`, base64 JSON with `renderingMode: "Palette"` (see `sfconfig()` in `render.ts`).
- **SwiftBar `PATH`:** SwiftBar runs plugins with a minimal `PATH`, so nvm's `node` isn't found. The installer writes the absolute path from `process.execPath` into the shebang. Reinstall after changing Node versions.
- **Schedule:** use cron (`<swiftbar.schedule>`), not a filename interval like `.10m.`. Cron runs line up with the clock, so the 7, 8, and 9 PM notifications fire on time.
- **API timezone:** the public users API doesn't return `streakData.updatedTimeZone`, so the Mac's local timezone is used. The parser still reads the field if it's present.
- **Notifications:** sent with `open -g swiftbar://notify?...`, falling back to `osascript`. Only the latest passed slot fires, and each slot fires once per day. State is kept in `notify-state.json`.
- **Cache:** `cache.json` stores the username and is ignored when the username doesn't match.
