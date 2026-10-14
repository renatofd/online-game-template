# 0003: Ferramentas de desenvolvimento

**Status:** aceita

| Ferramenta | Papel |
|---|---|
| **pnpm workspaces** | Monorepo: `packages/*` (núcleo), `game/*` (jogo), `apps/*`, `tools/*` |
| **TypeScript (strict)** | Tipos em tudo. Pacotes internos exportam `.ts` direto (sem etapa de build própria) |
| **Vite** | Dev server e build do cliente |
| **tsx / esbuild** | Rodar o servidor em dev / gerar o bundle de produção |
| **Biome** | Lint + formatação numa ferramenta só (`pnpm lint`, `pnpm lint:fix`) |
| **Vitest** | Testes unitários e de integração (inclui sala Colyseus real via `@colyseus/testing`) |
| **GitHub Actions** | CI: lint, typecheck, validação de conteúdo, testes, build e e2e a cada push/PR |

## Consequências
- `pnpm check` roda localmente a maior parte da checagem da CI (a CI também faz o build e os testes e2e).
- Pacotes internos não precisam de build: Vite (cliente), tsx (dev) e esbuild (produção) compilam o TypeScript dos workspaces.
