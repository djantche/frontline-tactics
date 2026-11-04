import assert from "node:assert/strict";
import test from "node:test";
import { reconnectAround, withConnections } from "shared/map/auto-tile";
import { validateMap } from "shared/map/validate-map";
import type { Tile } from "shared/schemas/tile";
import { tileSchema } from "shared/schemas/tile";
import {
  createEmptyTiles,
  editorReducer,
  floodFillPositions,
  paintTiles,
  plainTile,
  resizeTiles,
} from "../frontend/components/maps/editor-state";

const road: Tile = { type: "road", variant: "right-left" };
const river: Tile = { type: "river", variant: "right-left" };
const pipe: Tile = { type: "pipe", variant: "right-left" };

const playableMap = () => {
  const tiles = createEmptyTiles(6, 6);
  tiles[0][0] = { type: "hq", playerSlot: 0 };
  tiles[0][1] = { type: "base", playerSlot: 0 };
  tiles[5][5] = { type: "hq", playerSlot: 1 };
  tiles[5][4] = { type: "base", playerSlot: 1 };
  return tiles;
};

void test("an isolated road or river is straight, since no single-ended variant exists", () => {
  const tiles = createEmptyTiles(5, 5);
  tiles[2][2] = road;
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "road", variant: "right-left" });

  tiles[1][2] = road;
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "road", variant: "top-bottom" });
});

void test("roads pick the corner, junction and crossing variants", () => {
  const tiles = createEmptyTiles(5, 5);
  tiles[2][2] = road;
  tiles[1][2] = road;
  tiles[2][3] = road;
  assert.equal(withConnections(tiles, 2, 2).type, "road");
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "road", variant: "top-right" });

  tiles[2][1] = road;
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "road", variant: "top-right-left" });

  tiles[3][2] = road;
  assert.deepEqual(withConnections(tiles, 2, 2), {
    type: "road",
    variant: "top-right-bottom-left",
  });
});

void test("rivers only connect to rivers and bridges", () => {
  const tiles = createEmptyTiles(5, 5);
  tiles[2][2] = river;
  tiles[1][2] = road;
  tiles[3][2] = { type: "bridge", variant: "right-left" };
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "river", variant: "top-bottom" });
});

void test("pipes have ends and no junctions", () => {
  const tiles = createEmptyTiles(5, 5);
  tiles[2][2] = pipe;
  tiles[2][3] = pipe;
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "pipe", variant: "right" });

  tiles[2][1] = pipe;
  tiles[1][2] = pipe;
  assert.deepEqual(withConnections(tiles, 2, 2), { type: "pipe", variant: "right-left" });
});

void test("bridges follow the land around them", () => {
  const tiles = createEmptyTiles(3, 3).map((row) => row.map((): Tile => ({ type: "sea" })));
  tiles[1][1] = { type: "bridge", variant: "right-left" };
  tiles[0][1] = plainTile;
  assert.deepEqual(withConnections(tiles, 1, 1), { type: "bridge", variant: "top-bottom" });

  tiles[1][0] = plainTile;
  assert.deepEqual(withConnections(tiles, 1, 1), { type: "bridge", variant: "right-left" });
});

void test("every generated variant is one that the tile schema allows", () => {
  const types: Tile[] = [road, river, pipe];

  for (const tile of types) {
    for (let mask = 0; mask < 16; mask++) {
      const tiles = createEmptyTiles(3, 3);
      tiles[1][1] = tile;

      if (mask & 1) {
        tiles[0][1] = tile;
      }

      if (mask & 2) {
        tiles[1][2] = tile;
      }

      if (mask & 4) {
        tiles[2][1] = tile;
      }

      if (mask & 8) {
        tiles[1][0] = tile;
      }

      const result = reconnectAround(tiles, [[1, 1]]);
      const invalid = result.flat().filter((item) => !tileSchema.safeParse(item).success);
      assert.deepEqual(invalid, []);
    }
  }
});

