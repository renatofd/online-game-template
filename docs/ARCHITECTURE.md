# Arquitetura e Estrutura de Pastas (proposta)

> Status: **proposta** — aguardando aprovação antes do scaffolding do código.
> Para o raciocínio por trás de cada escolha, veja [`RESEARCH.md`](./RESEARCH.md).

## 1. Princípios

1. **Servidor autoritativo.** O cliente envia *intenções* (inputs); o servidor decide o resultado. Nunca confiar no cliente.
2. **Simulação compartilhada e independente de engine.** A lógica de jogo (movimento, colisão, regras) vive em um pacote TypeScript puro, sem Phaser, que roda no servidor **e** no cliente (para client-side prediction). O Phaser é só a camada de apresentação.
3. **Transporte abstraído.** O jogo fala com uma interface `Transport`, não com WebSocket diretamente. Isso permite trocar por WebTransport (UDP/QUIC) no futuro sem tocar na lógica.
4. **Protocolo binário e versionado** desde o início (com fallback de debug em JSON).
5. **Mapas Tiled como fonte única de verdade** para cliente e servidor (o servidor lê o mesmo `.tmj` para colisões e spawns).
6. **Escalar por etapas:** um processo → várias salas/processos → frota orquestrada → mundo em zonas (MMO). Cada etapa não deve exigir reescrever as anteriores.
7. **Monorepo** com fronteiras claras entre pacotes; dependências apontam sempre para dentro (`client`/`server` → `shared`; nunca o contrário).

## 2. Estrutura de pastas

```text
online-game-template/
├── apps/
│   ├── client/                    # Cliente web (Vite + Phaser 4 + TS)
│   │   ├── index.html
│   │   ├── public/                # Assets *gerados* servidos estaticamente (não editar à mão)
│   │   │   └── assets/
│   │   │       ├── atlases/       # Atlases empacotados (PNG + JSON/PCT)
│   │   │       ├── maps/          # .tmj exportados + tilesets extrudados
│   │   │       ├── audio/
│   │   │       └── fonts/         # Bitmap fonts (pixel)
│   │   ├── src/
│   │   │   ├── main.ts            # Bootstrap: cria Phaser.Game com config
│   │   │   ├── config/            # Game config, resolução interna, constantes de render
│   │   │   ├── scenes/            # Boot, Preload, MainMenu, Game, UI (HUD em cena separada)
│   │   │   ├── net/               # Conexão, client-side prediction, reconciliação, interpolação
│   │   │   ├── render/            # Views: mapeia entidades da simulação → GameObjects Phaser
│   │   │   ├── input/             # Teclado/mouse/touch/gamepad → InputCommand
│   │   │   ├── ui/                # HUD, menus (Phaser ou DOM overlay)
│   │   │   ├── audio/
│   │   │   └── utils/
│   │   ├── tests/
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── server/                    # Servidor de jogo (Node.js + TS)
│       ├── src/
│       │   ├── main.ts            # Bootstrap HTTP/WS, healthcheck, métricas
│       │   ├── config/            # Leitura de env (validada), tick rate, limites
│       │   ├── transport/         # Implementações de Transport (ws, futuramente WebTransport)
│       │   ├── rooms/             # Salas/instâncias (uma partida .io = uma sala; no MMO = uma zona)
│       │   ├── world/             # Loop de tick fixo, carregamento de mapa, spawns
│       │   ├── interest/          # Area of Interest (grid espacial) → o que cada cliente recebe
│       │   ├── sessions/          # Conexão ↔ jogador, reconexão, autenticação (futuro)
│       │   ├── matchmaking/       # Escolha de sala/região (simples no início)
│       │   ├── persistence/       # Adaptadores de banco (futuro: Postgres/Redis)
│       │   └── observability/     # Logs estruturados, métricas (tick time, CCU, bytes/s)
│       ├── tests/
│       ├── Dockerfile
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                    # Simulação e regras de jogo — SEM Phaser, SEM Node APIs
│   │   └── src/
│   │       ├── constants/         # Tick rate, tamanhos, velocidades
│   │       ├── math/              # Vetores, RNG determinístico (seeded)
│   │       ├── ecs/               # Componentes e sistemas (ou bitECS) da simulação
│   │       ├── physics/           # Colisão simples (círculo/AABB vs grid de tiles)
│   │       ├── simulation/        # step(state, inputs, dt) — usado por servidor e predição
│   │       └── types/
│   │
│   ├── protocol/                  # Contrato de rede cliente ↔ servidor
│   │   └── src/
│   │       ├── messages.ts        # Tipos/IDs de mensagens (versão do protocolo)
│   │       ├── codec/             # Serialização binária (DataView/bit-packing, quantização)
│   │       └── snapshot/          # Snapshots e delta compression
│   │
│   ├── maps/                      # Leitura de mapas Tiled (.tmj) SEM Phaser
│   │   └── src/                   # Parser tipado: layers de colisão, objetos (spawns, zonas), props
│   │
│   └── config/                    # Configs compartilhadas de tooling
│       ├── tsconfig.base.json
│       └── eslint/ (ou biome.json na raiz)
│
├── content/                       # FONTES editáveis de conteúdo (não servidas direto)
│   ├── maps/                      # Projeto Tiled (.tiled-project), mapas .tmx/.tmj, templates .tx
│   ├── tilesets/                  # Tilesets fonte (.tsx + PNG sem extrusão)
│   ├── sprites/                   # Arquivos Aseprite (.aseprite) por personagem/objeto
│   ├── audio/                     # Áudio fonte (wav)
│   └── README.md                  # Convenções: tamanho de tile, paleta, nomes, propriedades Tiled
│
├── tools/                         # Pipeline de assets e scripts
│   ├── build-assets/              # Aseprite → atlas; extrusão de tilesets; cópia → apps/client/public
│   ├── validate-maps/             # Valida .tmj: layers obrigatórias, propriedades, tileset embutido
│   └── loadtest/                  # Bots headless para teste de carga do servidor
│
├── infra/                         # Deploy
│   ├── docker/                    # docker-compose para dev (server + redis + postgres)
│   └── k8s/                       # (futuro) manifests / Agones Fleet
│
├── docs/
│   ├── ARCHITECTURE.md            # Este documento
│   ├── RESEARCH.md                # Pesquisa e recomendações
│   ├── adr/                       # Architecture Decision Records (uma decisão por arquivo)
│   ├── networking.md              # (futuro) detalhes do protocolo e do netcode
│   └── content-pipeline.md        # (futuro) como criar mapas/sprites e exportar
│
├── .github/workflows/             # CI: lint, typecheck, testes, build
├── package.json                   # Scripts raiz (dev, build, test, lint)
├── pnpm-workspace.yaml
├── tsconfig.json                  # Project references
└── README.md
```

