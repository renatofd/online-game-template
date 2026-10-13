# Pesquisa: Jogos Online Web (.io → MMO) — Abordagens Recomendadas

> Pesquisa feita em outubro/2026. Versões e suporte de navegadores mudam rápido — revalidar antes de decisões definitivas.
> Fontes no final do documento.

## Resumo executivo

| Tema | Recomendação |
|---|---|
| Engine cliente | **Phaser 4** (estável desde abr/2026; atual 4.2.x) com `pixelArt: true` e resolução interna fixa + zoom inteiro |
| Linguagem / repo | **TypeScript strict** em monorepo **pnpm workspaces**; código de simulação compartilhado cliente/servidor |
| Build cliente | **Vite** |
| Modelo de rede | **Servidor autoritativo** + client-side prediction + reconciliação (jogador local) + interpolação de entidades remotas |
| Transporte | **WebSocket** agora, atrás de uma interface `Transport`; **WebTransport** como evolução (já é Baseline nos browsers, mas servidor Node ainda imaturo) |
| Framework de servidor | **Colyseus 0.17** como padrão recomendado (salas, reconexão, TS ponta a ponta, escala horizontal com Redis) — com a simulação desacoplada para permitir trocar por servidor próprio (uWebSockets.js) se necessário |
| Serialização | **Binária** + quantização + delta de snapshots; nada de JSON no loop de jogo |
| Escala | AoI (grid espacial) desde o dia 1; salas → processos → frota (Agones) → zonas |
| Mapas | **Tiled** exportando `.tmj` com tilesets **embutidos** e **extrudados**; o servidor lê o mesmo arquivo |
| Física | **Sem Arcade Physics como autoridade.** Colisão simples própria em `packages/shared` (círculo/AABB vs grid de tiles), rodando no servidor e na predição |
| Persistência (futuro) | PostgreSQL (dados duráveis) + Redis (presença, matchmaking, sessões) |

---

## 1. Panorama: como jogos .io e MMOs web são construídos

Jogos `.io` (agar.io, slither.io, diep.io, surviv.io, etc.) compartilham um padrão:

- **Sessões curtas, entrada instantânea** (sem login obrigatório, nome + "Play").
- **Servidor autoritativo** em Node.js ou C++/Rust, comunicando via **WebSocket** (TCP). Apesar do debate TCP vs UDP, a maioria dos `.io` de sucesso roda sobre WebSocket — com tick moderado, payloads pequenos e interpolação a perda de pacote é tolerável.
- **Salas ("servidores") com limite de jogadores** (ex.: 50–100) e várias regiões; o "massivo" vem de *muitas salas*, não de uma sala gigante.
- **Arte simples** que carrega rápido; o tempo até jogar é decisivo para retenção.

MMOs web adicionam: **persistência**, contas, **mundo contínuo dividido em zonas**, e um problema central de custo: sem filtragem, o tráfego cresce de forma **quadrática** com jogadores na mesma área. Por isso **interest management (AoI)** é obrigatório.

Topologias de mundo:

| Topologia | Prós | Contras |
|---|---|---|
| Shards (cópias do mundo) | Mais simples e barato | Divide a comunidade |
| Zonas (mundo dividido por área, um processo por zona) | Escala população total | Limite de densidade por zona; handoff entre zonas |
| Single-shard sem costura | Economia e comunidade únicas | Exige tecnologia de servidor customizada/cara |

**Recomendação:** projetar o template para que "sala" seja um conceito genérico: no `.io` é uma partida; no MMO é uma zona. Shards + zonas cobrem a grande maioria dos casos.

## 2. Netcode: o núcleo técnico

Referências clássicas (leitura obrigatória): Gabriel Gambetta — *Fast-Paced Multiplayer*; Glenn Fiedler — *Gaffer on Games*; Valve — *Latency Compensating Methods*.

