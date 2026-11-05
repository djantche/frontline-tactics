import type { Tile } from "shared/schemas/tile";

type Point = { x: number; y: number; name: string };
const sides: Point[] = [
  { x: 0, y: -1, name: "N" },
  { x: 1, y: 0, name: "E" },
  { x: 0, y: 1, name: "S" },
  { x: -1, y: 0, name: "W" },
];
const corners: Point[] = [
  { x: 1, y: -1, name: "NE" },
  { x: 1, y: 1, name: "SE" },
  { x: -1, y: 1, name: "SW" },
  { x: -1, y: -1, name: "NW" },
];
const opposite: Record<string, string> = { N: "S", E: "W", S: "N", W: "E" };
const joined = (directions: string[]) => directions.map((direction) => `+${direction}`).join("");
export const isWaterTerrain = (tile: Tile | undefined) =>
  tile === undefined || ["sea", "shoal", "reef", "port", "river", "bridge"].includes(tile.type);

/** Context-dependent sprite names; coordinates/owners remain in the existing map format.
 * Follows the neighbourhood conventions of Commander Wars BEACH.js and SEA.js.
 */
export function coastalSpriteCandidates(
  tile: Tile,
  x: number,
  y: number,
  tiles?: Tile[][],
): string[] {
  if (!["sea", "shoal", "reef"].includes(tile.type)) {
    return [];
  }

  const at = (dx: number, dy: number) => tiles?.[y + dy]?.[x + dx];
  const land = sides.filter((p) => !isWaterTerrain(at(p.x, p.y))).map((p) => p.name);
  const diagonalLand = corners.filter((p) => !isWaterTerrain(at(p.x, p.y))).map((p) => p.name);

  if (tile.type === "sea") {
    const diagonals = diagonalLand.filter(
      (corner) => !land.includes(corner[0]) && !land.includes(corner[1]),
    );
    return [`sea${joined(land)}${joined(diagonals)}+mask`, `sea${joined(land)}+mask`, "sea+mask"];
  }

  if (tile.type === "reef") {
    const reefs = sides.filter((p) => at(p.x, p.y)?.type === "reef").map((p) => p.name);
    return [`reaf${joined(reefs)}+mask`, "reaf+mask"];
  }

  let beaches = sides.filter((p) => at(p.x, p.y)?.type === "shoal").map((p) => p.name);

  if (land.length === 1) {
    beaches = beaches.filter((direction) => direction !== opposite[land[0]]);
  }

  if (land.length > 0) {
    return [
      `beach${joined(beaches)}+land${joined(land)}+mask`,
      `beach+land${joined(land)}+mask`,
      "beach+mask",
    ];
  }

  if (
    diagonalLand.length === 1 &&
    beaches.every((direction) => diagonalLand[0].includes(direction))
  ) {
    return [
      `beach${joined(beaches)}+land${joined(diagonalLand)}+mask`,
      `beach${joined(beaches)}+mask`,
      "beach+mask",
    ];
  }

  beaches = beaches.filter((direction) => {
    const p = sides.find((side) => side.name === direction)!;
    return isWaterTerrain(at(p.x * 2, p.y * 2));
  });
  return [`beach${joined(beaches)}+mask`, "beach+mask"];
}
