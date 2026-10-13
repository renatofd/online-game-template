# CLAUDE.md

Guidance for AI coding agents working in this repository (the template or a game derived from it).

## What this is

Template for online web games (.io now, MMO-ready later): Phaser 4 client, Colyseus 0.18 authoritative server, TypeScript, Tiled maps, pixel art. pnpm monorepo.

## Layout and ownership

- `packages/core-*` — **template core** (`@core/shared`, `@core/maps`, `@core/server`, `@core/client`). In a game repo, do not edit; change the template instead (see docs/TEMPLATE.md).
- `game/*` — **the game** (`@game/shared`, `@game/server`, `@game/client`). Rules, rooms, scenes, assets, strings.
- `apps/*` — thin entrypoints wiring core + game. `content/` — maps and art. `tools/` — scripts.
- Dependencies point inward: apps → game → core. Core never imports game code (tools may import `TILE_SIZE` from `@game/shared`).

## Rules that keep the netcode correct

- The server is authoritative. Clients send inputs only (`defineInput` schemas, sanitized server-side).
- Simulation code shared by server and client prediction (e.g. `stepPlayer`) must be **pure and deterministic**: no `Date`, `Math.random`, timers or globals. Same inputs → same outputs.
- `packages/core-*` and `game/shared` must not import Phaser, Node or DOM APIs (except `@core/client`).
- Bump `PROTOCOL_VERSION` in `game/shared/src/constants.ts` whenever schemas, inputs or messages change; bump `CORE_PROTOCOL_VERSION` for core wire changes. Mismatched clients are told to reload.
- Never trust join options or messages: sanitize (`sanitizeName`, clamps) on the server.

## UI and i18n

- Menus/HUD are DOM (`@core/client` ui), not Phaser text: needed for RTL Arabic, Devanagari, CJK and IME.
- Every user-visible string goes through `t()`. Core strings: `packages/core-client/src/i18n/coreMessages.ts` (typed; missing keys fail typecheck). Game strings: `game/client/src/messages.ts`.
- Supported locales (all must be filled): en, pt, es, fr, de, it, tr, ru, ar, hi, id, ja, zh, ko. Use CSS logical properties (inline/block) so RTL works.
- Read input through `ctx.input` (`InputManager`: keyboard + gamepad + touch). Don't use Phaser keyboard (disabled).

## Maps

Tiled `.tmj`, orthogonal, 16x16, embedded tilesets, CSV layers, object layer `objects` with `spawn` points, `collides=true` tile property for collision. Validate with `pnpm maps:validate`. Client registers maps in `game/client/src/assets.ts`.

## Commands

- `pnpm dev` — server :2567 + client :3000 (`?debug` shows the Colyseus network panel; `__net(150, 30)` in console simulates lag)
- `pnpm check` — lint (Biome) + typecheck + tests (Vitest) + map validation. Run before pushing; CI runs the same plus `pnpm build`.
- `pnpm lint:fix` — auto-format.
- `pnpm loadtest` — 20 bots (behaviour in `game/client/src/bot.ts`).

## Conventions

- TypeScript strict, ESM, `moduleResolution: bundler`; workspace packages export `.ts` sources directly (no build step).
- Tests next to code (`*.test.ts`) or in `test/`. Room integration tests use `@colyseus/testing` with `createGameServer`.
- Code and comments in English; user-facing docs (`docs/`, READMEs) in Portuguese.