### 2.1 Servidor autoritativo
- Cliente envia **inputs com número de sequência** (`{seq, direção, ações}`), nunca posições.
- Servidor roda **tick fixo** (sugestão inicial: **20 Hz** de simulação/envio; avaliar 30 Hz para combate rápido). A renderização no cliente é independente (60+ fps).
- Servidor valida tudo: velocidade máxima, cooldowns, taxa de inputs (rate limit), limites do mapa.

### 2.2 Client-side prediction + reconciliação (jogador local)
- O cliente aplica o próprio input imediatamente usando **a mesma função de simulação do servidor** (`packages/shared`).
- Guarda inputs não confirmados; ao receber o estado autoritativo com o último `seq` processado, **corrige e reaplica** os inputs pendentes. Correções pequenas são suavizadas visualmente.
- Isso só funciona se a simulação for **determinística o suficiente** e idêntica dos dois lados → motivo principal de não usar a física do Phaser como autoridade.

### 2.3 Interpolação (entidades remotas)
- Renderizar outros jogadores **~100 ms no passado** (≈ 2 snapshots a 20 Hz), interpolando entre snapshots em buffer. Esconde jitter e perda de pacotes.
- Extrapolação apenas curta e limitada, como fallback.

### 2.4 Compensação de lag (quando houver combate com mira/projéteis)
- Servidor guarda histórico curto de posições e "volta no tempo" para validar acertos (técnica da Valve). Deixar como evolução futura, mas prever o buffer de histórico.

### 2.5 Largura de banda
- **Binário, não JSON**: JSON por update é um erro clássico — maior e mais caro de parsear.
- **Quantização**: posições em inteiros (ex.: 1/16 de pixel em `Int16`/`Uint16`), ângulos em 1 byte.
- **Delta compression**: enviar só o que mudou em relação ao último snapshot **confirmado** (ack) pelo cliente.
- **AoI**: enviar apenas entidades próximas do jogador.
- Medir **bytes/s por cliente** desde o primeiro protótipo.

## 3. Transporte

| Opção | Status (out/2026) | Uso recomendado |
|---|---|---|
| **WebSocket** (TCP) | Universal, maduro; libs `ws` e **uWebSockets.js** (muito mais performática) | **Padrão agora** |
| **WebTransport** (HTTP/3 + QUIC; datagramas não confiáveis) | Baseline nos navegadores — Safari 26.4 (mar/2026) fechou a lacuna. **Node não tem suporte nativo**; depende de `@fails-components/webtransport` (binding libquiche, mantido por poucas pessoas). Colyseus 0.16+ tem suporte experimental | **Evolução futura**, com fallback para WebSocket |
| **WebRTC DataChannel** (ex.: geckos.io) | Funciona com canais não confiáveis (UDP-like), mas setup complexo e manutenção incerta | Evitar como base |

**Recomendação:** começar com WebSocket e isolar o transporte atrás de uma interface (`send`, `onMessage`, `reliable`/`unreliable`). Quando o ecossistema de servidor WebTransport amadurecer (ou se o servidor for migrado para Rust/Go, que têm implementações QUIC sólidas), trocar sem mexer na simulação.

## 4. Framework de servidor

| Opção | Pontos fortes | Pontos fracos | Encaixe |
|---|---|---|---|
| **Colyseus 0.17** (Node/TS, MIT) | Salas, matchmaking básico, sync de estado com delta automático, **StateView** (filtro por cliente — base para AoI), reconexão automática, TS ponta a ponta, escala horizontal via Redis, WebTransport experimental, hospedagem gerenciada opcional | Sync baseado em Schema pode pesar com milhares de entidades; menos controle fino sobre o formato binário | **Ótimo para o `.io`** e para zonas instanciadas |
| **Servidor próprio** (uWebSockets.js + protocolo binário próprio) | Controle total de protocolo, AoI, performance | Você escreve salas, reconexão, matchmaking, presença | Melhor no longo prazo para MMO denso |
| **Nakama** (Go; lógica em TS/Lua/Go) | Contas, amigos, guildas, chat, leaderboards, matchmaker, storage | Pesado para começar; runtime TS embutido limitado | Bom **ao lado** do servidor de jogo para meta-features (social/LiveOps) |
| **SpacetimeDB** | Banco + lógica no mesmo processo; usado no backend do BitCraft | Modelo muito específico, lock-in, mais jovem | Alternativa a avaliar para mundo persistente único |

