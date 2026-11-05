import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { drawFrame, drawMap, drawTile, mapPixelSize } from "frontend/map/draw-map";
import type { AtlasFrame, SpriteSheet, SpriteSheets } from "frontend/map/draw-map";
import type { CoastalAtlas } from "frontend/map/coastal-atlas";
import { terrainPalette } from "frontend/components/maps/TilePalette";

const image = {} as HTMLImageElement;
const sheet = (name: string): SpriteSheet => ({
  image,
  frames: (
    JSON.parse(readFileSync(`public/img/spriteSheet/${name}.json`, "utf8")) as {
      frames: Record<string, AtlasFrame>;
    }
  ).frames,
});

const recorder = () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const context = Object.fromEntries(
    ["save", "restore", "translate", "rotate", "drawImage", "clearRect"].map((method) => [
      method,
      (...args: unknown[]) => calls.push({ method, args }),
    ]),
  ) as unknown as CanvasRenderingContext2D;
  Object.assign(context, { canvas: { width: 32, height: 48 } });
  return { context, calls };
};

void test("the actual Orange Star HQ is unrotated using the full atlas rectangle", () => {
  const { context, calls } = recorder();
  const orange = sheet("orange-star");
  assert.equal(orange.frames["hq-0.png"].rotated, true);
  drawFrame(context, orange, "hq-0.png", 0, 0);
  assert.deepEqual(
    calls.map(({ method }) => method),
    ["save", "translate", "rotate", "drawImage", "restore"],
  );
  assert.deepEqual(calls[1].args, [0, 32]);
  assert.deepEqual(calls[2].args, [-Math.PI / 2]);
  assert.deepEqual(calls[3].args.slice(1), [1, 1, 31, 16, 0, 0, 31, 16]);
});

void test("unrotated Blue Moon HQ keeps its complete height above the top row", () => {
  const { context, calls } = recorder();
  drawFrame(context, sheet("blue-moon"), "hq-0.png", 1, 0);
  assert.deepEqual(calls, [{ method: "drawImage", args: [image, 0, 0, 16, 31, 16, 1, 16, 31] }]);
  assert.deepEqual(mapPixelSize([[{ type: "hq", playerSlot: 0 }]]), { width: 16, height: 32 });
});

void test("trimmed sprites use their original height and trim offsets", () => {
  const { context, calls } = recorder();
  drawFrame(
    context,
    {
      image,
      frames: {
        trimmed: {
          frame: { x: 10, y: 20, w: 12, h: 20 },
          trimmed: true,
          sourceSize: { w: 16, h: 31 },
          spriteSourceSize: { x: 2, y: 3, w: 12, h: 20 },
        },
      },
    },
    "trimmed",
    0,
    0,
  );
  assert.deepEqual(calls[0].args.slice(1), [10, 20, 12, 20, 2, 4, 12, 20]);
});

void test("every palette tile and owned building resolves to a real sprite", () => {
  const neutral = sheet("neutral"),
    orange = sheet("orange-star"),
    blue = sheet("blue-moon");
  const sheets: SpriteSheets = {
    neutral,
    "orange-star": orange,
    "blue-moon": blue,
    "green-earth": sheet("green-earth"),
    "yellow-comet": sheet("yellow-comet"),
    "black-hole": sheet("black-hole"),
  };

  for (const tile of [
    ...terrainPalette,
    ...(["hq", "city", "base", "airport", "port", "lab", "commtower"] as const).flatMap((type) =>
      [0, 1].map((playerSlot) => ({ type, playerSlot })),
    ),
  ]) {
    const { context, calls } = recorder();
    drawTile(context, sheets, tile, 0, 0);
    assert.ok(
      calls.some(({ method }) => method === "drawImage"),
      `${tile.type} must be visible`,
    );
  }
});

void test("map painting draws lower rows last so tall buildings overlap correctly", () => {
  const { context, calls } = recorder();
  const neutral = sheet("neutral"),
    orange = sheet("orange-star");
  const sheets = { neutral, "orange-star": orange } as SpriteSheets;
  drawMap(context, sheets, [
    [{ type: "plain", variant: "normal" }],
    [{ type: "hq", playerSlot: 0 }],
  ]);
  assert.equal(calls[0].method, "clearRect");
  const translate = calls.find(({ method }) => method === "translate");
  assert.deepEqual(translate?.args, [0, 48]);
});

void test("reefs are composited over the sea instead of leaving transparent holes", () => {
  const metadata = JSON.parse(readFileSync("public/img/spriteSheet/coast.json", "utf8")) as Pick<
    CoastalAtlas,
    "frames" | "animations"
  >;
  const coastal: CoastalAtlas = {
    ...metadata,
    images: {
      clear: image as unknown as HTMLCanvasElement,
      rain: image as unknown as HTMLCanvasElement,
      snow: image as unknown as HTMLCanvasElement,
    },
  };
  const sheets = { neutral: sheet("neutral"), coastal } as SpriteSheets;
  const { context, calls } = recorder();
  drawTile(context, sheets, { type: "reef" }, 0, 0);
  const draws = calls.filter(({ method }) => method === "drawImage");
  assert.equal(draws.length, 2);
  assert.deepEqual(draws[0].args.slice(1, 3), [
    metadata.frames[metadata.animations["sea+mask"][0]].frame.x,
    metadata.frames[metadata.animations["sea+mask"][0]].frame.y,
  ]);
  assert.deepEqual(draws[1].args.slice(1, 3), [
    metadata.frames[metadata.animations["reaf+mask"][0]].frame.x,
    metadata.frames[metadata.animations["reaf+mask"][0]].frame.y,
  ]);
});
