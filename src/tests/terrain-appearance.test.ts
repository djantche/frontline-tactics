import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyTerrainPalette,
  propertyAnimationName,
  terrainFrameCandidates,
} from "shared/map/terrain-appearance";
import type { Tile } from "shared/schemas/tile";

const neutral = JSON.parse(readFileSync("public/img/spriteSheet/neutral.json", "utf8")) as {
  frames: Record<string, unknown>;
};
const resolve = (tile: Tile, weather: "clear" | "rain" | "snow") =>
  terrainFrameCandidates(tile, weather).find((name) => neutral.frames[name] !== undefined);

void test("weather selection resolves real rain and snow terrain sprites", () => {
  const plain: Tile = { type: "plain", variant: "normal" };
  assert.equal(resolve(plain, "clear"), "plain-normal.png");
  assert.equal(resolve(plain, "rain"), "plain-rain.png");
  assert.equal(resolve(plain, "snow"), "plain-normal-snow.png");
  assert.equal(resolve({ type: "forest" }, "rain"), "wood-rain.png");
  assert.equal(resolve({ type: "forest" }, "snow"), "forest-snow.png");
  assert.equal(resolve({ type: "mountain" }, "snow"), "mountain-snow.png");
  assert.equal(resolve({ type: "unusedSilo" }, "rain"), "unusedSilo-rain-0.png");
  assert.equal(
    resolve({ type: "pipeSeam", variant: "top-bottom", hp: 99 }, "snow"),
    "pipeseam-top-bottom-snow.png",
  );
});

void test("terrain without a weather variant falls back to its existing normal sprite", () => {
  assert.equal(resolve({ type: "road", variant: "top-right" }, "snow"), "road-top-right.png");
  assert.equal(resolve({ type: "bridge", variant: "right-left" }, "rain"), "bridge-right-left.png");
});

void test("every army's buildings use the existing dash-separated weather animations", () => {
  for (const army of ["orange-star", "blue-moon", "green-earth", "yellow-comet", "black-hole"]) {
    const sheet = JSON.parse(readFileSync(`public/img/spriteSheet/${army}.json`, "utf8")) as {
      animations: Record<string, string[]>;
    };

    for (const weather of ["clear", "rain", "snow"] as const) {
      for (const type of ["hq", "base", "city", "airport", "port", "lab", "commtower"]) {
        assert.ok(
          sheet.animations[propertyAnimationName(type, weather)]?.length > 0,
          `${army}: ${type}, ${weather}`,
        );
      }
    }
  }
});

void test("indexed terrain masks look up palette coordinates and preserve transparency", () => {
  const palette = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 90, 80, 70, 255,
  ]);
  const source = new Uint8ClampedArray([
    0, 0, 0, 255, 255, 0, 0, 128, 0, 255, 0, 255, 255, 255, 0, 0,
  ]);
  assert.deepEqual(
    [...applyTerrainPalette(source, palette, 2, 2)],
    [255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 255, 90, 80, 70, 0],
  );
});
