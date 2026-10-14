# Deploy e configuração de produção

Um jogo tem duas partes publicadas em lugares diferentes:

| Parte | O que é | Onde publicar |
|---|---|---|
| **Cliente** | Arquivos estáticos (`apps/client/dist`) | GamePush, itch.io, qualquer CDN |
| **Servidor** | Processo Node.js 24h (`apps/server`) | Colyseus Cloud, VPS, Fly.io, Railway, Render… (qualquer host de Docker ou Node) |

## 1. Servidor

### Com Docker (recomendado)

```bash
docker build -t meu-jogo-server --build-arg BUILD_ID=$(git rev-parse --short HEAD) .
docker run -p 2567:2567 \
  -e ALLOWED_ORIGINS=https://meu-jogo.example \
  -e GAMEPUSH_PROJECT_ID=... -e GAMEPUSH_API_SECRET=... \
  meu-jogo-server
```

- A imagem tem só o necessário (~90 MB de dependências), roda como usuário sem privilégios e tem `HEALTHCHECK` em `/health`.
- O workflow **Release** (`.github/workflows/release.yml`) publica a imagem em `ghcr.io/<dono>/<repo>-server` a cada tag `v*`.
- `infra/docker-compose.yml` sobe servidor + Redis localmente (`docker compose -f infra/docker-compose.yml up --build`).

### Sem Docker (VPS com PM2, Colyseus Cloud)

```bash
pnpm install && pnpm build:server
cd apps/server && NODE_ENV=production pm2 start ecosystem.config.cjs
```

O build fica em `apps/server/build/index.js`. Os mapas precisam estar acessíveis (`MAPS_DIR`, padrão `<repo>/content/maps`).

> **Colyseus Cloud:** usa o `ecosystem.config.cjs` e o comando de build do projeto. Como este repositório é um monorepo, no primeiro deploy configure no painel o diretório `apps/server` e o build `pnpm install && pnpm --filter @app/server build`, e confirme que `content/maps` vai junto (ou defina `MAPS_DIR`). Esse fluxo ainda não foi testado num deploy real.

### Variáveis de ambiente do servidor

O servidor **valida tudo ao iniciar** e para com uma mensagem clara se algo estiver errado.

| Variável | Padrão | Para quê |
|---|---|---|
| `NODE_ENV` | — | `production` liga os logs em JSON e desliga as ferramentas de dev |
| `PORT` | `2567` | Porta HTTP/WebSocket |
| `ALLOWED_ORIGINS` | vazio (todas) | Lista separada por vírgula dos sites que podem conectar, ex.: `https://meu-jogo.example,https://gamepush.com`. **Defina em produção.** |
| `GAMEPUSH_PROJECT_ID` | — | ID do projeto no GamePush |
| `GAMEPUSH_API_SECRET` | — | Chave da Server API do GamePush. **Segredo: só no servidor.** Com as duas definidas, jogadores do GamePush são verificados ao entrar |
| `REDIS_URL` | — | `redis://...`. Liga a escala horizontal (vários processos ou máquinas compartilhando salas) |
| `PUBLIC_ADDRESS` | — | Endereço pelo qual os jogadores chegam **neste** processo, sem protocolo: `eu-1.meu-jogo.example` ou `meu-jogo.example/{port}` (`{port}` vira a porta do processo). Só é preciso com vários processos (veja a seção 4) |
| `MONITOR_PASSWORD` | — | Em produção, libera `/monitor` com usuário `admin` e esta senha |
| `LOG_LEVEL` | `info` (prod) | `debug`, `info`, `warn` ou `error` |
| `MAX_PAYLOAD_BYTES` | `16384` | Tamanho máximo de uma mensagem WebSocket |
| `MAPS_DIR` | `<repo>/content/maps` | Pasta dos `.tmj` |
| `BUILD_ID` | `dev` | Aparece em `/version` e nos logs |

### Endpoints

| Rota | Uso |
|---|---|
| `GET /health` | Verificação de vida (load balancer, Docker, Kubernetes) |
| `GET /version` | `{ core, game, build }`: versões do protocolo e do build |
| `GET /metrics` | Métricas em formato Prometheus: salas, jogadores, memória, duração dos ticks por sala, falhas de autenticação, origens recusadas |
| `/monitor` | Painel do Colyseus (dev, ou produção com `MONITOR_PASSWORD`) |

**Sinal de alerta nas métricas:** `game_tick_duration_ms` acima de ~33 ms (o tempo de um tick a 30 Hz) significa que a sala está sobrecarregada.

