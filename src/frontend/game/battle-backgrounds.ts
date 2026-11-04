import type { TileType } from "shared/schemas/tile";

/** The background of the battle scene for each tile, see images/game/battlesprites. */
export const battleBackgrounds: Record<TileType, string> = {
  plain: "planes",
  road: "street",
  bridge: "bridge+0",
  river: "river",
  forest: "forest+0",
  mountain: "mountain+0",
  sea: "sea",
  shoal: "beach",
  reef: "sea",
  pipe: "wasteland",
  pipeSeam: "wasteland",
  city: "town+os+0",
  base: "factory",
  airport: "airport",
  port: "harbour",
  hq: "hq+os",
  lab: "radar",
  commtower: "radar",
  unusedSilo: "missile+0",
  usedSilo: "missile+0",
};
