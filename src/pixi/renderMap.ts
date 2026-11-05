import { baseTileSize, mapBorder } from "components/client-only/MatchRenderer";
import type { FrontendUnit } from "frontend/components/match/FrontendUnit";

import type { ChangeableTileWithSprite } from "frontend/components/match/types";

import { AnimatedSprite, Container, Sprite, Texture } from "pixi.js";
import type { Position } from "shared/schemas/position";
import type { Tile } from "shared/schemas/tile";
import type { ChangeableTile } from "shared/types/server-match-state";
import type { MatchWrapper } from "shared/wrappers/match";
import type { LoadedSpriteSheet } from "./load-spritesheet";

import { coastalSpriteCandidates } from "shared/map/coastal-sprites";
import { terrainFrameCandidates, propertyAnimationName } from "shared/map/terrain-appearance";
import { coastalWeather } from "frontend/map/coastal-atlas";

function getTileSprite(
  match: MatchWrapper,
  tile: ChangeableTile | Tile,
  spriteSheets: LoadedSpriteSheet,
  x: number,
  y: number,
  tiles: Tile[][],
): Sprite {
  const weather = match.getCurrentWeather();
  const coast = spriteSheets.coastal?.[coastalWeather(weather)];
  const coastal =
    coast === undefined
      ? undefined
      : coastalSpriteCandidates(tile as Tile, x, y, tiles).find(
          (name) => coast.animations[name] !== undefined,
        );

  if (coast !== undefined && coastal !== undefined) {
    const sprite = new AnimatedSprite(coast.animations[coastal]);
    sprite.animationSpeed = 0.1;
    sprite.play();

    if (tile.type === "reef") {
      const water = coastalSpriteCandidates({ type: "sea" }, x, y, tiles).find(
        (name) => coast.animations[name] !== undefined,
      );

      if (water !== undefined) {
        const background = new AnimatedSprite(coast.animations[water]);
        background.animationSpeed = 0.1;
        background.play();
        sprite.anchor.set(0, 1);
        background.addChild(sprite);
        return background;
      }
    }

    return sprite;
  }

  if (!("playerSlot" in tile) || tile.playerSlot === -1) {
    const visibleTile =
      "fired" in tile && tile.fired ? { type: "usedSilo" as const } : (tile as Tile);
    const frame = terrainFrameCandidates(visibleTile, weather).find(
      (name) => spriteSheets.neutral.textures[name] !== undefined,
    );
    return new Sprite(frame === undefined ? Texture.EMPTY : spriteSheets.neutral.textures[frame]);
  }

  const player = match.getPlayerBySlot(tile.playerSlot);

  if (player === undefined) {
    throw new Error("Could not find player while rendering owned tile");
  }

  const animations = spriteSheets[player.data.army].animations as Record<string, Texture[]>;
  const frames = animations[propertyAnimationName(tile.type, weather)] ?? animations[tile.type];
  const sprite = new AnimatedSprite(frames);
  sprite.animationSpeed = 0.04;
  sprite.play();
  return sprite;
}

export function renderMap(
  match: MatchWrapper<ChangeableTileWithSprite, FrontendUnit>,
  spriteSheets: LoadedSpriteSheet,
) {
  const mapContainer = new Container(); // TODO add x,y values for margin/border
  mapContainer.x = mapBorder;
  mapContainer.y = mapBorder;

  const visibleTiles = match.map.data.tiles.map((row, y) =>
    row.map((_, x) => match.getTile([x, y]) as Tile),
  );

  for (let y = 0; y < match.map.data.tiles.length; y++) {
    for (let x = 0; x < match.map.data.tiles[y].length; x++) {
      const tile = match.getTile([x, y]);

      const tileSprite = getTileSprite(match, tile, spriteSheets, x, y, visibleTiles);

      // makes our sprites render at the bottom, not from the top.
      tileSprite.anchor.set(0, 1);

      tileSprite.x = x * baseTileSize;
      tileSprite.y = (y + 1) * baseTileSize;
      tileSprite.zIndex = y;
      mapContainer.addChild(tileSprite);

      if ("sprite" in tile) {
        tile.sprite = tileSprite;
      }
    }
  }

  //allows for us to use zIndex on the children of mapContainer
  mapContainer.sortableChildren = true;

  return mapContainer;
}

export const renderInvisInteractiveTiles = (
  match: MatchWrapper<ChangeableTileWithSprite, FrontendUnit>,
  onTileClick: (pos: Position) => Promise<void>,
  onTileHover: (pos: Position) => void,
) => {
  const mapContainer = new Container();
  mapContainer.x = baseTileSize / 2;
  mapContainer.y = baseTileSize / 2;

  for (let y = 0; y < match.map.data.tiles.length; y++) {
    for (let x = 0; x < match.map.data.tiles[y].length; x++) {
      const tileSprite = new Sprite(Texture.EMPTY);
      tileSprite.height = baseTileSize;
      tileSprite.width = baseTileSize;

      // makes our sprites render at the bottom, not from the top.
      tileSprite.anchor.set(0, 1);

      tileSprite.x = x * baseTileSize;
      tileSprite.y = (y + 1) * baseTileSize;

      tileSprite.interactive = true;
      tileSprite.on("pointertap", () => {
        void onTileClick([x, y]);
      });
      tileSprite.on("pointerenter", () => {
        onTileHover([x, y]);
      });

      mapContainer.addChild(tileSprite);
    }
  }

  //allows for us to use zIndex on the children of mapContainer
  mapContainer.sortableChildren = true;

  return mapContainer;
};
