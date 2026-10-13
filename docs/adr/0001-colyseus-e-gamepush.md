# 0001: Colyseus para tempo real, GamePush para plataforma

**Status:** aceita

## Contexto
O jogo começa como `.io` (dezenas de jogadores por sala) e deve poder evoluir para MMO. O autor já usa o GamePush para hospedagem e distribuição, e o GamePush tem um módulo de multiplayer.

## Decisão
- **Tempo real:** servidor autoritativo com **Colyseus** (Node/TypeScript, MIT).
- **GamePush:** hospedagem e distribuição do cliente, conta do jogador, leaderboards, anúncios e pagamentos, isolados atrás da interface `Platform` no cliente.

## Alternativas
- **GamePush Multiplayer:** descartado como base. É *host-based*: um jogador mantém o estado, o que abre espaço para trapaça, faz a qualidade depender da conexão do host e não oferece caminho para zonas/MMO. Serve bem para jogos casuais de poucos jogadores.
- **Servidor próprio (uWebSockets.js):** mais controle, mas exige escrever salas, reconexão, matchmaking e sincronização. Continua possível no futuro porque a simulação está em `packages/shared`.
- **Nakama / SpacetimeDB:** ver `RESEARCH.md` §4.

## Consequências
- O servidor de jogo precisa de hospedagem própria (local no desenvolvimento; Colyseus Cloud ou VPS em produção).
- O Colyseus 0.18 já fornece predição, reconciliação, interpolação, reconexão e simulador de latência.
- Pendente: confirmar se as plataformas de distribuição do GamePush permitem conexão WebSocket a um domínio externo, e como validar no servidor a identidade do jogador do GamePush.
