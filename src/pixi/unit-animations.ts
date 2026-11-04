import { baseTileSize, mapBorder } from "components/client-only/MatchRenderer";
import type { Application, Container, Resource, Texture } from "pixi.js";
import { AnimatedSprite, Sprite, Texture as PixiTexture } from "pixi.js";
import type { Army } from "shared/schemas/army";
import type { Position } from "shared/schemas/position";
import type { UnitType } from "shared/schemas/unit";
import type { LoadedSpriteSheet } from "./load-spritesheet";

export const movingUnitName = "movingUnit";

const msPerTile = 110;
const maxWalkMs = 900;
const flashMs = 420;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Animations = Record<string, Texture<Resource>[] | undefined>;

const textureListOf = (
  spriteSheets: LoadedSpriteSheet,
  army: Army,
  unitType: UnitType,
  suffix = "",
) => {
  const animations = spriteSheets[army].animations as Animations;

  return animations[`${unitType}${suffix}`] ?? animations[unitType] ?? [PixiTexture.EMPTY];
};

// The feet of the unit stand on the bottom middle of the tile.
const tileAnchor = ([x, y]: Position) => ({
  x: x * baseTileSize + mapBorder + baseTileSize / 2,
  y: (y + 1) * baseTileSize + mapBorder,
});

const walkingSuffix = (from: Position, to: Position) => {
  if (to[0] !== from[0]) {
    return "-mside";
  }

  return to[1] < from[1] ? "-mup" : "-mdown";
};

type WalkOptions = {
  app: Application;
  parent: Container;
  spriteSheets: LoadedSpriteSheet;
  unitType: UnitType;
  army: Army;
  path: Position[];
};

/**
 * Walks a copy of the unit along the path and leaves it on the last tile.
 * The caller decides what happens to it next: it's destroyed with the scene.
 */
export const walkAlongPath = ({ app, parent, spriteSheets, unitType, army, path }: WalkOptions) =>
  new Promise<AnimatedSprite>((resolve) => {
    const walker = new AnimatedSprite(textureListOf(spriteSheets, army, unitType));
    walker.name = movingUnitName;
    walker.anchor.set(0.5, 1);
    walker.zIndex = 900;
    walker.animationSpeed = 0.2;
    walker.position.copyFrom(tileAnchor(path[0]));
    walker.play();
    parent.addChild(walker);

    const lastSegment = path.length - 1;

    if (lastSegment < 1 || prefersReducedMotion()) {
      walker.position.copyFrom(tileAnchor(path[lastSegment]));
      resolve(walker);
      return;
    }

    const tileDuration = Math.min(msPerTile, maxWalkMs / lastSegment);
    let elapsed = 0;
    let currentSegment = -1;

    const onTick = () => {
      // the scene was rebuilt during the walk
      if (walker.destroyed) {
        app.ticker.remove(onTick);
        resolve(walker);
        return;
      }

      elapsed += app.ticker.deltaMS;

      const progress = elapsed / tileDuration;
      const segment = Math.min(Math.floor(progress), lastSegment - 1);
      const from = path[segment];
      const to = path[segment + 1];

      if (segment !== currentSegment) {
        currentSegment = segment;
        walker.textures = textureListOf(spriteSheets, army, unitType, walkingSuffix(from, to));
        walker.play();
        // the sprites all face right
        walker.scale.x = to[0] < from[0] ? -1 : 1;
      }

      const ratio = Math.min(progress - segment, 1);
      const fromAnchor = tileAnchor(from);
      const toAnchor = tileAnchor(to);
      walker.x = fromAnchor.x + (toAnchor.x - fromAnchor.x) * ratio;
      walker.y = fromAnchor.y + (toAnchor.y - fromAnchor.y) * ratio;

      if (progress >= lastSegment) {
        app.ticker.remove(onTick);
        walker.textures = textureListOf(spriteSheets, army, unitType);
        walker.scale.x = 1;
        walker.play();
        resolve(walker);
      }
    };

    app.ticker.add(onTick);
  });

/** A short flash on a tile: a unit got hit or was just built. */
export const flashTile = (app: Application, parent: Container, [x, y]: Position, color: string) => {
  if (prefersReducedMotion()) {
    return;
  }

  const flash = new Sprite(PixiTexture.WHITE);
  flash.width = baseTileSize;
  flash.height = baseTileSize;
  flash.x = x * baseTileSize + mapBorder;
  flash.y = y * baseTileSize + mapBorder;
  flash.tint = color;
  flash.zIndex = 950;
  flash.eventMode = "none";
  parent.addChild(flash);

  let elapsed = 0;

  const onTick = () => {
    if (flash.destroyed) {
      app.ticker.remove(onTick);
      return;
    }

    elapsed += app.ticker.deltaMS;

    // two quick pulses that fade out
    const progress = elapsed / flashMs;
    flash.alpha = Math.max(0, 1 - progress) * Math.abs(Math.cos(progress * Math.PI * 2)) * 0.85;

    if (progress >= 1) {
      app.ticker.remove(onTick);
      flash.destroy();
    }
  };

  app.ticker.add(onTick);
};
