import { build } from "esbuild";
import { chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const OUT_FILE = fileURLToPath(new URL("../dist/duolingo-status.js", import.meta.url));

// SwiftBar reads these tags from anywhere in the file.
const METADATA = `
// <swiftbar.title>Duolingo Streak</swiftbar.title>
// <swiftbar.desc>Shows whether today's Duolingo streak is done, with color-coded urgency.</swiftbar.desc>
// <swiftbar.schedule>*/10 * * * *</swiftbar.schedule>
// <swiftbar.environment>[DUOLINGO_USERNAME=KingsKraken]</swiftbar.environment>
// <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
`;

/**
 * Bundle the plugin into a single executable file. `nodePath` becomes the
 * shebang interpreter; SwiftBar's minimal PATH can't find nvm's node, so the
 * installer passes an absolute path.
 */
export async function buildPlugin(nodePath?: string): Promise<string> {
  const shebang = nodePath ? `#!${nodePath}` : "#!/usr/bin/env node";
  await build({
    entryPoints: [fileURLToPath(new URL("../src/main.ts", import.meta.url))],
    outfile: OUT_FILE,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    banner: { js: shebang + "\n" + METADATA },
    legalComments: "none",
  });
  await chmod(OUT_FILE, 0o755);
  return OUT_FILE;
}

if (import.meta.main) {
  console.log(`Built ${await buildPlugin()}`);
}