**Recomendação:** usar **Colyseus** para ganhar velocidade no `.io`, **mas** mantendo a simulação em `packages/shared` e o protocolo de entidades em `packages/protocol`. Se a escala MMO exigir, a sala do Colyseus pode virar só um "host" de transporte, ou ser substituída por servidor próprio, sem reescrever o jogo. Alternativa válida se preferir controle total desde já: servidor próprio em uWebSockets.js (ver §12).

## 5. Organização da simulação (ECS)

- Para centenas/milhares de entidades, um **ECS orientado a dados** ajuda performance e serialização. **bitECS 0.4** (TS, ~5 kb, sem dependências) tem módulo de serialização (snapshot / observer / SoA) pensado para sincronização em rede.
- **Recomendação:** começar com componentes simples e funções puras (`step(state, inputs, dt)`); adotar bitECS quando a contagem de entidades justificar. A fronteira importante é: **simulação ≠ renderização**. O cliente tem uma camada `render/` que mapeia entidades → GameObjects do Phaser.

## 6. Phaser 4 — pontos relevantes

- **Estável**: 4.0.0 "Caladan" (10/abr/2026), 4.1.0 (30/abr), 4.2.0 (19/jun), **4.2.1 (9/jul/2026)**. Renderizador WebGL reescrito (render nodes no lugar de pipelines).
- **Pixel art**:
  - `render: { pixelArt: true }` → pixels nítidos; o config automaticamente desliga antialias e liga `roundPixels`. Ideal com **zoom inteiro** (2x, 3x, 4x) e sem rotação/escala fracionária.
  - `render: { smoothPixelArt: true }` (somente WebGL) → para quando objetos pixel art precisam girar/escalar sem serrilhar demais. Ele **desativa** `pixelArt`. Escolher um dos dois por jogo.
  - Definir **resolução interna fixa** (ex.: 480×270 ou 640×360, proporção 16:9) e escalar com `Scale.FIT`/`Scale.ENVELOP` + CSS `image-rendering: pixelated` no canvas. Preferir múltiplos inteiros para nitidez total.
- **Tilemaps**:
  - Carregar com `this.load.tilemapTiledJSON` e criar com `addTilesetImage` / `createLayer`.
  - **`TilemapGPULayer`** (`createLayer(nome, tileset, x, y, true)`): renderiza a layer inteira como um único quad — custo por pixel de tela, não por tile; até 4096×4096 tiles; suporta flip e animação de tiles. Limitações: só ortogonal, **um tileset por layer**, WebGL apenas, e após editar tiles é preciso chamar `generateLayerDataTexture()`. Excelente para mapas grandes (MMO).
  - Para filtragem NEAREST (pixel nítido) com layers normais, **extrudar tilesets** (ferramenta `tile-extruder`) para evitar linhas/costuras entre tiles.
- **Outras novidades úteis**: sistema unificado de **Filters** (substitui FX e masks), iluminação com `setLighting(true)` (inclusive em tilemaps), `SpriteGPULayer` para muitos sprites, formato de atlas compacto **PCT** (~90% menor que JSON).
- Phaser 4 inclui arquivos de "skills" para agentes de IA no pacote — úteis para gerar código idiomático.

## 7. Pipeline de mapas (Tiled) e assets

