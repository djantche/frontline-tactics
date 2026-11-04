import type { Tile } from "shared/schemas/tile";
import { isUnitProducingProperty } from "shared/schemas/tile";

export const minMapSize = 5;
export const maxMapSize = 50;
export const mapPlayerCount = 2;

export type MapIssue =
  | { code: "not-rectangular" }
  | { code: "wrong-size" }
  | { code: "unsupported-player"; slot: number }
  | { code: "missing-hq"; slot: number }
  | { code: "too-many-hqs"; slot: number }
  | { code: "missing-production"; slot: number };

/** Everything that keeps a map from being playable. An empty list means it's valid. */
export const validateMap = (tiles: Tile[][]): MapIssue[] => {
  const issues: MapIssue[] = [];
  const width = tiles[0]?.length ?? 0;

  if (tiles.some((row) => row.length !== width)) {
    issues.push({ code: "not-rectangular" });
  }

  if (
    width < minMapSize ||
    width > maxMapSize ||
    tiles.length < minMapSize ||
    tiles.length > maxMapSize
  ) {
    issues.push({ code: "wrong-size" });
  }

  const flatTiles = tiles.flat();

  const unsupportedSlots = new Set(
    flatTiles.flatMap((tile) =>
      "playerSlot" in tile && tile.playerSlot >= mapPlayerCount ? [tile.playerSlot] : [],
    ),
  );

  for (const slot of unsupportedSlots) {
    issues.push({ code: "unsupported-player", slot });
  }

  for (let slot = 0; slot < mapPlayerCount; slot++) {
    const ownedTiles = flatTiles.filter((tile) => "playerSlot" in tile && tile.playerSlot === slot);
    const hqCount = ownedTiles.filter((tile) => tile.type === "hq").length;

    if (hqCount === 0) {
      issues.push({ code: "missing-hq", slot });
    }

    if (hqCount > 1) {
      issues.push({ code: "too-many-hqs", slot });
    }

    if (!ownedTiles.some(isUnitProducingProperty)) {
      issues.push({ code: "missing-production", slot });
    }
  }

  return issues;
};
