import { reconnectAround } from "shared/map/auto-tile";
import type { Tile } from "shared/schemas/tile";
import { tileSchema } from "shared/schemas/tile";
import { maxMapSize, minMapSize } from "shared/map/validate-map";
import { z } from "zod";

export const plainTile: Tile = { type: "plain", variant: "normal" };

export const createEmptyTiles = (width: number, height: number): Tile[][] =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => plainTile));

export type Position = [number, number];

/** The other half of the map in a 180° rotation, the usual layout of fair 1v1 maps. */
const mirroredPosition = (tiles: Tile[][], [x, y]: Position): Position => [
  tiles[0].length - 1 - x,
  tiles.length - 1 - y,
];

/** Properties change owner on the other half of the map. */
const mirroredTile = (tile: Tile): Tile =>
  "playerSlot" in tile && tile.playerSlot >= 0 && tile.playerSlot < 2
    ? { ...tile, playerSlot: tile.playerSlot === 0 ? 1 : 0 }
    : tile;

const sameTile = (a: Tile, b: Tile) => JSON.stringify(a) === JSON.stringify(b);

export const paintTiles = (
  tiles: Tile[][],
  positions: Position[],
  tile: Tile,
  isSymmetric: boolean,
): Tile[][] => {
  const next = tiles.map((row) => [...row]);
  const changed: Position[] = [];

  const paint = ([x, y]: Position, value: Tile) => {
    if (next[y]?.[x] !== undefined) {
      // A HQ is a player's unique starting point. Placing it moves it rather
      // than silently creating an unplayable map with duplicate HQs.
      if (value.type === "hq") {
        next.forEach((row, oldY) =>
          row.forEach((old, oldX) => {
            if (
              old.type === "hq" &&
              old.playerSlot === value.playerSlot &&
              (oldX !== x || oldY !== y)
            ) {
              row[oldX] = plainTile;
              changed.push([oldX, oldY]);
            }
          }),
        );
      }

      next[y][x] = value;
      changed.push([x, y]);
    }
  };

  for (const position of positions) {
    paint(position, tile);

    if (isSymmetric) {
      const mirrored = mirroredPosition(tiles, position);

      if (mirrored[0] !== position[0] || mirrored[1] !== position[1]) {
        paint(mirrored, mirroredTile(tile));
      }
    }
  }

  return reconnectAround(next, changed);
};

/** All the connected tiles of the same type around a position. */
export const floodFillPositions = (tiles: Tile[][], [startX, startY]: Position): Position[] => {
  const target = tiles[startY]?.[startX];

  if (target === undefined) {
    return [];
  }

  const seen = new Set<string>();
  const positions: Position[] = [];
  const toVisit: Position[] = [[startX, startY]];

  while (toVisit.length > 0) {
    const [x, y] = toVisit.pop()!;
    const key = `${x},${y}`;
    const tile = tiles[y]?.[x];

    if (seen.has(key) || tile === undefined || !sameTile(tile, target)) {
      continue;
    }

    seen.add(key);
    positions.push([x, y]);
    toVisit.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return positions;
};

/** Keeps the top left corner, new tiles are plains. */
export const resizeTiles = (tiles: Tile[][], width: number, height: number): Tile[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => tiles[y]?.[x] ?? plainTile),
  );

/** A connected, gap-free stroke, even when pointer events skip several tiles. */
export const linePositions = ([x0, y0]: Position, [x1, y1]: Position): Position[] => {
  const positions: Position[] = [[x0, y0]];
  const dx = Math.abs(x1 - x0),
    dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let error = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    const double = error * 2;

    if (double > -dy) {
      error -= dy;
      x0 += sx;
      positions.push([x0, y0]);
    }

    if (double < dx) {
      error += dx;
      y0 += sy;
      positions.push([x0, y0]);
    }
  }

  return positions;
};

export const rectanglePositions = ([x0, y0]: Position, [x1, y1]: Position): Position[] => {
  const positions: Position[] = [];

  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      positions.push([x, y]);
    }
  }

  return positions;
};

