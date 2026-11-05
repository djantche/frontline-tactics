import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { coastalSpriteCandidates } from "shared/map/coastal-sprites";
import type { Tile } from "shared/schemas/tile";

const atlas = JSON.parse(readFileSync("public/img/spriteSheet/coast.json", "utf8")) as {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  animations: Record<string, string[]>;
  meta: { size: { w: number; h: number } };
};
const sea = (): Tile[][] =>
  Array.from({ length: 3 }, () => Array.from({ length: 3 }, (): Tile => ({ type: "sea" })));
const plain: Tile = { type: "plain", variant: "normal" };

void test("beaches follow the land and join adjacent beach tiles", () => {
  const tiles = sea();
  tiles[1][1] = { type: "shoal" };
  tiles[0][1] = plain;
  tiles[1][0] = { type: "shoal" };
  tiles[1][2] = { type: "shoal" };
  assert.equal(coastalSpriteCandidates(tiles[1][1], 1, 1, tiles)[0], "beach+E+W+land+N+mask");
  tiles[1][0] = plain;
  assert.equal(coastalSpriteCandidates(tiles[1][1], 1, 1, tiles)[0], "beach+E+land+N+W+mask");
});

void test("diagonal land selects a corner rather than an isolated shoal", () => {
  const tiles = sea();
  tiles[1][1] = { type: "shoal" };
  tiles[0][2] = plain;
  assert.equal(coastalSpriteCandidates(tiles[1][1], 1, 1, tiles)[0], "beach+land+NE+mask");
  assert.equal(coastalSpriteCandidates({ type: "sea" }, 1, 1, tiles)[0], "sea+NE+mask");
});

void test("every sea neighbourhood maps to a real coastal variant", () => {
  const neighbours = [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ];

  for (let mask = 0; mask < 256; mask++) {
    const tiles = sea();
    neighbours.forEach(([x, y], index) => {
      if (mask & (1 << index)) {
        tiles[y][x] = plain;
      }
    });
    const candidates = coastalSpriteCandidates({ type: "sea" }, 1, 1, tiles);
    assert.ok(atlas.animations[candidates[0]], `missing shoreline variant ${candidates[0]}`);
  }
});

void test("all beach, land and water side combinations have a renderable fallback", () => {
  for (let code = 0; code < 81; code++) {
    const tiles = sea();
    let remaining = code;

    for (const [x, y] of [
      [1, 0],
      [2, 1],
      [1, 2],
      [0, 1],
    ]) {
      const kind = remaining % 3;
      remaining = Math.floor(remaining / 3);
      tiles[y][x] = kind === 0 ? plain : kind === 1 ? { type: "shoal" } : { type: "sea" };
    }

    const candidates = coastalSpriteCandidates({ type: "shoal" }, 1, 1, tiles);
    assert.ok(candidates.some((candidate) => atlas.animations[candidate] !== undefined));
  }
});

void test("coastal strips keep all eight animation frames inside the packed image", () => {
  const image = readFileSync("public/img/spriteSheet/coast-mask.png");
  assert.equal(image.readUInt32BE(16), atlas.meta.size.w);
  assert.equal(image.readUInt32BE(20), atlas.meta.size.h);
  assert.equal(Object.keys(atlas.animations).length, 169);

  for (const frames of Object.values(atlas.animations)) {
    assert.equal(frames.length, 8);

    for (const name of frames) {
      const { frame } = atlas.frames[name];
      assert.equal(frame.w, 16);
      assert.equal(frame.h, 16);
      assert.ok(frame.x >= 0 && frame.x + frame.w <= atlas.meta.size.w);
      assert.ok(frame.y >= 0 && frame.y + frame.h <= atlas.meta.size.h);
    }
  }
});