**Tiled**
- Exportar **JSON (`.tmj`)**, com **tilesets embutidos** no mapa (o loader do Phaser não resolve tilesets externos `.tsx`). Manter `.tsx` como fonte em `content/` e embutir no export via script/comando do Tiled.
- Usar um **projeto Tiled** (`.tiled-project`) com **tipos de propriedades customizadas** (classes) para padronizar objetos: `spawn`, `zone`, `portal`, `pickup`.
- Convenção de layers sugerida: `ground`, `decor`, `collision` (ou propriedade `collides` nos tiles), `objects` (spawns/zonas), `above` (renderiza acima dos personagens).
- Usar a mesma tile size em todo o jogo (ex.: **16×16**).
- O **servidor lê o mesmo `.tmj`** via `packages/maps` (parser próprio sem Phaser) para colisão e spawns → mapa é a fonte única de verdade.
- Validar mapas em CI (`tools/validate-maps`): layers obrigatórias, propriedades, tileset embutido, tamanho de tile.
- Para mundo grande (MMO): dividir em **chunks/mapas por zona** e usar Tiled *World* (`.world`) para posicionar mapas adjacentes.

**Sprites**
- Fonte em **Aseprite**; exportar sprite sheets + JSON de tags (animações) e empacotar em **atlases** (reduz draw calls e requisições).
- Paleta definida e documentada; tamanho de sprite consistente com o grid.
- `content/` (fonte, versionado) → `tools/build-assets` → `apps/client/public/assets` (gerado). Considerar Git LFS se os binários crescerem.

## 8. Escalabilidade e infraestrutura

1. **Etapa 0–1**: Node.js em VPS/contêiner; um processo por núcleo; várias salas por processo. Redis para presença e matchmaking entre processos. Uma instância por região (latência importa mais que tudo).
2. **Etapa 2**: contêineres orquestrados. **Agones** (Kubernetes) gerencia `GameServer`/`Fleet`, health check, alocação e autoscaling de servidores de jogo dedicados; qualquer matchmaker pode alocar servidores via API.
3. **Etapa 3 (MMO)**:
   - Zonas = processos; **handoff** de jogador entre zonas com estado serializado.
   - **AoI com grid espacial (spatial hash)**: cada jogador recebe entidades das células vizinhas; custo ~linear.
   - Serviços separados: **auth/contas**, **gateway** (conexões), **chat**, **persistência** (Postgres), **mensageria** (Redis pub/sub ou NATS).
   - Persistir de forma assíncrona (write-behind), nunca bloqueando o tick.
4. **Observabilidade desde o início**: tempo de tick (p50/p99), CCU por sala, bytes enviados por cliente, RTT. Bots de carga (`tools/loadtest`) para saber o limite real por processo.

## 9. Segurança e anti-cheat (básico)

- Servidor autoritativo é o principal anti-cheat; o cliente nunca decide dano, posição ou pontuação.
- Validar e **limitar taxa** de mensagens; descartar mensagens malformadas; limites de tamanho.
- Sanitizar nomes/chat; proteger endpoints HTTP (CORS, rate limit).
- Ofuscação/minificação do cliente ajuda pouco — não confiar nela.
- Planejar proteção contra DDoS na borda (ex.: proxy/CDN para assets e provedores com mitigação).

## 10. GamePush: multiplayer e hospedagem

O GamePush tem um módulo de **Multiplayer** construído sobre **Channels** (salas). Pela documentação oficial:

- **Arquitetura host-based:** um dos *jogadores* é eleito "host" e mantém o estado autoritativo; os outros são peers. Não existe servidor de jogo com lógica própria. O SDK faz migração de host automática quando o host cai.
- Modos de sincronização: **Fast** (60 ticks/s, buffer de 50–100 ms) e **Smooth** (padrão, 20 ticks/s, buffer de 100–300 ms), com interpolação automática de campos numéricos.
- A própria página de conceitos de Channels diz que um multiplayer completo só com channels não funciona, e sugere modo por turnos. O módulo de Multiplayer é a resposta para tempo real, mas continua host-based.
- A documentação não informa limite de jogadores por sala, preço nem latência medida.

