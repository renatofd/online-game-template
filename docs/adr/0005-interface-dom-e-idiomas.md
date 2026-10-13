# 0005: Interface em DOM e 14 idiomas

**Status:** aceita

## Contexto
Os jogos devem funcionar bem no celular e em 14 idiomas: inglês, português, espanhol, francês, alemão, italiano, turco, russo, árabe, hindi, indonésio, japonês, chinês e coreano. Isso inclui árabe (direita para a esquerda, com letras que mudam de forma), hindi (devanágari) e as escritas CJK.

## Decisão
- **Menus, diálogos e HUD em DOM** (HTML/CSS sobre o canvas), não em texto do Phaser. O navegador já cuida de RTL, formas das letras, fontes de todas as escritas, teclado virtual/IME, leitores de tela e nitidez em qualquer zoom.
- **i18n própria e pequena** (`@core/client/i18n`): chaves com fallback para inglês, `{parâmetros}`, plurais via `Intl.PluralRules`, números via `Intl.NumberFormat`. As mensagens do núcleo são tipadas (faltar tradução é erro de compilação). As do jogo têm um teste que lista o que falta.
- **Idioma inicial:** escolha salva, depois idioma da plataforma (GamePush), depois do navegador, depois inglês.
- **CSS com propriedades lógicas** (`inline`/`block`) para o layout espelhar no árabe. O joystick fica sempre à esquerda.
- Textos **dentro do mundo** (nomes acima dos personagens) continuam no Phaser, com fontes do sistema.

## Consequências
- Nenhuma dependência de biblioteca de i18n.
- Fontes do sistema em vez de fonte pixel na interface. Um jogo pode trocar o tema via variáveis `--ui-*`, mas uma fonte pixel só cobriria as escritas latinas.
- Nomes no mundo usam a resolução do canvas (640×360), então escritas complexas em fonte pequena ficam menos legíveis. Se virar problema, esses rótulos podem ir para o DOM.
