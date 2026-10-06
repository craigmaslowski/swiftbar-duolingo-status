import { execFile } from "node:child_process";
import { chmod, copyFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildPlugin } from "./build.ts";

const pluginsDir = process.env.SWIFTBAR_PLUGINS_DIR ?? join(homedir(), "swiftbar-plugins");
const target = join(pluginsDir, "duolingo-status.js");

const built = await buildPlugin(process.execPath);
await mkdir(pluginsDir, { recursive: true });
await copyFile(built, target);
await chmod(target, 0o755);
console.log(`Installed ${target} (node: ${process.execPath})`);

try {
  await promisify(execFile)("open", ["-g", "swiftbar://refreshallplugins"]);
  console.log("Asked SwiftBar to refresh plugins.");
} catch {
  console.log("Could not reach SwiftBar; refresh it manually.");
}
