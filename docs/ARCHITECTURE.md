# Arquitetura

> Para o raciocínio por trás de cada escolha, veja [`RESEARCH.md`](./RESEARCH.md). As decisões estão em [`adr/`](./adr/).

![Cliente com 20 bots e um jogador](./images/screenshot.png)

## 1. Princípios

1. **Servidor autoritativo.** O cliente envia só *intenções* (inputs); o servidor decide o resultado. Nunca confiar no cliente.
2. **Simulação compartilhada e independente de engine.** Movimento, colisão e regras ficam em `packages/shared`, TypeScript puro e sem Phaser. Esse código roda no servidor **e** no cliente (para a predição). O Phaser é só apresentação.
3. **Contrato de rede explícito.** Os nomes de salas e os schemas de estado/input ficam em `packages/protocol`, compartilhados pelos dois lados. O Colyseus serializa em binário com delta.
4. **Mapas Tiled como fonte única.** O cliente desenha e o servidor colide usando o mesmo `.tmj` de `content/maps`.
5. **Plataforma isolada.** GamePush, itch.io etc. ficam atrás da interface `Platform`; o jogo não chama SDK de plataforma diretamente.
6. **Escalar por etapas:** um processo → várias salas/processos → frota orquestrada → mundo em zonas (MMO), sem reescrever as etapas anteriores.
7. **Dependências apontam para dentro:** `apps/*` → `packages/*`. `packages/*` nunca importa Phaser, Node ou DOM (exceto `protocol`, que depende só de `@colyseus/schema`).

## 2. Estrutura de pastas

```text
online-game-template/
├── apps/
│   ├── client/                       Cliente web (Vite + Phaser 4)
│   │   ├── index.html
│   │   ├── vite.config.ts            Alias @content → <repo>/content; base relativa (itch.io/GamePush)
│   │   └── src/
│   │       ├── main.ts               Bootstrap: plataforma, painel de debug (dev), Phaser.Game
│   │       ├── services.ts           Serviços globais mínimos (plataforma)
│   │       ├── assets/manifest.ts    Lista de mapas, tilesets e sprites carregados
│   │       ├── config/gameConfig.ts  640x360, pixelArt, zoom inteiro
│   │       ├── scenes/               BootScene (loading), GameScene (jogo), HudScene (ping/players/fps)
│   │       ├── net/connection.ts     URL do servidor e entrada na sala
│   │       ├── input/                Teclado → MoveInput (-1|0|1)
│   │       ├── render/               PlayerView: só desenha, não guarda estado
│   │       ├── platform/             Platform (interface), WebPlatform, GamePushPlatform
│   │       └── ui/                   (futuro) menus e UI
│   │
│   └── server/                       Servidor de jogo (Colyseus 0.18)
│       ├── src/
│       │   ├── index.ts              listen(app), compatível com Colyseus Cloud
│       │   ├── app.config.ts         Salas registradas, /health, /monitor e /playground (dev)
│       │   ├── config/env.ts         Variáveis de ambiente
│       │   ├── rooms/ArenaRoom.ts    Uma partida .io (no futuro: uma zona do MMO)
│       │   └── world/maps.ts         Carrega e cacheia os mapas .tmj
│       ├── test/                     Testes de integração da sala (@colyseus/testing)
│       └── scripts/build.mjs         Bundle de produção (esbuild) → build/index.js
│
├── packages/
│   ├── shared/                       Simulação pura: constantes, colisão com grid de tiles, stepPlayer
│   ├── protocol/                     Nomes de salas, schemas ArenaState/Player/MoveInput
│   └── maps/                         Tipos Tiled, parseTiledMap (colisão + spawns), validateTiledMap
│
├── content/                          FONTE do conteúdo (ver content/README.md)
│   ├── maps/                         game.tiled-project + mapas .tmj
│   ├── tilesets/                     PNGs de tileset (extrudados)
│   └── sprites/                      Sprites
│
├── tools/
│   ├── assets/                       Arte provisória e validação de mapas
│   └── loadtest/                     Bots (@colyseus/loadtest)
│
├── docs/                             Arquitetura, pesquisa, testes, ADRs
├── .github/workflows/ci.yml          Lint, typecheck, mapas, testes, build
├── biome.json                        Lint + formatação
├── tsconfig.base.json                TS strict compartilhado
├── vitest.config.ts                  Testes de todos os pacotes
└── pnpm-workspace.yaml
```

