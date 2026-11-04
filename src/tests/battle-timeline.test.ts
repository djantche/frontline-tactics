import assert from "node:assert/strict";
import { test } from "node:test";
import type { BattleManifest, UnitBattleData } from "../frontend/game/battle-manifest";
import type { BattleView } from "../frontend/game/battle-timeline";
import { buildTimeline, unitCountOf } from "../frontend/game/battle-timeline";

const unit = (maxCount: number) =>
  ({
    kind: "foot",
    maxCount,
    fireMs: 600,
    fireSounds: ["fire.wav"],
    impactSounds: ["hit.wav"],
    armies: { "orange-star": { move: null }, "blue-moon": { move: null } },
  }) as unknown as UnitBattleData;

const manifest = { units: { infantry: unit(5) } } as unknown as BattleManifest;

const view = (attackerAfter: number, defenderAfter: number): BattleView => ({
  attacker: {
    unitType: "infantry",
    army: "orange-star",
    co: "andy",
    hpBefore: 100,
    hpAfter: attackerAfter,
    terrain: "planes",
    stars: 0,
  },
  defender: {
    unitType: "infantry",
    army: "blue-moon",
    co: "max",
    hpBefore: 100,
    hpAfter: defenderAfter,
    terrain: "planes",
    stars: 0,
  },
});

void test("the survivors answer right after the hit, without waiting for the explosions", () => {
  const { attacker, defender, end } = buildTimeline(view(70, 40), manifest);
  const hit = defender.find(({ kind }) => kind === "impact");
  const counter = defender.find(({ kind }) => kind === "fire");

  assert.ok(hit !== undefined && counter !== undefined);
  assert.ok(counter.start - hit.start < 400);
  assert.ok(counter.start < hit.end);
  assert.ok(attacker.some(({ kind }) => kind === "impact"));
  assert.ok(end > Math.max(...attacker.map((action) => action.end)));
});

void test("a destroyed defender doesn't answer, and the battle waits for its explosions", () => {
  const { attacker, defender, end } = buildTimeline(view(100, 0), manifest);

  assert.ok(!defender.some(({ kind }) => kind === "fire"));
  assert.ok(!attacker.some(({ kind }) => kind === "impact"));

  const hit = defender.find(({ kind }) => kind === "impact");

  assert.ok(hit !== undefined && end > hit.start + 5 * 75 + 900);
});

void test("each member of a formation stands for a part of the HP", () => {
  assert.equal(unitCountOf(100, 5), 5);
  assert.equal(unitCountOf(41, 5), 3);
  assert.equal(unitCountOf(1, 5), 1);
  assert.equal(unitCountOf(0, 5), 0);
  assert.equal(unitCountOf(1, 1), 1);
});
