# Conteúdo (mapas, tilesets, sprites)

Esta pasta é a **fonte única** do conteúdo. O cliente importa daqui (via Vite) e o servidor lê os mesmos mapas para colisão e spawns, então os dois nunca ficam fora de sincronia.

```text
content/
├── maps/
│   ├── game.tiled-project   Abra este arquivo no Tiled (define a classe "spawn")
│   └── arena.tmj            Mapa de exemplo
├── tilesets/terrain.png     Tileset provisório (16x16, extrudado)
└── sprites/player.png       Sprite provisório do jogador (corpo branco para receber cor)
```

A arte atual é **provisória**, gerada por `pnpm assets:placeholder`. Substitua os PNGs à vontade, mas **não rode esse comando depois**, porque ele sobrescreve os arquivos.

## Convenções de mapas (checadas por `pnpm maps:validate` na CI)

- **Orientação ortogonal**, mapa **não infinito**, tiles de **16x16**.
- **Tileset embutido** no mapa (o Phaser não carrega tilesets externos `.tsx`). No Tiled, use *Map → Embed Tileset* ou crie o tileset já embutido.
- Tileset de **uma imagem só** (não use "Collection of Images").
- Formato da layer de tiles: **CSV** (*Map Properties → Tile Layer Format*).
- Exportar como **JSON** com extensão `.tmj`.

### Layers

| Layer | Tipo | Uso |
|---|---|---|
| `ground` | Tiles | Chão |
| `walls` | Tiles | Paredes e obstáculos |
| `objects` | Objetos | **Obrigatória.** Pontos de spawn e, no futuro, zonas, portais e itens |

Pode adicionar outras layers de tiles; todas são desenhadas na ordem do Tiled.

### Colisão

No editor de tileset do Tiled, marque nos tiles que bloqueiam a propriedade booleana **`collides = true`**. Qualquer célula de qualquer layer com um tile assim é sólida, tanto no servidor quanto na predição do cliente.

### Spawns

Na layer `objects`, adicione **pontos** (ou retângulos) com a classe **`spawn`**. Os jogadores nascem neles em rodízio.

## Tilesets e pixel art

- Os tiles são **extrudados** (margem 1px, espaçamento 2px, com a borda de cada tile duplicada) para evitar linhas entre tiles. Para extrudar um tileset novo, use [tile-extruder](https://github.com/sporadic-labs/tile-extruder) e configure *margin = 1* e *spacing = 2* no Tiled.
- Mantenha tudo em múltiplos de 16px e sem antialiasing.

## Adicionando um mapa novo

1. Crie `content/maps/<id>.tmj` seguindo as convenções acima.
2. Registre a URL em `game/client/src/assets.ts` (`MAPS`). Se ele usar um tileset novo, registre também em `TILESETS`, com o **mesmo nome do tileset no Tiled**.
3. Crie a sala com `{ mapId: "<id>" }` (veja `game/server/src/rooms/ArenaRoom.ts`).
4. Rode `pnpm maps:validate`.