**Avaliação para este projeto:**

| Critério | GamePush Multiplayer | Servidor próprio (Colyseus) |
|---|---|---|
| Quem tem a autoridade | Um jogador (host) → pode trapacear; a conexão/CPU do host afeta todos | Servidor → anti-cheat natural |
| Jogadores por sala | Não documentado; host-based escala mal com dezenas de jogadores | Dezenas a centenas por sala, com AoI |
| Caminho para MMO | Não existe (sem servidor, sem zonas, sem persistência do mundo) | Salas → processos → zonas |
| Esforço inicial | Muito baixo | Médio |
| Custo | Incluso na plataforma (não documentado) | Servidor pago (a partir de ~US$ 5–15/mês) |

**Conclusão:** para `.io` com muitos jogadores e objetivo de escala massiva, o modelo host-based do GamePush não serve como base. Ele é ótimo para jogos casuais com poucos jogadores (2–8, coop, por turnos). **Recomendação:** usar o **GamePush para o que ele faz bem** — hospedagem do cliente, distribuição para várias plataformas, conta do jogador, leaderboards, anúncios, pagamentos — e o **Colyseus para o tempo real**. O SDK do GamePush fica isolado em um adaptador (`apps/client/src/platform/`), para o jogo também rodar fora dele (itch.io, site próprio).

Pontos a validar antes de lançar:
- Se as plataformas para onde o GamePush distribui permitem conexões WebSocket para um domínio externo (o servidor de jogo) — verificar as regras de cada plataforma.
- Se dá para o servidor validar a identidade do jogador do GamePush (para ligar conta GamePush ↔ jogador no servidor de forma segura).

## 11. Hospedagem

Um jogo multiplayer tem **duas partes** que são hospedadas em lugares diferentes:

1. **Cliente** (HTML/JS/imagens — arquivos estáticos): **GamePush** (você já usa, e distribui para várias plataformas) e opcionalmente **itch.io** (bom para testes públicos, devlogs e feedback). Ambos só hospedam arquivos estáticos: **nenhum dos dois roda o servidor de jogo**.
2. **Servidor de jogo** (Node.js rodando 24h): precisa de um serviço próprio.
   - **Desenvolvimento e testes:** local, no seu computador (custo zero).
   - **Primeiro deploy público:** **Colyseus Cloud** (a partir de US$ 15/mês, sem limite de CCU, sem DevOps; sem plano gratuito e sem autoscaling automático) — ou uma **VPS** com Docker (mais barata, mas você cuida do servidor).
   - **Região:** escolher a mais próxima dos jogadores. Latência importa mais que tudo; se o público for majoritariamente brasileiro, confirmar se há região em São Paulo.

## 12. Decisões

| # | Tema | Decisão | Registro |
|---|---|---|---|
| 1 | Servidor | Colyseus para tempo real; GamePush para plataforma/meta | [ADR 0001](./adr/0001-colyseus-e-gamepush.md) |
| 2 | Resolução / tile | 640×360, tiles 16×16, zoom inteiro, `pixelArt: true` | [ADR 0002](./adr/0002-pixel-art.md) |
| 3 | Ferramentas | pnpm, TypeScript strict, Biome, Vitest, Vite | [ADR 0003](./adr/0003-ferramentas.md) |
| 4 | Hospedagem | Cliente: GamePush (+ itch.io opcional). Servidor: local → Colyseus Cloud | §11 |

> **Atualização (implementação):** na hora de criar o projeto, a versão atual do Colyseus já era a **0.18**. Ela traz de fábrica o que este documento previa construir à mão: buffer de inputs com sanitização (`defineInput`), tick fixo (`setFixedTimestep`), **predição + reconciliação** e interpolação no cliente (`@colyseus/sdk/predict`) e um **painel de debug com simulador de latência/jitter**. O template usa tudo isso.

Estratégia de testes: ver [`TESTING.md`](./TESTING.md).

---

## Fontes

