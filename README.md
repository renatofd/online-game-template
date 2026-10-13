# Online Game Template

Base para jogos online web: começa como um jogo estilo `.io` e foi organizada para poder crescer até um multiplayer massivo.

**Stack:** Phaser 4 · TypeScript · Tiled · Pixel art (nearest-neighbor, zoom inteiro) · Colyseus 0.18 (servidor autoritativo) · Vite · pnpm · Biome · Vitest

> Status: **fundação.** Um jogador anda por um mapa do Tiled, vê os outros jogadores, com predição no cliente e servidor autoritativo. Ainda não há gameplay.

## Requisitos

- [Node.js 22+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (`corepack enable` já ativa a versão certa)
- Opcional: [Tiled](https://www.mapeditor.org/) para editar mapas

## Rodando

```bash
pnpm install
pnpm dev            # servidor (ws://localhost:2567) + cliente (http://localhost:3000)
```

Abra http://localhost:3000 em **duas ou mais abas** para ver os jogadores sincronizando. Use `?name=Ana` na URL para escolher o nome.

- **Simular internet ruim:** em modo dev aparece o painel de debug do Colyseus. Nele, ou no console do navegador com `__net(150, 30)` (150 ms de ping ± 30 ms de jitter), você testa lag sem precisar de outra rede. Use `__net()` para desligar.
- **Testar no celular:** com o celular na mesma Wi-Fi, abra `http://<ip-do-seu-pc>:3000`.
- **Bots:** com o servidor rodando, `pnpm loadtest` coloca 20 jogadores falsos andando pelo mapa.
- **Monitor do servidor (dev):** http://localhost:2567/monitor

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor + cliente em modo desenvolvimento |
| `pnpm test` | Testes unitários e de integração (Vitest) |
| `pnpm typecheck` | Checagem de tipos em todos os pacotes |
| `pnpm lint` / `pnpm lint:fix` | Revisão automática de código e formatação (Biome) |
| `pnpm maps:validate` | Confere se os mapas seguem as convenções do projeto |
| `pnpm check` | Tudo acima de uma vez (o mesmo que a CI roda) |
| `pnpm build` | Build de produção do cliente (`apps/client/dist`) e do servidor (`apps/server/build`) |
| `pnpm loadtest` | Bots para teste de carga |
| `pnpm assets:placeholder` | Regera a arte e o mapa provisórios (sobrescreve!) |

## Estrutura

```text
apps/client       Cliente Phaser 4 (cenas, render, input, rede, adaptadores de plataforma)
apps/server       Servidor Colyseus (salas, tick fixo, carregamento de mapas)
packages/shared   Simulação de jogo pura (movimento, colisão) usada por servidor E cliente
packages/protocol Contrato de rede: nomes de salas, schemas de estado e de input
packages/maps     Leitura e validação de mapas Tiled sem Phaser
content/          Fontes de conteúdo: mapas (.tmj), tilesets, sprites
tools/assets      Geração de arte provisória e validação de mapas
tools/loadtest    Bots para teste de carga
docs/             Arquitetura, pesquisa, testes, decisões
```

Detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Como criar mapas: [`content/README.md`](content/README.md).

## Configuração

| Variável | Onde | Padrão | Uso |
|---|---|---|---|
| `VITE_SERVER_URL` | cliente | `ws://<host da página>:2567` | URL do servidor de jogo em produção |
| `VITE_PLATFORM` | cliente | `web` | `web` ou `gamepush` |
| `PORT` | servidor | `2567` | Porta do servidor |
| `MAPS_DIR` | servidor | `<repo>/content/maps` | Pasta dos mapas `.tmj` |

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): princípios, estrutura, fluxo de dados e caminho de escalabilidade
- [`docs/RESEARCH.md`](docs/RESEARCH.md): pesquisa sobre jogos online web, GamePush, hospedagem e decisões
- [`docs/TESTING.md`](docs/TESTING.md): estratégia de testes do multiplayer (sem precisar de vários jogadores)
- [`docs/adr/`](docs/adr/): registros de decisões de arquitetura
