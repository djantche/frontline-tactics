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
  brushPositions,
  linePositions,
  rectanglePositions,
  transformTiles,
  parseDraft,
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

void test("fast strokes stay four-way connected from start to end", () => {
  for (const end of [
    [9, 3],
    [2, 9],
    [0, 0],
    [0, 8],
  ] as [number, number][]) {
    const positions = linePositions([3, 3], end);
    assert.deepEqual(positions[0], [3, 3]);
    assert.deepEqual(positions.at(-1), end);

    for (let i = 1; i < positions.length; i++) {
      assert.equal(
        Math.abs(positions[i][0] - positions[i - 1][0]) +
          Math.abs(positions[i][1] - positions[i - 1][1]),
        1,
      );
    }
  }
});

void test("rectangle painting works in every drag direction and brushes clip to the map", () => {
  assert.deepEqual(rectanglePositions([2, 3], [0, 2]), [
    [0, 2],
    [1, 2],
    [2, 2],
    [0, 3],
    [1, 3],
    [2, 3],
  ]);
  assert.deepEqual(
    brushPositions(
      createEmptyTiles(5, 5),
      [
        [0, 0],
        [0, 0],
      ],
      3,
    ),
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  );
});

void test("placing a HQ moves that player's HQ without deleting the enemy HQ", () => {
  const before = playableMap();
  const moved = paintTiles(before, [[1, 1]], { type: "hq", playerSlot: 0 }, false);
  assert.deepEqual(moved[0][0], plainTile);
  assert.deepEqual(moved[1][1], { type: "hq", playerSlot: 0 });
  assert.deepEqual(moved[5][5], { type: "hq", playerSlot: 1 });
  assert.equal(moved.flat().filter((tile) => tile.type === "hq").length, 2);
  assert.equal(before[0][0].type, "hq");
});

void test("symmetry never overwrites the owner of a HQ on the centre tile", () => {
  const tiles = paintTiles(createEmptyTiles(5, 5), [[2, 2]], { type: "hq", playerSlot: 0 }, true);
  assert.deepEqual(tiles[2][2], { type: "hq", playerSlot: 0 });
});

void test("queued paint events compose against the latest state and undo as one stroke", () => {
  const first = createEmptyTiles(5, 5);
  let state = editorReducer({ tiles: first, past: [], future: [] }, { type: "checkpoint" });
  state = editorReducer(state, {
    type: "paint",
    positions: [[0, 0]],
    tile: road,
    symmetric: false,
  });
  state = editorReducer(state, {
    type: "paint",
    positions: [[1, 0]],
    tile: road,
    symmetric: false,
  });
  assert.equal(state.tiles[0][0].type, "road");
  assert.equal(state.tiles[0][1].type, "road");
  assert.equal(editorReducer(state, { type: "undo" }).tiles, first);
});

void test("rotating a non-square map rotates its connected sprites too", () => {
  const tiles = createEmptyTiles(6, 5);
  tiles[0][1] = { type: "road", variant: "top-right" };
  tiles[1][1] = { type: "pipe", variant: "left" };
  tiles[2][2] = { type: "hq", playerSlot: 0 };
  const rotated = transformTiles(tiles, "rotate");
  assert.equal(rotated.length, 6);
  assert.equal(rotated[0].length, 5);
  assert.deepEqual(rotated[1][4], { type: "road", variant: "right-bottom" });
  assert.deepEqual(rotated[1][3], { type: "pipe", variant: "top" });
  let roundTrip = rotated;

  for (let i = 0; i < 3; i++) {
    roundTrip = transformTiles(roundTrip, "rotate");
  }

  assert.deepEqual(roundTrip, tiles);
  assert.deepEqual(transformTiles(transformTiles(tiles, "flipX"), "flipX"), tiles);
  assert.deepEqual(transformTiles(transformTiles(tiles, "flipY"), "flipY"), tiles);
});

void test("all road and pipe variants remain valid through rotations and flips", () => {
  const variants = [
    "top",
    "right",
    "bottom",
    "left",
    "right-left",
    "top-bottom",
    "top-right",
    "right-bottom",
    "bottom-left",
    "top-left",
    "top-right-bottom",
    "top-bottom-left",
    "top-right-left",
    "right-bottom-left",
    "top-right-bottom-left",
  ];

  for (const type of ["road", "river", "pipe", "bridge", "pipeSeam"] as const) {
    for (const variant of variants) {
      const parsed = tileSchema.safeParse({ type, variant, hp: 99 });

      if (!parsed.success) {
        continue;
      }

      for (const transform of ["rotate", "flipX", "flipY"] as const) {
        assert.ok(tileSchema.safeParse(transformTiles([[parsed.data]], transform)[0][0]).success);
      }
    }
  }
});

void test("malformed drafts and imports cannot crash or corrupt the editor", () => {
  assert.equal(parseDraft("{broken"), undefined);
  assert.equal(parseDraft("null"), undefined);
  assert.equal(parseDraft(JSON.stringify({ name: "bad", tiles: [[]] })), undefined);
  const uneven = createEmptyTiles(5, 5);
  uneven[2] = [];
  assert.equal(parseDraft(JSON.stringify({ name: "bad", tiles: uneven })), undefined);
  assert.deepEqual(parseDraft(JSON.stringify({ name: "Draft", tiles: playableMap() })), {
    name: "Draft",
    tiles: playableMap(),
  });
});

void test("orientation and resizing operations can be undone and redone", () => {
  const first = playableMap();
  let state = { tiles: first, past: [] as Tile[][][], future: [] as Tile[][][] };
  const rotated = transformTiles(first, "rotate");
  state = editorReducer(state, { type: "commit", tiles: rotated });
  state = editorReducer(state, { type: "undo" });
  assert.equal(state.tiles, first);
  state = editorReducer(state, { type: "redo" });
  assert.equal(state.tiles, rotated);
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
