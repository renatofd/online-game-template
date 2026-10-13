# Changelog

Mudanças do template. Jogos derivados: leia antes de `git merge template/main`. Veja [`docs/TEMPLATE.md`](docs/TEMPLATE.md).

## 0.3.0

Pronto para produção: GamePush completo, contas verificadas, deploy, observabilidade, área de interesse e testes ponta a ponta.

### Novo
- **GamePush (cliente):**
  - o SDK é carregado pelas variáveis `VITE_GAMEPUSH_PROJECT_ID` e `VITE_GAMEPUSH_PUBLIC_TOKEN`, com fallback entre os servidores oficiais;
  - o jogo espera o jogador sincronizar antes de começar;
  - idioma e nome vêm do GamePush, e a troca de idioma no menu é repassada a ele;
  - `gameStart`, `gameplayStart` e `gameplayStop` são chamados nos momentos certos;
  - anúncios (`platform.ads`) e leaderboard (`platform.openLeaderboard`) ficam disponíveis para o jogo;
  - quando o GamePush pausa (durante um anúncio), o som é silenciado e o controle é liberado.
- **Contas verificadas:** o cliente envia um comprovante de identidade (`auth`) ao entrar. O `GameRoom` confere com o provedor registrado (`GamePushAccountProvider`, via Server API `GetPlayer`) e recusa comprovantes falsos. Sem provedor configurado, o jogador entra como convidado; `allowGuests = false` exige conta. Também vem o `GamePushServerApi` para outras chamadas da Server API.
- **Servidor de produção:**
  - variáveis de ambiente validadas ao iniciar;
  - logs estruturados (`log`), em JSON quando em produção;
  - `GET /metrics` no formato Prometheus, com duração dos ticks por sala (`startSimulation`);
  - `ALLOWED_ORIGINS` restringe quais sites podem conectar (WebSocket e CORS);
  - `MAX_PAYLOAD_BYTES` limita o tamanho das mensagens;
  - `/monitor` em produção, protegido por `MONITOR_PASSWORD`;
  - Redis opcional (`REDIS_URL`) para escala horizontal.
- **Área de interesse:** `SpatialHash` (`@core/shared`) e `InterestManager` (`@core/server`, usando `StateView`). Cada cliente recebe só as entidades próximas. O jogo de exemplo usa um raio de 400 px.
- **Deploy:**
  - `Dockerfile` enxuto, com healthcheck;
  - `infra/docker-compose.yml` (servidor + Redis);
  - `ecosystem.config.cjs` para PM2 e Colyseus Cloud;
  - `pnpm pack:client` gera o `.zip` para GamePush e itch.io;
  - workflow **Release** (imagem no GHCR, `.zip` no release, envio opcional ao itch.io).
- **Testes ponta a ponta:** `tools/e2e` com Playwright (multiplayer, menu de pausa, árabe RTL, joystick no celular), rodando na CI.
- `docs/DEPLOY.md`.

### Breaking
- `CORE_PROTOCOL_VERSION` passou para 2 (campo `auth` nas opções de entrada) e `PROTOCOL_VERSION` do exemplo para 2 (`players` com `.view()`). Clientes antigos recebem "nova versão disponível".
- A interface `Platform` ganhou `ads`, `setLanguage`, `getAuthPayload` e `onPauseChange`. Adaptadores próprios precisam implementá-los.
- `PlayerIdentity` ganhou o campo `verified`.
- Os pacotes do servidor usam `@colyseus/core` (mais `@colyseus/monitor` e `@colyseus/playground`) no lugar do pacote `colyseus`. Troque `from "colyseus"` por `from "@colyseus/core"`.
- Use `this.startSimulation(step, TICK_RATE)` no lugar de `setFixedTimestep` para ter métricas de tick.

## 0.2.0

Separação entre núcleo e jogo, e fluxo completo de cliente.

### Novo
- **Núcleo vs jogo:** `packages/core-{shared,maps,server,client}` (template) e `game/{shared,server,client}` (jogo). `apps/*` só ligam os dois.
- **Servidor:** classe base `GameRoom`, com checagem de versão do protocolo, identidade do jogador (`authenticate`, convidado por padrão), reconexão e limite de mensagens por segundo. Também `createGameServer` com `/health`, `/version`, `/monitor` e `/playground` (só em dev).
- **Cliente:** `startClient(gameModule)` cuida das telas (carregando, menu, conectando, reconectando, erros, nova versão, pausa, resultado), em DOM sobre o canvas.
- **Idiomas:** i18n em 14 línguas (en, pt, es, fr, de, it, tr, ru, ar, hi, id, ja, zh, ko), com plurais e árabe da direita para a esquerda. O idioma vem da escolha salva, depois da plataforma, depois do navegador.
- **Entrada:** teclado, controle (gamepad) e toque, com joystick virtual e botões de ação, juntos em `InputManager`.
- **Celular:** aviso para girar o aparelho, tela cheia, áreas seguras (notch), sem zoom ou rolagem acidental.
- **Plataforma:** `Platform` com idioma, nome e `gameplayStart`/`gameplayStop`. O adaptador do GamePush espera o SDK carregar.
- `sanitizeName` aceita todas as escritas e bloqueia caracteres de controle e de inversão de texto.
- `pnpm init-game`, `docs/TEMPLATE.md`, `CLAUDE.md` e `TEMPLATE_VERSION`.

### Breaking
- `packages/shared` e `packages/protocol` foram para `game/shared`. `packages/maps` virou `packages/core-maps`, agora `@core/maps`.
- Os clientes precisam enviar `v: { core, game }` ao entrar na sala (o núcleo do cliente faz isso sozinho).
- O painel de debug do Colyseus agora só aparece com `?debug` na URL.

## 0.1.0

- Monorepo inicial: Phaser 4 + Colyseus 0.18, movimento compartilhado com predição, mapas do Tiled lidos no servidor, bots, CI.
