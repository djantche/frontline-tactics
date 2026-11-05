import type { Army } from "shared/schemas/army";
import type { Tile } from "shared/schemas/tile";
import type { Weather } from "shared/schemas/weather";
import { terrainFrameCandidates } from "shared/map/terrain-appearance";
import { coastalSpriteCandidates } from "shared/map/coastal-sprites";
import { loadCoastalAtlas, coastalWeather } from "./coastal-atlas";
import type { CoastalAtlas } from "./coastal-atlas";

export const tileSize = 16;
/** HQs are 31px tall, so the top row needs room above the map to not be cut off. */
export const mapTopMargin = tileSize;

type Frame = { x: number; y: number; w: number; h: number };
export type AtlasFrame = {
  frame: Frame;
  rotated?: boolean;
  trimmed?: boolean;
  spriteSourceSize?: Frame;
  sourceSize?: { w: number; h: number };
};

export type SpriteSheet = {
  image: CanvasImageSource;
  frames: Record<string, AtlasFrame>;
  animations?: Record<string, string[]>;
};

type SheetName = Army | "neutral";
export type SpriteSheets = Record<SheetName, SpriteSheet> & { coastal?: CoastalAtlas };

const sheetNames: SheetName[] = [
  "neutral",
  "orange-star",
  "blue-moon",
  "green-earth",
  "yellow-comet",
  "black-hole",
];

const loadSheet = async (name: SheetName): Promise<SpriteSheet> => {
  const response = await fetch(`/img/spriteSheet/${name}.json`);

  if (!response.ok) {
    throw new Error(`Could not load sprites: ${name}`);
  }

  const { frames, animations } = (await response.json()) as Omit<SpriteSheet, "image">;

  const image = new Image();
  image.src = `/img/spriteSheet/${name}.png`;
  await image.decode();

  return { image, frames, animations };
};

let sheetsPromise: Promise<SpriteSheets> | undefined;

/** Loads every sheet once, all canvases of the page share them. */
export const loadSpriteSheets = () => {
  sheetsPromise ??= Promise.all([Promise.all(sheetNames.map(loadSheet)), loadCoastalAtlas()])
    .then(
      ([sheets, coastal]) =>
        ({
          ...Object.fromEntries(sheets.map((sheet, index) => [sheetNames[index], sheet])),
          coastal,
        }) as SpriteSheets,
    )
    .catch((error: unknown) => {
      sheetsPromise = undefined;
      throw error;
    });

  return sheetsPromise;
};

/** The army shown for each player slot of a map that isn't in a match. */
export const defaultArmies: Army[] = ["orange-star", "blue-moon"];

export const drawFrame = (
  context: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  frameName: string,
  x: number,
  y: number,
) => {
  const sprite = sheet.frames[frameName];

  if (sprite === undefined) {
    return;
  }

  const { frame } = sprite;
  const source = sprite.sourceSize ?? frame;
  const offset = sprite.trimmed === true ? sprite.spriteSourceSize : undefined;
  const left = x * tileSize + (offset?.x ?? 0);
  const top = mapTopMargin + (y + 1) * tileSize - source.h + (offset?.y ?? 0);

  // TexturePacker rotates packed sprites clockwise. Frame dimensions remain
  // logical dimensions (as in Pixi's Spritesheet parser); the atlas crop is h × w.
  if (sprite.rotated === true) {
    context.save();
    context.translate(left, top + frame.h);
    context.rotate(-Math.PI / 2);
    context.drawImage(sheet.image, frame.x, frame.y, frame.h, frame.w, 0, 0, frame.h, frame.w);
    context.restore();
    return;
  }

  context.drawImage(sheet.image, frame.x, frame.y, frame.w, frame.h, left, top, frame.w, frame.h);
};

export const drawTile = (
  context: CanvasRenderingContext2D,
  sheets: SpriteSheets,
  tile: Tile,
  x: number,
  y: number,
  armies: Army[] = defaultArmies,
  weather: Weather = "clear",
  tiles?: Tile[][],
) => {
  const coast = sheets.coastal;
  const coastal =
    coast === undefined
      ? undefined
      : coastalSpriteCandidates(tile, x, y, tiles).find(
          (name) => coast.animations[name] !== undefined,
        );

  if (coast !== undefined && coastal !== undefined) {
    const sheet = { image: coast.images[coastalWeather(weather)], frames: coast.frames };

    if (tile.type === "reef") {
      const water = coastalSpriteCandidates({ type: "sea" }, x, y, tiles).find(
        (name) => coast.animations[name] !== undefined,
      );

      if (water !== undefined) {
        drawFrame(context, sheet, coast.animations[water][0], x, y);
      }
    }

    drawFrame(context, sheet, coast.animations[coastal][0], x, y);
    return;
  }

  const army = "playerSlot" in tile ? armies[tile.playerSlot] : undefined;
  const sheet = army === undefined ? sheets.neutral : sheets[army];
  const name = terrainFrameCandidates(tile, weather).find(
    (candidate) => sheet.frames[candidate] !== undefined,
  );

  if (name !== undefined) {
    drawFrame(context, sheet, name, x, y);
  }
};

export const drawMap = (
  context: CanvasRenderingContext2D,
  sheets: SpriteSheets,
  tiles: Tile[][],
  armies?: Army[],
  weather: Weather = "clear",
) => {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      drawTile(context, sheets, tile, x, y, armies, weather, tiles);
    });
  });
};

export const mapPixelSize = (tiles: Tile[][]) => ({
  width: (tiles[0]?.length ?? 0) * tileSize,
  height: tiles.length * tileSize + mapTopMargin,
});