void test("validation lists what's missing, slot by slot", () => {
  const issues = validateMap(createEmptyTiles(6, 6));
  assert.deepEqual(issues, [
    { code: "missing-hq", slot: 0 },
    { code: "missing-production", slot: 0 },
    { code: "missing-hq", slot: 1 },
    { code: "missing-production", slot: 1 },
  ]);

  assert.deepEqual(validateMap(playableMap()), []);
});

void test("validation rejects wrong sizes, extra HQs and extra players", () => {
  assert.deepEqual(
    validateMap(resizeTiles(playableMap(), 4, 6)).map(({ code }) => code),
    ["wrong-size", "missing-hq", "missing-production"],
  );

  const tiles = playableMap();
  tiles[1][1] = { type: "hq", playerSlot: 0 };
  tiles[1][2] = { type: "base", playerSlot: 2 };
  assert.deepEqual(validateMap(tiles), [
    { code: "unsupported-player", slot: 2 },
    { code: "too-many-hqs", slot: 0 },
  ]);

  const uneven = playableMap();
  uneven[1] = uneven[1].slice(0, 3);
  assert.deepEqual(validateMap(uneven), [{ code: "not-rectangular" }]);
});

void test("symmetric painting rotates the position and swaps the owner", () => {
  const tiles = paintTiles(createEmptyTiles(6, 4), [[1, 0]], { type: "hq", playerSlot: 0 }, true);
  assert.deepEqual(tiles[0][1], { type: "hq", playerSlot: 0 });
  assert.deepEqual(tiles[3][4], { type: "hq", playerSlot: 1 });

  const neutral = paintTiles(
    createEmptyTiles(6, 4),
    [[1, 0]],
    { type: "city", playerSlot: -1 },
    true,
  );
  assert.deepEqual(neutral[3][4], { type: "city", playerSlot: -1 });
});

void test("painting doesn't change the original tiles and connects neighbours", () => {
  const original = paintTiles(createEmptyTiles(5, 5), [[2, 2]], road, false);
  const next = paintTiles(original, [[2, 1]], road, false);

  assert.deepEqual(original[1][2], plainTile);
  assert.deepEqual(next[2][2], { type: "road", variant: "top-bottom" });
  assert.deepEqual(next[1][2], { type: "road", variant: "top-bottom" });
});

void test("flood fill stops at other tile types", () => {
  const tiles = createEmptyTiles(3, 3);
  tiles[1] = [{ type: "sea" }, { type: "sea" }, { type: "sea" }];
  assert.equal(floodFillPositions(tiles, [0, 0]).length, 3);
  assert.equal(floodFillPositions(tiles, [0, 1]).length, 3);
  assert.equal(floodFillPositions(tiles, [9, 9]).length, 0);
});

void test("resizing keeps the top left corner", () => {
  const tiles = playableMap();
  const smaller = resizeTiles(tiles, 2, 2);
  assert.deepEqual(smaller[0][0], { type: "hq", playerSlot: 0 });
  assert.equal(smaller.length, 2);
  assert.equal(smaller[0].length, 2);

  const bigger = resizeTiles(tiles, 8, 7);
  assert.deepEqual(bigger[6][7], plainTile);
});

void test("undo reverts a whole stroke and redo brings it back", () => {
  const first = createEmptyTiles(5, 5);
  const second = paintTiles(first, [[0, 0]], road, false);
  const third = paintTiles(second, [[1, 0]], road, false);

  let state = editorReducer({ tiles: first, past: [], future: [] }, { type: "checkpoint" });
  state = editorReducer(state, { type: "set-tiles", tiles: second });
  state = editorReducer(state, { type: "set-tiles", tiles: third });
  assert.equal(state.past.length, 1);

  state = editorReducer(state, { type: "undo" });
  assert.equal(state.tiles, first);

  state = editorReducer(state, { type: "redo" });
  assert.equal(state.tiles, third);

  state = editorReducer(state, { type: "redo" });
  assert.equal(state.tiles, third);
});
