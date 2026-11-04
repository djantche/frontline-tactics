import type { FrontendUnit } from "frontend/components/match/FrontendUnit";
import type { ChangeableTileWithSprite } from "frontend/components/match/types";
import type { Application } from "pixi.js";
import type { Position } from "shared/schemas/position";
import type { MatchWrapper } from "shared/wrappers/match";
import type { LoadedSpriteSheet } from "./load-spritesheet";
import { renderInvisInteractiveTiles, renderMap } from "./renderMap";
import { renderUnits } from "./renderUnits";

/** Replaces the scene of the application with the one of this match state. */
export function setupScene(
  app: Application,
  match: MatchWrapper<ChangeableTileWithSprite, FrontendUnit>,
  spriteSheets: LoadedSpriteSheet,
  onTileClick: (pos: Position) => Promise<void>,
  onTileHover: (pos: Position) => void,
) {
  for (const child of app.stage.removeChildren()) {
    child.destroy({ children: true, texture: false, baseTexture: false });
  }

  app.stage.position.set(0, 0);
  app.stage.sortableChildren = true;

  const mapContainer = renderMap(match, spriteSheets);
  const unitContainer = renderUnits(match, spriteSheets);
  const interactiveContainer = renderInvisInteractiveTiles(match, onTileClick, onTileHover);

  mapContainer.name = "mapContainer";
  unitContainer.name = "childContainer";
  unitContainer.sortableChildren = true;
  interactiveContainer.name = "interactiveTilesContainer";

  app.stage.addChild(mapContainer, unitContainer, interactiveContainer);

  return { mapContainer, unitContainer, interactiveContainer };
}