- Phaser — [Downloads/versões do Phaser 4](https://phaser.io/download/phaser4) · [v4.2.1 estável](https://phaser.io/download/stable) · [Release v4.1.0](https://phaser.io/news/2026/04/phaser-4-1-0-salusa-release) · [Phaser 3 vs Phaser 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4) · [GitHub releases](https://github.com/phaserjs/phaser/releases)
- Phaser 4 — [Pixel Art Guide](https://cdn.jsdelivr.net/npm/phaser@4.2.0/docs/Phaser%204%20Pixel%20Art%20Guide/Phaser%204%20Pixel%20Art%20Guide.md) · [Skill: game setup and config](https://unpkg.com/phaser@4.2.1/skills/game-setup-and-config/SKILL.md) · [Skill: tilemaps](https://cdn.jsdelivr.net/npm/phaser@4.2.0/skills/tilemaps/SKILL.md) · [SpriteGPULayer performance](https://phaser.io/news/2026/05/phaser4-spritegpulayer-performance)
- Tilemaps/pixel art — [Fórum Phaser: costuras em tilemap e extrusão](https://phaser.discourse.group/t/tilemap-camera-roundpixel-issue/4047)
- Colyseus — [0.17](https://colyseus.io/blog/colyseus-017-is-here/) · [0.16 (StateView, WebTransport)](https://colyseus.io/blog/colyseus-016-is-here/)
- WebTransport — [WebKit: Safari 26.4](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/) · [WebTransport é Baseline](https://webrtc.ventures/2026/04/webtransport-is-now-baseline-what-it-means-for-real-time-media/) · [WebTransport vs WebSocket em 2026](https://blog.codercops.com/blog/webtransport-explained-websocket-alternative-2026) · [@fails-components/webtransport](https://depscope.dev/pkg/npm/@fails-components/webtransport)
- WebRTC — [geckos.io](https://discourse.threejs.org/t/html5-multiplayer-games-over-udp-client-server-using-geckos-io/15896)
- Netcode — [Valve: Latency Compensating Methods](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization) · [GameDev.net: TCP em jogos .io](https://gamedev.net/forums/topic/697360-these-io-games-that-successfully-use-tcp/5382174) · [GameDev.net: deltas de snapshot](https://gamedev.net/forums/topic/717013-how-best-to-handle-snapshot-deltas-and-serialization/) · [Delta updates e compressão em WebSocket](https://www.superdevacademy.com/en/blogs/websocket-compression-delta-updates) · Leituras clássicas: Gabriel Gambetta, *Fast-Paced Multiplayer* (gabrielgambetta.com); Glenn Fiedler, *Gaffer on Games* (gafferongames.com)
- MMO / AoI — [Topologias MMORPG](https://game-ace.com/blog/mmorpg-games-and-how-to-develop-them/) · [Tese uOttawa: comunicação zonal por visibilidade](https://ruor.uottawa.ca/handle/10393/27862)
- Backends — [Nakama vs Colyseus (fórum Heroic Labs)](https://forum.heroiclabs.com/t/nakama-vs-colyseus/1632) · [SpacetimeDB](https://spacetimedb.com/) · [SpacetimeDB vs PlayFab vs Nakama](https://tech-insider.org/spacetimedb-vs-playfab-vs-nakama-2026/)
- ECS — [bitECS 0.4](https://cdn.jsdelivr.net/npm/bitecs@0.4.0/README.md)
- Infra — [Agones overview](https://agones.dev/site/docs/overview/) · [Colyseus Cloud](https://colyseus.io/cloud-managed-hosting/)
- GamePush — [Multiplayer](https://docs.gamepush.com/docs/multiplayer/) · [Conceito de Channels](https://docs.gamepush.com/docs/channels/concept/) · [Gerenciar Channels](https://docs.gamepush.com/docs/channels/manage-channels/) · [Templates (regiões)](https://docs.gamepush.com/docs/channels/templates/)
