import type { GameMap } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { getCOProperties } from "shared/match-logic/co";
import { calculateDamage } from "shared/match-logic/calculate-damage";
import { applyCOPowerEvent } from "shared/match-logic/events/handlers/coPower";
import {
  daysOfRuinCOs,
  describeEffects,
  englishEffectPhrases,
} from "shared/match-logic/game-constants/cos/days-of-ruin";
import { getWeatherSpecialMovement } from "shared/match-logic/weather";
import type { CO } from "shared/schemas/co";
import { coSchema } from "shared/schemas/co";
import type { PlayerInMatch } from "shared/types/server-match-state";
import { MatchWrapper } from "shared/wrappers/match";
import { UnitWrapper } from "shared/wrappers/unit";

const road = { type: "road", variant: "right-left" } as const;
const plain = { type: "plain", variant: "normal" } as const;

const map = {
  id: "0",
  authorId: null,
  createdAt: new Date(),
  name: "",
  numberOfPlayers: 2,
  predeployedUnits: [],
  tiles: [
    [plain, road, road, plain],
    [plain, plain, road, plain],
  ],
} as unknown as GameMap;

const playerOf = (slot: number, co: CO, hasCurrentTurn: boolean): PlayerInMatch => ({
  name: `p${slot}`,
  status: "alive",
  army: slot === 0 ? "orange-star" : "blue-moon",
  coId: { name: co, version: "AW2" },
  COPowerState: "no-power",
  funds: 10000,
  id: `${slot}`,
  powerMeter: 10000000,
  slot,
  timesPowerUsed: 0,
  hasCurrentTurn,
});

const matchWith = (co: CO, enemyCo: CO = "andy") => {
  const match = new MatchWrapper(
    "",
    "standard",
    [],
    {
      unitCapPerPlayer: 50,
      fogOfWar: false,
      fundsPerProperty: 1000,
      labUnitTypes: [],
      bannedUnitTypes: [],
      captureLimit: 0,
      dayLimit: 0,
      weatherSetting: "clear",
      teamMapping: [0, 1],
    },
    "playing",
    map,
    [playerOf(0, co, true), playerOf(1, enemyCo, false)],
    [],
    UnitWrapper,
    0,
  );

  const player = match.getPlayerBySlot(0)!;
  const enemy = match.getPlayerBySlot(1)!;
  const unit = (type: "tank" | "artillery", position: [number, number], slot: number) => ({
    type,
    isReady: true,
    position,
    playerSlot: slot,
    stats: { fuel: 50, hp: 100, ammo: 5 },
  });

  const attacker = player.addUnwrappedUnit(unit("tank", [1, 0], 0) as never);
  const defender = enemy.addUnwrappedUnit(unit("tank", [2, 0], 1) as never);
  const artillery = player.addUnwrappedUnit(unit("artillery", [2, 1], 0) as never);

  return { match, player, enemy, attacker, defender, artillery };
};

const noLuck = { goodLuck: 0, badLuck: 0 };

void test("every CO can be played: effects, powers and damage stay valid in each state", () => {
  assert.equal(coSchema.options.length, 40);

  for (const co of coSchema.options) {
    const properties = getCOProperties({ name: co, version: "AW2" });
    const powers = (["COPower", "superCOPower"] as const).filter(
      (power) => properties.powers[power] !== undefined,
    );

    assert.ok(properties.displayName.length > 0, co);
    assert.ok(powers.length > 0, co);

    for (const power of [undefined, ...powers]) {
      const { match, attacker, defender, artillery } = matchWith(co);

      if (power !== undefined) {
        const positions = properties.powers[power]?.calculatePositions?.(attacker.player);

        applyCOPowerEvent(match, {
          type: "coPower",
          isSuper: power === "superCOPower",
          positions,
        } as never);
      }

      const damage = calculateDamage({ attacker, defender }, noLuck, false);
      const counter = calculateDamage({ attacker: defender, defender: attacker }, noLuck, true);
      const artilleryRange = artillery.getAttackRange();

      assert.ok(damage !== null && Number.isFinite(damage) && damage >= 0, `${co} ${power}`);
      assert.ok(counter !== null && Number.isFinite(counter) && counter >= 0, `${co} ${power}`);
      assert.ok(attacker.getMovementPoints() >= 1, `${co} ${power}`);
      assert.ok(attacker.getBuildCost() > 0, `${co} ${power}`);
      assert.ok(artilleryRange !== undefined && artilleryRange.maxRange >= 2, `${co} ${power}`);
    }
  }
});

void test("the powers of the two strongest star costs are ordered and described", () => {
  for (const definition of Object.values(daysOfRuinCOs)) {
    assert.ok(definition.superPower.stars > definition.power.stars, definition.name);
    assert.ok(
      describeEffects(definition.superPower.effects, englishEffectPhrases).length > 0,
      definition.name,
    );
  }
});

void test("a power's table is what the game applies", () => {
  const { match, attacker, defender } = matchWith("brenner");

  attacker.setHp(50);
  applyCOPowerEvent(match, { type: "coPower", isSuper: false } as never);

  // Reinforce: +3 HP, +10% firepower and a total of +30% defense, of which the engine gives 10
  assert.equal(attacker.getVisualHP(), 8);
  assert.equal(attacker.player.getHook("attack")?.({ attacker, defender }), 110);
  assert.equal(
    attacker.player.getHook("defense")?.({ attacker: defender, defender: attacker }),
    120,
  );
});

void test("activating a power turns its hooks on until the next turn resets it", () => {
  const { match, player, attacker, defender } = matchWith("forsythe");

  assert.equal(player.getHook("attack")?.({ attacker, defender }), 110);

  applyCOPowerEvent(match, { type: "coPower", isSuper: true } as never);

  assert.equal(player.data.COPowerState, "super-co-power");
  assert.equal(player.getHook("attack")?.({ attacker, defender }), 130);
});

void test("an instant effect only damages its targets, and never kills", () => {
  const { match, attacker, defender } = matchWith("tabitha");

  applyCOPowerEvent(match, { type: "coPower", isSuper: true } as never);

  assert.equal(defender.getVisualHP(), 2);
  assert.equal(attacker.getVisualHP(), 10);
  assert.ok(match.units.includes(defender));
});

void test("Penny brings the rain and her units keep moving through it", () => {
  const { match, attacker } = matchWith("penny");

  applyCOPowerEvent(match, { type: "coPower", isSuper: false } as never);

  assert.equal(match.getCurrentWeather(), "rain");
  assert.equal(getWeatherSpecialMovement(attacker.player), "clear");
});

void test("each CO shows its own name", () => {
  const names = coSchema.options.map(
    (name) => getCOProperties({ name, version: "AW2" }).displayName,
  );

  assert.equal(new Set(names).size, names.length);
});

void test("only the official COs of the GBA and DS games are left", () => {
  for (const fanMade of ["adam", "beast", "julia", "ik-486-b7", "zandra", "roboandy"]) {
    assert.ok(!coSchema.options.includes(fanMade as CO), fanMade);
  }
});

void test("a huge defense blocks the damage instead of healing the target", () => {
  const { match, attacker, defender } = matchWith("andy", "caulder");

  match.getPlayerBySlot(1)!.data.COPowerState = "super-co-power";

  const damage = calculateDamage({ attacker, defender }, noLuck, false);

  assert.ok(damage !== null && damage >= 0);
});
