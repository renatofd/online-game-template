# 0002: Pixel art com resolução interna fixa e zoom inteiro

**Status:** aceita

## Decisão
- Resolução interna **640×360** (16:9), tiles **16×16**.
- `pixelArt: true` no Phaser (nearest-neighbor, sem antialias, `roundPixels`). Sprites **não giram nem escalam**; se isso mudar, avaliar `smoothPixelArt`.
- Zoom **inteiro** (2x em 1280×720, 3x em 1920×1080). Zoom fracionário só quando a janela é menor que 640×360.
- Tilesets **extrudados** (margem 1, espaçamento 2) para evitar linhas entre tiles.

## Consequências
- Cada pixel da arte vira um bloco NxN exato na tela.
- Em telas cuja proporção não é 16:9 aparecem bordas (letterbox).
- Texto do HUD é desenhado em baixa resolução, com estética pixelada.
