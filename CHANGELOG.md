# Changelog

Mudanças do template. Jogos derivados: leia antes de `git merge template/main`. Veja [`docs/TEMPLATE.md`](docs/TEMPLATE.md).

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
