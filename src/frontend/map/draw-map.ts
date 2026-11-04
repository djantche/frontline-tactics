import type { Army } from "shared/schemas/army";
import type { Tile } from "shared/schemas/tile";

export const tileSize = 16;
/** HQs are 31px tall, so the top row needs room above the map to not be cut off. */
export const mapTopMargin = tileSize;

type Frame = { x: number; y: number; w: number; h: number };

export type SpriteSheet = {
  image: HTMLImageElement;
  frames: Record<string, { frame: Frame }>;
  animations?: Record<string, string[]>;
};

type SheetName = Army | "neutral";
export type SpriteSheets = Record<SheetName, SpriteSheet>;

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
  const { frames, animations } = (await response.json()) as Omit<SpriteSheet, "image">;

  const image = new Image();
  image.src = `/img/spriteSheet/${name}.png`;
  await image.decode();

  return { image, frames, animations };
};

let sheetsPromise: Promise<SpriteSheets> | undefined;

/** Loads every sheet once, all canvases of the page share them. */
export const loadSpriteSheets = () => {
  sheetsPromise ??= Promise.all(sheetNames.map(loadSheet)).then(
    (sheets) =>
      Object.fromEntries(sheets.map((sheet, index) => [sheetNames[index], sheet])) as SpriteSheets,
  );

  return sheetsPromise;
};

/** The army shown for each player slot of a map that isn't in a match. */
export const defaultArmies: Army[] = ["orange-star", "blue-moon"];

const neutralFrameName = (tile: Tile): string => {
  if ("playerSlot" in tile) {
    return `${tile.type}-0.png`;
  }

  if (tile.type === "pipeSeam") {
    return `pipeseam-${tile.variant}.png`;
  }

  return "variant" in tile ? `${tile.type}-${tile.variant}.png` : `${tile.type}.png`;
};

const drawFrame = (
  context: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  frameName: string,
  x: number,
  y: number,
) => {
  const frame = sheet.frames[frameName]?.frame;

  if (frame === undefined) {
    return;
  }

  // sprites taller than a tile stick out at the top, see renderMap in src/pixi
  const top = mapTopMargin + (y + 1) * tileSize - frame.h;
  context.drawImage(
    sheet.image,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    x * tileSize,
    top,
    frame.w,
    frame.h,
  );
};

export const drawTile = (
  context: CanvasRenderingContext2D,
  sheets: SpriteSheets,
  tile: Tile,
  x: number,
  y: number,
  armies: Army[] = defaultArmies,
) => {
  const army = "playerSlot" in tile ? armies[tile.playerSlot] : undefined;

  if (army === undefined) {
    drawFrame(context, sheets.neutral, neutralFrameName(tile), x, y);
  } else {
    drawFrame(context, sheets[army], `${tile.type}-0.png`, x, y);
  }
};

export const drawMap = (
  context: CanvasRenderingContext2D,
  sheets: SpriteSheets,
  tiles: Tile[][],
  armies?: Army[],
) => {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      drawTile(context, sheets, tile, x, y, armies);
    });
  });
};

export const mapPixelSize = (tiles: Tile[][]) => ({
  width: (tiles[0]?.length ?? 0) * tileSize,
  height: tiles.length * tileSize + mapTopMargin,
});