Pastas previstas para depois: `infra/` (Docker, Kubernetes/Agones), `apps/server/src/{interest,persistence,matchmaking}` e `apps/client/src/ui`.

## 3. Fluxo de dados em runtime

```text
Cliente (60+ fps)                                   Servidor (tick fixo de 30 Hz)
─────────────────                                   ─────────────────────────────
MoveInputReader → MoveInput{moveX, moveY}
  1 input por tick de simulação (predict.tick)  ──► buffer de inputs por jogador (defineInput)
  reconciler aplica stepPlayer na hora                sanitize: valores fora de -1..1 são cortados
  (predição do próprio jogador)                       setFixedTimestep → stepPlayer(player, input, dt, colisão)
                                                       ← @game/shared + mapa de @game/maps
Estado (binário, delta) ◄────────────────────────── ArenaState { mapId, players }
  próprio jogador: rollback + replay se divergir
  outros: interpolação ("lerp", smoothMs 65)
PlayerView.setPosition(predict.value(...))
```

O ponto central: **`stepPlayer` é a mesma função nos dois lados**. Ela precisa continuar pura (sem relógio, sem aleatoriedade, sem ler nada fora dos argumentos), senão a predição diverge do servidor.

## 4. Como estender

| Quero... | Onde mexer |
|---|---|
| Nova regra de jogo (ex.: dash, dano) | `packages/shared` (pura, com testes) + aplicar em `ArenaRoom.step` |
| Novo campo sincronizado | `packages/protocol/src/schema.ts` |
| Novo tipo de input | `MoveInput` (ou novo schema) + `sanitize` na sala |
| Evento que não é input por tick (chat, emote) | `messages` na sala + `room.send` no cliente |
| Novo mapa | `content/maps` + `assets/manifest.ts` (ver `content/README.md`) |
| Recurso do GamePush (leaderboard, anúncios) | `apps/client/src/platform/` |
| Nova sala/modo | Nova classe em `apps/server/src/rooms`, registrar em `app.config.ts`, nome em `protocol/rooms.ts` |

## 5. Caminho de escalabilidade

| Etapa | Cenário | O que muda |
|---|---|---|
| 0 | Protótipo `.io` | 1 processo Node, várias salas em memória (**hoje**) |
| 1 | `.io` em produção | N processos/máquinas com Redis (`@colyseus/redis-presence` + `redis-driver`), várias regiões |
| 2 | Muitas partidas simultâneas | Contêineres + orquestração (ex.: Agones em Kubernetes), autoscaling de frota |
| 3 | Mundo persistente / MMO | Mundo em zonas (cada zona = uma sala), handoff entre zonas, AoI com `StateView`, persistência em Postgres, serviços separados (auth, chat, inventário) |

O que já deixa isso possível: simulação isolada em `shared`, mapas lidos sem Phaser, "sala" genérica (partida ou zona) e plataforma isolada.

## 6. Próximos passos sugeridos

1. Definir o gameplay do primeiro `.io` (objetivo, pontuação, morte/respawn).
2. Área de interesse (AoI) com `StateView` quando os mapas e o número de jogadores crescerem.
3. Animações de sprite (Aseprite → atlas) e câmera/efeitos.
4. Testes ponta a ponta com Playwright na CI (dois navegadores se vendo).
5. Deploy: cliente no GamePush/itch.io, servidor no Colyseus Cloud.