### Por que essa divisão

| Pasta | Responsabilidade | Pode depender de |
|---|---|---|
| `packages/shared` | Regras e simulação determinística | nada (só TS puro) |
| `packages/protocol` | Formato das mensagens na rede | `shared` |
| `packages/maps` | Ler Tiled sem Phaser (servidor precisa de colisão) | `shared` |
| `apps/server` | Autoridade, tick loop, AoI, salas | `shared`, `protocol`, `maps` |
| `apps/client` | Render, input, predição/interpolação, UI | `shared`, `protocol`, Phaser |
| `content/` | Arquivos fonte editados por artistas/level designers | — |
| `tools/` | Transforma `content/` em assets otimizados | — |

**Regra de ouro:** `packages/*` nunca importa Phaser nem APIs de Node/DOM. Isso garante que a simulação rode igual nos dois lados e em testes.

## 3. Fluxo de dados em runtime

```text
Cliente                                         Servidor (tick fixo, ex. 20–30 Hz)
───────                                         ──────────────────────────────────
input/ → InputCommand{seq, dx, dy, ações}  ──►  fila de inputs por jogador
net/ aplica o input localmente (predição)       world/ step(state, inputs)  ← packages/shared
                                                interest/ filtra entidades próximas a cada jogador
net/ recebe Snapshot (delta, binário)     ◄──   protocol/ codifica delta vs último ack
  ├─ entidade própria: reconcilia (reaplica inputs não confirmados)
  └─ outras entidades: buffer + interpolação (~100 ms no passado)
render/ atualiza GameObjects Phaser a cada frame (60+ fps, desacoplado do tick)
```

## 4. Caminho de escalabilidade

| Etapa | Cenário | O que muda |
|---|---|---|
| 0 | Protótipo `.io` | 1 processo Node, 1+ salas em memória |
| 1 | `.io` em produção | N processos/máquinas, Redis para presença/matchmaking, várias regiões |
| 2 | Muitas partidas simultâneas | Contêineres + orquestração (ex.: Agones em Kubernetes), autoscaling de frota |
| 3 | Mundo persistente / MMO | Mundo dividido em zonas (cada zona = uma "sala"), handoff de jogadores entre zonas, AoI agressivo, persistência em Postgres, serviços separados (auth, chat, inventário) |

O que torna isso possível desde já: simulação isolada em `shared`, AoI desde o dia 1, `Transport` abstrato, e o conceito de "sala" sendo genérico o bastante para representar tanto uma partida quanto uma zona.

## 5. Próximos passos (após aprovação)

1. Scaffolding do monorepo (pnpm workspaces, TS strict, project references, lint/format, Vitest).
2. Cliente mínimo: Phaser 4 + Vite, config pixel-perfect, cena carregando um mapa Tiled de exemplo.
3. Servidor mínimo: tick loop fixo, WebSocket, sala única, eco de posição.
4. `shared` + `protocol`: movimento compartilhado, predição + interpolação, codec binário simples.
5. CI no GitHub Actions.

Decisões em aberto estão listadas em [`RESEARCH.md` §10](./RESEARCH.md#10-decisões-em-aberto-para-você).
