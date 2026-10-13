# Estratégia de Testes do Multiplayer

**Não é preciso juntar vários jogadores para testar.** Quase tudo é testado sozinho, no próprio computador, com automação. Jogadores reais só entram no fim, para avaliar diversão e balanceamento.

## Camadas de teste

| # | Tipo | O que valida | Como | Quem |
|---|---|---|---|---|
| 1 | **Testes unitários** | Regras e simulação (movimento, colisão, codec binário) | Vitest em `packages/shared` e `packages/protocol`; rodam em segundos e na CI | Automático |
| 2 | **Várias abas/janelas** | Sincronização visual entre clientes | Servidor local + 2–4 abas do navegador (ou um celular na mesma rede Wi-Fi) | Você sozinho |
| 3 | **Simulador de rede ruim** | Predição, interpolação, reconexão com lag e perda de pacotes | Modo de debug no cliente que adiciona atraso/jitter/perda artificial (ex.: `?lag=150&jitter=30&loss=2`) + painel com ping, tick e bytes/s | Você sozinho |
| 4 | **Bots** | Servidor com muitos "jogadores" | `tools/loadtest`: clientes headless em Node que conectam e enviam inputs aleatórios. Ex.: 100 bots + você jogando no navegador | Automático |
| 5 | **Teste de carga** | Quantos jogadores um servidor aguenta | Aumentar os bots até o tempo de tick passar do limite (ex.: 50 ms a 20 Hz); medir CPU, memória e banda | Automático |
| 6 | **Teste ponta a ponta** | O jogo abre, conecta e dois clientes se veem | Playwright abrindo 2+ navegadores automatizados, na CI | Automático |
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
