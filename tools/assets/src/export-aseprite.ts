/**
 * Exports every content/sprites/src/<name>.aseprite (or .ase) to
 * content/sprites/<name>.png + <name>.json, in the format the game loads.
 *
 *   pnpm assets:sprites
 *
 * Needs the Aseprite CLI (or LibreSprite, its free fork). On Windows the usual
 * install folders (including Steam) are tried. Otherwise point ASEPRITE to it:
 *   PowerShell:  $env:ASEPRITE="C:/Program Files/Aseprite/Aseprite.exe"; pnpm assets:sprites
 *   macOS/Linux: ASEPRITE=/path/to/aseprite pnpm assets:sprites
 * Without the CLI you can export by hand in Aseprite: File → Export Sprite Sheet,
 * Output: JSON Data, "Array", Item Filename "{frame}", Tags checked.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SPRITES_DIR } from "./paths";

const SRC = join(SPRITES_DIR, "src");
const bin = process.env.ASEPRITE ?? defaultBinary();

function defaultBinary(): string {
  if (process.platform === "win32") {
    const candidates = [
      join(process.env.ProgramFiles ?? "C:/Program Files", "Aseprite/Aseprite.exe"),
      join(
        process.env["ProgramFiles(x86)"] ?? "C:/Program Files (x86)",
        "Steam/steamapps/common/Aseprite/Aseprite.exe",
      ),
      join(process.env.ProgramFiles ?? "C:/Program Files", "LibreSprite/libresprite.exe"),
    ];
    const found = candidates.find((c) => existsSync(c));
    if (found) return found;
  }
  if (process.platform === "darwin" && existsSync("/Applications/Aseprite.app/Contents/MacOS/aseprite"))
    return "/Applications/Aseprite.app/Contents/MacOS/aseprite";
  return "aseprite";
}

const sources = existsSync(SRC) ? readdirSync(SRC).filter((f) => /\.(aseprite|ase)$/i.test(f)) : [];
if (sources.length === 0) {
  console.log(`No .aseprite files in ${SRC}. Put your sources there and run again.`);
  process.exit(0);
}

const probe = spawnSync(bin, ["--version"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  console.error(
    `Aseprite CLI not found ("${bin}"). Install Aseprite or LibreSprite and set ASEPRITE to its executable,\n` +
      "or export by hand (see the comment at the top of tools/assets/src/export-aseprite.ts).",
  );
  process.exit(1);
}

let failed = false;
for (const file of sources) {
  const name = file.replace(/\.(aseprite|ase)$/i, "");
  const args = [
    "-b",
    join(SRC, file),
    "--sheet",
    join(SPRITES_DIR, `${name}.png`),
    "--data",
    join(SPRITES_DIR, `${name}.json`),
    "--format",
    "json-array",
    "--filename-format",
    "{frame}",
    "--list-tags",
    "--sheet-pack",
  ];
  const res = spawnSync(bin, args, { encoding: "utf8" });
  if (res.status === 0) console.log(`✓ ${file} → sprites/${name}.png + .json`);
  else {
    failed = true;
    console.error(`✗ ${file}\n${res.stderr || res.stdout}`);
  }
}
process.exit(failed ? 1 : 0);
