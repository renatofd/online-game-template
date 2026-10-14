# Usando o template

Este repositório é a **base** de vários jogos. Cada jogo vive no seu próprio repositório, criado a partir daqui, e continua recebendo as melhorias do template.

## Quem é dono de quê

A regra que mantém as atualizações simples: **o jogo só edita as pastas do jogo**. O resto pertence ao template e chega por atualização.

| Pasta | Dono | No repositório do jogo |
|---|---|---|
| `game/shared`, `game/server`, `game/client` | **Jogo** | Edite à vontade: regras, salas, cenas, sprites, textos |
| `content/` | **Jogo** | Mapas, tilesets, sprites, áudio |
| `packages/core-*` | Template | Não edite. Precisa mudar algo? Faça no template e atualize (veja abaixo) |
| `apps/client`, `apps/server` | Template | Só ligam o núcleo ao jogo. Raramente precisa mexer |
| `tools/`, `docs/`, configs da raiz | Template | Pode ajustar, mas espere conflitos ao atualizar |

O jogo de exemplo ("Arena Demo") está todo em `game/` e `content/`. Ele serve de referência e pode ser apagado ou reescrito.

## Começar um jogo novo

**Recomendado: clonar mantendo o histórico.** Com o histórico em comum, as atualizações do template viram um `git merge` normal.

```bash
# 1. Crie um repositório vazio no GitHub para o jogo (sem README), ex.: meu-usuario/space-blobs

# 2. Clone o template e aponte para o novo repositório
git clone https://github.com/renatofd/online-game-template.git space-blobs
cd space-blobs
git remote rename origin template
git config remote.template.tagOpt --no-tags   # as tags do template não se misturam às do jogo
git remote add origin https://github.com/meu-usuario/space-blobs.git

# 3. Dê nome ao jogo
pnpm install
pnpm init-game --name "Space Blobs"

# 4. Primeiro commit e push
git add -A
git commit -m "chore: start Space Blobs from template"
git push -u origin main
```

> O botão **"Use this template"** do GitHub também funciona, mas cria um histórico sem ligação com o template. Aí a primeira atualização precisa de `git merge template/main --allow-unrelated-histories` e costuma dar muitos conflitos. Prefira o clone.

### Checklist do jogo novo

1. `pnpm init-game --name "..."` (título, id, nome do pacote).
2. Troque as regras em `game/shared` (constantes, `stepPlayer`, schemas) e **aumente `PROTOCOL_VERSION`** sempre que schemas ou mensagens mudarem.
3. Troque a sala em `game/server/src/rooms`.
4. Troque cena, render e assets em `game/client`. Os textos do jogo ficam em `game/client/src/messages.ts`, nos 14 idiomas.
5. Troque a arte e os mapas em `content/` (veja `content/README.md`).
6. Ajuste `game/client/src/bot.ts` para os bots mandarem os inputs do seu jogo.
7. `pnpm check` antes de cada push. A CI roda isso, mais o build e os testes e2e.

## Receber atualizações do template

```bash
git fetch template
git merge template/main
pnpm install
pnpm check
```

- Leia o [`CHANGELOG.md`](../CHANGELOG.md) antes: ele avisa o que exige mudança no jogo (**Breaking**).
- O arquivo `TEMPLATE_VERSION` diz em qual versão do template o jogo está.
- Se o jogo não editou `packages/core-*` nem `apps/*`, os conflitos ficam restritos a arquivos de configuração e docs.

## Mudar o núcleo

Precisa de algo novo no núcleo (um recurso de rede, um tipo de tela, uma plataforma)?

1. Faça a mudança **no repositório do template**, com testes, e publique uma versão no `CHANGELOG.md`.
2. Nos jogos, rode `git fetch template` e depois `git merge template/main`.

Se for urgente, dá para mudar no jogo e depois levar para o template com `git cherry-pick`. Só não deixe a mudança morar apenas no jogo, senão ela vira conflito em toda atualização.

## Versões do template

O template segue [SemVer](https://semver.org/lang/pt-BR/) em `TEMPLATE_VERSION` e no `package.json` da raiz, com tags git `vX.Y.Z`:

- **patch** (0.2.1): correções, sem mudança de API
- **minor** (0.3.0): recursos novos compatíveis
- **major** (1.0.0): mudanças que exigem ajustes nos jogos (descritas no CHANGELOG)

Enquanto estiver em `0.x`, versões *minor* também podem ter breaking changes, sempre listadas no CHANGELOG.
