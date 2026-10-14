/**
 * Turns a fresh copy of the template into a new game.
 *
 *   pnpm init-game --name "Space Blobs" --id space-blobs
 *
 * Renames the project, the page title and the game module. Safe to run once;
 * running it again only replaces the current name with the new one.
 * See docs/TEMPLATE.md for the whole "new game" checklist.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const USAGE = 'Usage: pnpm init-game --name "My Game" [--id my-game]';

let values: { name?: string; id?: string; help?: boolean };
try {
  ({ values } = parseArgs({
    options: { name: { type: "string" }, id: { type: "string" }, help: { type: "boolean", short: "h" } },
    args: process.argv.slice(2).filter((a) => a !== "--"),
  }));
} catch (err) {
  console.error(`${(err as Error).message}\n${USAGE}`);
  process.exit(1);
}
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const name = values.name?.trim();
const id = (values.id ?? name ?? "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/\p{M}/gu, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

if (!name) {
  console.error(USAGE);
  process.exit(1);
}
if (!id) {
  console.error(`Could not make an id from "${name}" (it needs latin letters or digits). Pass one: --id my-game`);
  process.exit(1);
}

const GAME_MODULE = "game/client/src/index.ts";
const current = readFileSync(resolve(ROOT, GAME_MODULE), "utf8");
// The title is written with JSON.stringify, so it may contain escaped quotes.
const currentTitle = /title: ("(?:[^"\\]|\\.)*")/.exec(current)?.[1];
const currentId = /\bid: "([^"]*)"/.exec(current)?.[1];
if (!currentTitle || !currentId) {
  console.error(`Could not find title/id in ${GAME_MODULE}.`);
  process.exit(1);
}

function edit(path: string, fn: (text: string) => string) {
  const full = resolve(ROOT, path);
  const before = readFileSync(full, "utf8");
  const after = fn(before);
  if (after !== before) {
    writeFileSync(full, after);
    console.log(`updated ${path}`);
  }
}

edit(GAME_MODULE, (s) =>
  s
    .replace(`title: ${currentTitle}`, () => `title: ${JSON.stringify(name)}`)
    .replace(`id: "${currentId}"`, () => `id: "${id}"`),
);
edit("apps/client/index.html", (s) => s.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(name)}</title>`));
edit("package.json", (s) => s.replace(/"name": "[^"]*"/, () => `"name": "${id}"`));
edit("README.md", (s) => s.replace(/^# .*$/m, () => `# ${name}`));

console.log(`\n✓ Project is now "${name}" (${id}). Next steps: docs/TEMPLATE.md → "Começar um jogo novo".`);

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}
