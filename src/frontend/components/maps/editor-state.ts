import { reconnectAround } from "shared/map/auto-tile";
import type { Tile } from "shared/schemas/tile";

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
      next[y][x] = value;
      changed.push([x, y]);
    }
  };

  for (const position of positions) {
    paint(position, tile);

    if (isSymmetric) {
      paint(mirroredPosition(tiles, position), mirroredTile(tile));
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