## 2. Cliente

```bash
pnpm build:client     # gera apps/client/dist
pnpm pack:client      # gera release/<jogo>-client-<versão>.zip (index.html na raiz)
```

Variáveis lidas **no build** (arquivo `apps/client/.env.local`, que não vai para o git, ou variáveis da CI):

| Variável | Exemplo | Para quê |
|---|---|---|
| `VITE_SERVER_URL` | `wss://servidor.meu-jogo.example` | Endereço do servidor de jogo. **Obrigatório em produção.** Em desenvolvimento o cliente usa `/__server` na própria página, que o Vite repassa ao servidor; num build sem essa variável, tenta `:2567` no mesmo host |
| `VITE_PLATFORM` | `gamepush` | `web` (itch.io, site próprio) ou `gamepush` |
| `VITE_GAMEPUSH_PROJECT_ID` | `31385` | ID do projeto GamePush |
| `VITE_GAMEPUSH_PUBLIC_TOKEN` | `bSDL…` | Token **público** do GamePush (feito para ficar no cliente) |
| `VITE_BUILD_ID` | `v1.0.0` | Mostrado no rodapé do menu |

> Faça um build para cada destino: com `VITE_PLATFORM=gamepush` para o GamePush e `VITE_PLATFORM=web` para o itch.io.

### GamePush

1. No painel do GamePush, envie o `.zip` gerado por `pnpm pack:client`.
2. Para verificar jogadores no servidor, crie a **chave da Server API** no painel e defina `GAMEPUSH_PROJECT_ID` e `GAMEPUSH_API_SECRET` no servidor. Nunca coloque a chave no cliente nem no git.
3. Em `ALLOWED_ORIGINS`, inclua os domínios onde o GamePush (e as plataformas para onde ele distribui) servem o jogo. Confira o domínio real abrindo o jogo publicado e olhando o endereço do iframe.
4. Configure no painel a chave secreta e o ID de cada plataforma (Yandex etc.). O GamePush recomenda isso para impedir que contas sejam forjadas.

### itch.io

- Manual: crie um projeto "HTML", envie o `.zip` e marque "This file will be played in the browser".
- Automático: no GitHub, crie o segredo `BUTLER_API_KEY` (chave da API do itch.io) e a variável `ITCH_TARGET` (`usuario/jogo`). O workflow Release envia o cliente a cada tag.

## 3. Release pelo GitHub

1. Em **Settings → Secrets and variables → Actions**, configure as variáveis `VITE_SERVER_URL`, `VITE_PLATFORM`, `VITE_GAMEPUSH_PROJECT_ID` e `VITE_GAMEPUSH_PUBLIC_TOKEN` e, se quiser, `ITCH_TARGET` e o segredo `BUTLER_API_KEY`.
2. Crie um release em **Releases → Draft a new release**, com uma tag nova, por exemplo `v1.0.0` (ou pelo terminal: `git tag v1.0.0 && git push origin v1.0.0`).
3. O workflow publica a imagem do servidor no GHCR, anexa o `.zip` do cliente ao release e, se configurado, envia o cliente ao itch.io. Sem `VITE_SERVER_URL` o workflow avisa e **não** envia ao itch.io, porque esse cliente não acharia o servidor.

## 4. Escala horizontal

Com `REDIS_URL`, vários processos (ou máquinas) compartilham matchmaking e presença. Cada sala vive em **um** processo, e o jogador precisa se conectar justamente nele. Por isso:

- Cada processo precisa de um **endereço público próprio** em `PUBLIC_ADDRESS`. Exemplos: uma máquina por subdomínio (`eu-1.meu-jogo.example`), ou um proxy (nginx, Caddy) que repassa `meu-jogo.example/2568` para a porta 2568, com `PUBLIC_ADDRESS=meu-jogo.example/{port}`.
- O matchmaking (as requisições HTTP) pode passar por qualquer processo, então um load balancer comum serve para ele.
- Com PM2, `ecosystem.config.cjs` sobe um processo por núcleo quando `REDIS_URL` está definido (no ambiente ou em `apps/server/.env`). Cada processo escuta em `PORT` + o número dele: 2567, 2568, 2569...
- No **Colyseus Cloud** nada disso é preciso: ele configura Redis e endereços sozinho. Não defina `REDIS_URL` nem `PUBLIC_ADDRESS` lá.

Veja também a documentação do Colyseus sobre *scalability*. O código está pronto, mas essa configuração ainda não foi testada com Redis real.
