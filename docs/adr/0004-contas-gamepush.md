# 0004: Contas de jogador via GamePush

**Status:** aceita (implementação na Prioridade 2)

## Contexto
Os jogos são distribuídos pelo GamePush, que já tem contas de jogador, login pelas plataformas, dados salvos, leaderboards e pagamentos. O servidor de jogo (Colyseus) precisa saber **quem** é o jogador de forma confiável.

## Decisão
- **Identidade:** GamePush. O cliente envia ao entrar na sala os dados de autorização do jogador (`gp.player._authInfo`, mais plataforma). O servidor confirma na **Server API do GamePush** (`GetPlayer`, com o cabeçalho `X-Player-Data`) e usa o id retornado. Isso vai em `GameRoom.authenticate()`.
- **Dados casuais** (preferências, cosméticos, recorde pessoal): campos do jogador no GamePush, gravados pelo cliente.
- **Dados que valem algo** (moeda, progresso competitivo, inventário): gravados **pelo servidor** via `SyncPlayer` com a `X-API-Secret`, nunca pelo cliente. O cliente pode alterar os próprios campos pelo SDK, então eles não servem para nada que dê vantagem.
- **Sem GamePush** (itch.io, dev): jogador convidado, que é o comportamento atual.

## Alternativas
- **Contas próprias + Postgres:** controle total, mas obriga a refazer login, recuperação de senha, LGPD/GDPR etc. Fica para quando um jogo (ex.: MMO) precisar de dados de mundo em grande volume.
- **Colyseus Auth (`@colyseus/auth`):** útil para login próprio (e-mail/OAuth). Não aproveita as contas das plataformas.

## Consequências
- Cada chamada à API do GamePush conta como requisição: verificar no `onAuth`, não a cada tick.
- `_authInfo` tem prefixo de campo interno; acompanhar mudanças na API do GamePush.
- A `X-API-Secret` fica só no servidor, como variável de ambiente.
- Para MMO com muitos dados de mundo, é provável combinar: GamePush para a identidade e banco próprio para o estado do mundo.

Fontes: [GamePush Server API](https://docs.gamepush.com/docs/api/), [Estado do jogador](https://docs.gamepush.com/docs/player/player-state/), [Autorização](https://docs.gamepush.com/docs/authorization/).
