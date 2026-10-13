# Estratégia de Testes do Multiplayer

**Não é preciso juntar vários jogadores para testar.** Quase tudo é testado sozinho, no próprio computador, com automação. Jogadores reais só entram no fim, para avaliar diversão e balanceamento.

## Camadas de teste

| # | Tipo | O que valida | Como | Quem |
|---|---|---|---|---|
| 1 | **Testes unitários e de integração** | Movimento, colisão, leitura de mapas e a sala real do servidor | `pnpm test` (Vitest): núcleo (`packages/core-*`: colisão, nomes, versões, idiomas, mapas, `GameRoom`) e jogo (`game/*`: movimento, sala real com clientes de teste, traduções) | Automático |
| 2 | **Várias abas/janelas** | Sincronização visual entre clientes | Servidor local + 2–4 abas do navegador (ou um celular na mesma rede Wi-Fi) | Você sozinho |
| 3 | **Simulador de rede ruim** | Predição, interpolação e reconexão com lag | Painel de debug do Colyseus (abra com `?debug` na URL). No console: `__net(150, 30)` = 150 ms ± 30 ms; `__net()` desliga. O botão **Drop** derruba a conexão para testar reconexão. O HUD mostra ping e fps | Você sozinho |
| 4 | **Bots** | Servidor com muitos "jogadores" | `pnpm loadtest` (20 bots). Para mais: `pnpm --filter @tools/loadtest exec tsx src/bots.ts --endpoint ws://localhost:2567 --room arena --numClients 200` | Automático |
| 5 | **Teste de carga** | Quantos jogadores um servidor aguenta | Aumentar os bots e acompanhar `game_tick_duration_ms` em `GET /metrics`: a 30 Hz cada tick tem ~33 ms. Medir também CPU, memória e banda | Automático |
| 6 | **Teste ponta a ponta** | O jogo abre, dois clientes entram, menu de pausa, árabe RTL, joystick no celular | `pnpm e2e` (Playwright, `tools/e2e`): sobe servidor e cliente sozinho e roda na CI. Para usar um Chromium já instalado: `PW_CHROMIUM_PATH=/caminho/chromium pnpm e2e` | Automático |
| 7 | **Playtest real** | Diversão, balanceamento, latência real entre regiões | Amigos/Discord → build público no itch.io → GamePush | Pessoas |

## Ordem recomendada

1. Camadas 1–3 durante todo o desenvolvimento (custo zero, tudo local).
2. Camadas 4–6 assim que existir o loop básico de jogo.
3. Camada 7 só quando o jogo estiver jogável e estável. Os bots também resolvem o problema de "sala vazia" nos primeiros testes públicos.

## Métricas a acompanhar desde o início

- Tempo de tick do servidor (p50/p99)
- Jogadores conectados por sala/processo
- Bytes/s enviados por cliente
- RTT (ping) e correções de predição por segundo no cliente
