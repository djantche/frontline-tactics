import type { Tile } from "shared/schemas/tile";

type Direction = "top" | "right" | "bottom" | "left";

/** Listed in the order used by the names of the tile variants, e.g. "top-right-left". */
const directions: { name: Direction; dx: number; dy: number }[] = [
  { name: "top", dx: 0, dy: -1 },
  { name: "right", dx: 1, dy: 0 },
  { name: "bottom", dx: 0, dy: 1 },
  { name: "left", dx: -1, dy: 0 },
];

const connectsTo: Partial<Record<Tile["type"], Tile["type"][]>> = {
  road: ["road", "bridge"],
  river: ["river", "bridge"],
  pipe: ["pipe", "pipeSeam"],
};

const tileAt = (tiles: Tile[][], x: number, y: number): Tile | undefined => tiles[y]?.[x];

const connectedDirections = (tiles: Tile[][], x: number, y: number, types: Tile["type"][]) =>
  directions
    .filter(({ dx, dy }) => {
      const neighbour = tileAt(tiles, x + dx, y + dy);
      return neighbour !== undefined && types.includes(neighbour.type);
    })
    .map(({ name }) => name);

/** The straight variant for tiles that only exist as a horizontal or a vertical piece. */
const axisOf = (connected: Direction[]) =>
  connected.includes("left") || connected.includes("right") || connected.length === 0
    ? ("right-left" as const)
    : ("top-bottom" as const);

const roadOrRiverVariant = (connected: Direction[]) =>
  // these tiles have no variant with a single connection
  (connected.length < 2 ? axisOf(connected) : connected.join("-")) as Extract<
    Tile,
    { type: "road" }
  >["variant"];

const pipeVariant = (connected: Direction[]) => {
  if (connected.length === 0) {
    return "right-left";
  }

  // pipes have no junctions
  return (connected.length > 2 ? axisOf(connected) : connected.join("-")) as Extract<
    Tile,
    { type: "pipe" }
  >["variant"];
};

/** Bridges cross water: they follow whatever walkable tiles surround them. */
const bridgeVariant = (tiles: Tile[][], x: number, y: number) => {
  const isCrossable = (neighbour: Tile | undefined) =>
    neighbour !== undefined && !["sea", "river", "reef"].includes(neighbour.type);

  const leftOrRight = isCrossable(tileAt(tiles, x - 1, y)) || isCrossable(tileAt(tiles, x + 1, y));
  const topOrBottom = isCrossable(tileAt(tiles, x, y - 1)) || isCrossable(tileAt(tiles, x, y + 1));

  return topOrBottom && !leftOrRight ? ("top-bottom" as const) : ("right-left" as const);
};

/** The tile at this position, with the variant matching its current neighbours. */
export const withConnections = (tiles: Tile[][], x: number, y: number): Tile => {
  const tile = tiles[y][x];

  switch (tile.type) {
    case "road":
    case "river": {
      const connected = connectedDirections(tiles, x, y, connectsTo[tile.type] ?? []);
      return { type: tile.type, variant: roadOrRiverVariant(connected) };
    }
    case "pipe": {
      const connected = connectedDirections(tiles, x, y, connectsTo.pipe ?? []);
      return { type: "pipe", variant: pipeVariant(connected) };
    }
    case "pipeSeam": {
      const connected = connectedDirections(tiles, x, y, connectsTo.pipe ?? []);
      return { ...tile, variant: axisOf(connected) };
    }
    case "bridge":
      return { type: "bridge", variant: bridgeVariant(tiles, x, y) };
    default:
      return tile;
  }
};

/** Returns new tiles with the changed position and its neighbours connected again. */
export const reconnectAround = (tiles: Tile[][], positions: [number, number][]) => {
  const next = tiles.map((row) => [...row]);

  const toUpdate = positions.flatMap(([x, y]): [number, number][] => [
    [x, y],
    ...directions.map(({ dx, dy }): [number, number] => [x + dx, y + dy]),
  ]);

  for (const [x, y] of toUpdate) {
    if (next[y]?.[x] !== undefined) {
      next[y][x] = withConnections(next, x, y);
    }
  }

  return next;
};
