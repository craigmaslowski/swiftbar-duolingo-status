# swiftbar-duolingo-status

A [SwiftBar](https://github.com/swiftbar/SwiftBar) plugin that shows in the menu bar whether today's Duolingo streak is done.

| State | Menu bar |
|---|---|
| Done today | 🔥 `1653` in green |
| Not done, before 5 PM | 🔥 `1653 · 7h 12m` in grey |
| Not done, 5 PM → midnight | Fades yellow (5 PM) → orange (7 PM) → red (9 PM) |
| Streak broken | 🔥 in light blue |
| API unreachable | `⚠︎` prefix, last known data, error in the dropdown |

If the streak isn't done, it also sends reminder notifications at 7, 8 and 9 PM.

See [the spec](docs/specs/2026-10-05_01_duolingo_menubar_item.md) for details.

## Install

```sh
npm install
npm run install-plugin
```

This bundles the plugin into `dist/duolingo-status.js` and copies it to `~/swiftbar-plugins` (override with `SWIFTBAR_PLUGINS_DIR`). Then it asks SwiftBar to refresh.

SwiftBar runs plugins with a minimal `PATH`, so the installer writes the absolute path of the current `node` into the shebang. **Re-run `npm run install-plugin` after switching Node versions with nvm.**

## Configuration

The Duolingo username defaults to `KingsKraken`. To change it, set `DUOLINGO_USERNAME` in the `<swiftbar.environment>` tag in `scripts/build.ts` and reinstall.

## Development

```sh
npm test           # vitest
npm run typecheck
npm run build      # dist/duolingo-status.js with a `#!/usr/bin/env node` shebang
```

Cached API data and notification state live in `$SWIFTBAR_PLUGIN_DATA_PATH` (set by SwiftBar), falling back to `~/Library/Caches/swiftbar-duolingo-status`.