export const brushPositions = (
  tiles: Tile[][],
  positions: Position[],
  size: number,
): Position[] => {
  const unique = new Map<string, Position>();
  const radius = Math.floor(size / 2);

  for (const [cx, cy] of positions) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (tiles[y]?.[x] !== undefined) {
          unique.set(`${x},${y}`, [x, y]);
        }
      }
    }
  }

  return [...unique.values()];
};

export type MapTransform = "rotate" | "flipX" | "flipY";
const transformTile = (tile: Tile, transform: MapTransform): Tile => {
  if (!("variant" in tile) || tile.variant === "normal") {
    return tile;
  }

  if (tile.type === "plain") {
    return transform === "rotate"
      ? {
          ...tile,
          variant:
            tile.variant === "broken-pipe-right-left"
              ? "broken-pipe-top-bottom"
              : "broken-pipe-right-left",
        }
      : tile;
  }

  const directionMap: Record<MapTransform, Record<string, string>> = {
    rotate: { top: "right", right: "bottom", bottom: "left", left: "top" },
    flipX: { top: "top", right: "left", bottom: "bottom", left: "right" },
    flipY: { top: "bottom", right: "right", bottom: "top", left: "left" },
  };
  const order = ["top", "right", "bottom", "left"];
  const variant = tile.variant
    .split("-")
    .map((direction) => directionMap[transform][direction])
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .join("-");
  return tileSchema.parse({ ...tile, variant });
};

export const transformTiles = (tiles: Tile[][], transform: MapTransform): Tile[][] => {
  const width = tiles[0].length,
    height = tiles.length;
  const next = createEmptyTiles(
    transform === "rotate" ? height : width,
    transform === "rotate" ? width : height,
  );
  tiles.forEach((row, y) =>
    row.forEach((tile, x) => {
      const [nx, ny] =
        transform === "rotate"
          ? [height - 1 - y, x]
          : transform === "flipX"
            ? [width - 1 - x, y]
            : [x, height - 1 - y];
      next[ny][nx] = transformTile(tile, transform);
    }),
  );
  return next;
};

const draftSchema = z
  .object({
    name: z.string().max(60),
    tiles: tileSchema
      .array()
      .min(minMapSize)
      .max(maxMapSize)
      .array()
      .min(minMapSize)
      .max(maxMapSize),
  })
  .refine(({ tiles }) => tiles.every((row) => row.length === tiles[0].length));

export const parseDraft = (raw: string): z.infer<typeof draftSchema> | undefined => {
  try {
    const result = draftSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
};

const historyLimit = 100;

export type EditorState = {
  tiles: Tile[][];
  past: Tile[][][];
  future: Tile[][][];
};

export type EditorAction =
  /** Starts a change that undo will revert in one go, such as a whole brush stroke. */
  | { type: "checkpoint" }
  | { type: "set-tiles"; tiles: Tile[][] }
  | { type: "paint"; positions: Position[]; tile: Tile; symmetric: boolean }
  | { type: "commit"; tiles: Tile[][] }
  | { type: "replace"; tiles: Tile[][] }
  | { type: "undo" }
  | { type: "redo" };

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case "checkpoint":
      return {
        ...state,
        past: [...state.past, state.tiles].slice(-historyLimit),
        future: [],
      };
    case "set-tiles":
      return { ...state, tiles: action.tiles };
    case "paint":
      return {
        ...state,
        tiles: paintTiles(state.tiles, action.positions, action.tile, action.symmetric),
      };
    case "commit":
      return {
        tiles: action.tiles,
        past: [...state.past, state.tiles].slice(-historyLimit),
        future: [],
      };
    case "replace":
      return { tiles: action.tiles, past: [], future: [] };
    case "undo": {
      const previous = state.past.at(-1);

      return previous === undefined
        ? state
        : {
            tiles: previous,
            past: state.past.slice(0, -1),
            future: [state.tiles, ...state.future],
          };
    }
    case "redo": {
      const [next, ...future] = state.future;

      return next === undefined
        ? state
        : { tiles: next, past: [...state.past, state.tiles], future };
    }
  }
};
