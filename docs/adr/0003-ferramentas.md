# 0003: Ferramentas de desenvolvimento

**Status:** aceita

| Ferramenta | Papel |
|---|---|
| **pnpm workspaces** | Monorepo: `apps/*`, `packages/*`, `tools/*` |
| **TypeScript (strict)** | Tipos em tudo. Pacotes internos exportam `.ts` direto (sem etapa de build própria) |
| **Vite** | Dev server e build do cliente |
| **tsx / esbuild** | Rodar o servidor em dev / gerar o bundle de produção |
| **Biome** | Lint + formatação numa ferramenta só (`pnpm lint`, `pnpm lint:fix`) |
| **Vitest** | Testes unitários e de integração (inclui sala Colyseus real via `@colyseus/testing`) |
| **GitHub Actions** | CI: lint, typecheck, validação de mapas, testes e build a cada push/PR |

## Consequências
- `pnpm check` roda localmente a mesma checagem da CI.
- Pacotes internos não precisam de build: Vite (cliente), tsx (dev) e esbuild (produção) compilam o TypeScript dos workspaces.
