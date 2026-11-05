import type { COProperties } from "shared/match-logic/co";
import type { CombatProps, Hooks } from "shared/match-logic/co-hooks";
import type { CO } from "shared/schemas/co";
import { getDistance } from "shared/schemas/position";
import type { Weather } from "shared/schemas/weather";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import type { UnitWrapper } from "shared/wrappers/unit";

/**
 * The COs of Days of Ruin, written as tables of effects: the game runs them, and the guide
 * describes them in every language from the same data, so the texts can't lie about the rules.
 *
 * Their numbers come from the scripts of Commander Wars, which has CO zones and CO units. Our
 * engine has neither, so those became global effects: the tables are what actually happens.
 */

export type UnitGroup =
  | "ground"
  | "groundDirect"
  | "air"
  | "indirect"
  | "indirectOrSea"
  | "seaOrCopter";

export type COEffect =
  | { kind: "firepower"; value: number; units?: UnitGroup }
  | { kind: "defense"; value: number; units?: UnitGroup }
  | { kind: "movement"; value: number; units?: UnitGroup }
  | { kind: "range"; value: number }
  | { kind: "vision"; value: number }
  | { kind: "heal"; hp: number }
  /** On the largest group of enemy units. */
  | { kind: "strike"; hp: number }
  | { kind: "resupply" }
  | { kind: "weather"; weather: Weather; days: number }
  /** Handled in getWeatherSpecialMovement. */
  | { kind: "ignoresWeather" };

type Definition = {
  name: string;
  dayToDay: COEffect[];
  power: { name: string; stars: number; effects: COEffect[] };
  superPower: { name: string; stars: number; effects: COEffect[] };
};

const fp = (value: number, units?: UnitGroup): COEffect => ({ kind: "firepower", value, units });
const def = (value: number, units?: UnitGroup): COEffect => ({ kind: "defense", value, units });
const move = (value: number, units?: UnitGroup): COEffect => ({ kind: "movement", value, units });
const range = (value: number): COEffect => ({ kind: "range", value });
const vision = (value: number): COEffect => ({ kind: "vision", value });
const heal = (hp: number): COEffect => ({ kind: "heal", hp });
const strike = (hp: number): COEffect => ({ kind: "strike", hp });
const resupply: COEffect = { kind: "resupply" };
const rain: COEffect = { kind: "weather", weather: "rain", days: 2 };

const co = (
  name: string,
  dayToDay: COEffect[],
  [powerName, powerStars, power]: [string, number, COEffect[]],
  [superName, superStars, superPower]: [string, number, COEffect[]],
): Definition => ({
  name,
  dayToDay,
  power: { name: powerName, stars: powerStars, effects: power },
  superPower: { name: superName, stars: superStars, effects: superPower },
});

export const daysOfRuinCOs = {
  brenner: co(
    "Brenner",
    [def(10)],
    ["Reinforce", 4, [heal(3), fp(10), def(30)]],
    ["Lifeline", 6, [heal(5), fp(10), def(50)]],
  ),
  caulder: co(
    "Caulder",
    [],
    ["Mass Regeneration", 7, [heal(5), fp(60), def(50)]],
    ["Perfect Healing", 12, [heal(10), fp(60), def(50)]],
  ),
  forsythe: co(
    "Forsythe",
    [fp(10), def(10)],
    ["Power of Honor", 5, [fp(20), def(20)]],
    ["Knights of the Desert", 6, [fp(30), def(30)]],
  ),
  gage: co(
    "Gage",
    [fp(10, "indirectOrSea")],
    ["Longshot", 3, [range(2), fp(10), fp(20, "indirectOrSea"), def(10), def(10, "indirectOrSea")]],
    [
      "Sniper's Shot",
      6,
      [range(3), fp(10), fp(40, "indirectOrSea"), def(10), def(20, "indirectOrSea")],
    ],
  ),
  greyfield: co(
    "Greyfield",
    [def(20, "seaOrCopter")],
    ["Supply Chain", 3, [resupply, fp(10), fp(10, "seaOrCopter"), def(10), def(40, "seaOrCopter")]],
    [
      "High Command",
      6,
      [
        resupply,
        move(1, "seaOrCopter"),
        fp(10),
        fp(60, "seaOrCopter"),
        def(10),
        def(50, "seaOrCopter"),
      ],
    ],
  ),
  isabella: co(
    "Isabella",
    [],
    ["Deep Strike", 3, [move(1), range(1), fp(20), def(20)]],
    ["Overlord", 6, [move(2), range(2), fp(30), def(30)]],
  ),
  lin: co(
    "Lin",
    [fp(10, "ground")],
    ["Preliminary Scout", 4, [vision(1), fp(10), fp(20, "ground"), def(10), def(20, "ground")]],
    ["Night Vision", 6, [vision(2), fp(10), fp(40, "ground"), def(10), def(40, "ground")]],
  ),
  penny: co(
    "Penny",
    [{ kind: "ignoresWeather" }],
    ["Stormfront", 3, [rain, fp(10), def(10)]],
    ["Enigma", 6, [rain, move(2), range(2), fp(30), def(10)]],
  ),
  tabitha: co(
    "Tabitha",
    [],
    ["Firestorm", 4, [strike(4), fp(60), def(50)]],
    ["Apocalypse", 8, [strike(8), fp(80), def(50)]],
  ),
  tasha: co(
    "Tasha",
    [fp(15, "air")],
    ["Sonic Boom", 3, [move(1), fp(10), fp(40, "air"), def(10), def(20, "air")]],
    ["Fox One", 6, [move(2), fp(10), fp(60, "air"), def(10), def(20, "air")]],
  ),
  waylon: co(
    "Waylon",
    [def(20, "air")],
    ["Bad Company", 3, [fp(10), fp(20, "air"), def(10), def(40, "air")]],
    ["Wingman", 6, [fp(10), fp(50, "air"), def(10), def(40, "air")]],
  ),
  will: co(
    "Will",
    [fp(10, "groundDirect")],
    ["Rally Cry", 3, [move(1, "ground"), fp(10), fp(20, "groundDirect"), def(10)]],
    ["New Era", 6, [move(2, "ground"), fp(10), fp(40, "groundDirect"), def(10)]],
  ),
} satisfies Partial<Record<CO, Definition>>;

export type DaysOfRuinCO = keyof typeof daysOfRuinCOs;

export const isDaysOfRuinCO = (name: CO): name is DaysOfRuinCO => name in daysOfRuinCOs;

const isInGroup = (unit: UnitWrapper, group: UnitGroup | undefined) => {
  const { facility } = unit.properties;

  switch (group) {
    case undefined:
      return true;
    case "ground":
      return facility === "base";
    case "groundDirect":
      return facility === "base" && !unit.isIndirect();
    case "air":
      return facility === "airport";
    case "indirect":
      return unit.isIndirect();
    case "indirectOrSea":
      return unit.isIndirect() || facility === "port";
    case "seaOrCopter":
      return (
        facility === "port" ||
        unit.data.type === "battleCopter" ||
        unit.data.type === "transportCopter"
      );
  }
};

const maxDefense = 150;

const sumOf = (values: number[]) => values.reduce((total, value) => total + value, 0);

const compileHooks = (effects: COEffect[], isPower: boolean): Partial<Hooks> => {
  const hooks: Partial<Hooks> = {};
  const has = (kind: COEffect["kind"]) => effects.some((effect) => effect.kind === kind);

  if (has("firepower")) {
    hooks.attack = ({ attacker }: CombatProps) => {
      const { player } = attacker;
      const bonus = sumOf(
        effects.map((effect) =>
          effect.kind === "firepower" && isInGroup(attacker, effect.units) ? effect.value : 0,
        ),
      );
      const powerBonus = isPower ? player.getVersionProperties().powerFirepowerMod(100) - 100 : 0;

      return 100 + player.getCommtowerAttackBoost() + bonus - powerBonus;
    };
  }

  if (has("defense")) {
    hooks.defense = ({ defender }: CombatProps) => {
      const bonus = sumOf(
        effects.map((effect) =>
          effect.kind === "defense" && isInGroup(defender, effect.units) ? effect.value : 0,
        ),
      );
      const powerBonus = isPower
        ? defender.player.getVersionProperties().powerDefenseMod(100) - 100
        : 0;

      return Math.min(maxDefense, 100 + bonus) - powerBonus;
    };
  }

  if (has("movement")) {
    hooks.movementPoints = (points, unit) =>
      points +
      sumOf(
        effects.map((effect) =>
          effect.kind === "movement" && isInGroup(unit, effect.units) ? effect.value : 0,
        ),
      );
  }

  if (has("range")) {
    hooks.attackRange = (baseRange, unit) =>
      unit.isIndirect()
        ? baseRange + sumOf(effects.map((effect) => (effect.kind === "range" ? effect.value : 0)))
        : baseRange;
  }

  if (has("vision")) {
    hooks.vision = (baseVision) =>
      baseVision + sumOf(effects.map((effect) => (effect.kind === "vision" ? effect.value : 0)));
  }

  return hooks;
};

const largestGroupOf = (units: UnitWrapper[]) => {
  const around = (center: UnitWrapper) =>
    units.filter((unit) => getDistance(center.data.position, unit.data.position) <= 2);
  const valueAround = (center: UnitWrapper) =>
    sumOf(around(center).map((unit) => unit.getBuildCost()));
  const best = units.reduce<UnitWrapper | undefined>(
    (current, unit) =>
      current === undefined || valueAround(unit) > valueAround(current) ? unit : current,
    undefined,
  );

  return best === undefined ? [] : around(best);
};

/** It runs on the server and on every client, so it must stay deterministic. */
const runInstantEffects = (effects: COEffect[], player: PlayerInMatchWrapper) => {
  for (const effect of effects) {
    switch (effect.kind) {
      case "heal":
        player.getUnits().forEach((unit) => unit.heal(effect.hp));
        break;
      case "strike":
        largestGroupOf(player.team.getEnemyUnits()).forEach((unit) =>
          unit.damageUntil1HP(effect.hp),
        );
        break;
      case "resupply":
        player.getUnits().forEach((unit) => unit.resupply());
        break;
      case "weather":
        player.match.setWeather(effect.weather, effect.days);
        break;
    }
  }
};

const instantKinds: COEffect["kind"][] = ["heal", "strike", "resupply", "weather"];

/** The words of a language to describe effects. The guide gives them. */
export type COEffectPhrases = {
  groups: Record<UnitGroup, string>;
  weathers: Record<Weather, string>;
  scoped: (group: string, effect: string) => string;
  firepower: (value: string) => string;
  defense: (value: string) => string;
  movement: (value: string) => string;
  range: (value: string) => string;
  vision: (value: string) => string;
  heal: (hp: number) => string;
  strike: (hp: number) => string;
  resupply: string;
  weather: (weather: string, days: number) => string;
  ignoresWeather: string;
};

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** A rule for some units adds to the general one: what the player needs to read is the total. */
const totalOf = (effect: COEffect & { kind: "firepower" | "defense" }, effects: COEffect[]) => {
  if (effect.units === undefined) {
    return effect.value;
  }

  return sumOf(
    effects.map((other) =>
      other === effect || (other.kind === effect.kind && other.units === undefined)
        ? (other as typeof effect).value
        : 0,
    ),
  );
};

const describeEffect = (effect: COEffect, effects: COEffect[], words: COEffectPhrases) => {
  const scoped = (text: string, units?: UnitGroup) =>
    units === undefined ? text : words.scoped(words.groups[units], text);

  switch (effect.kind) {
    case "firepower":
      return scoped(words.firepower(signed(totalOf(effect, effects))), effect.units);
    case "defense":
      return scoped(words.defense(signed(totalOf(effect, effects))), effect.units);
    case "movement":
      return scoped(words.movement(signed(effect.value)), effect.units);
    case "range":
      return scoped(words.range(signed(effect.value)), "indirect");
    case "vision":
      return words.vision(signed(effect.value));
    case "heal":
      return words.heal(effect.hp);
    case "strike":
      return words.strike(effect.hp);
    case "resupply":
      return words.resupply;
    case "weather":
      return words.weather(words.weathers[effect.weather], effect.days);
    case "ignoresWeather":
      return words.ignoresWeather;
  }
};

export const describeEffects = (effects: COEffect[], words: COEffectPhrases) =>
  effects.map((effect) => `${describeEffect(effect, effects, words)}.`).join(" ");

export const englishEffectPhrases: COEffectPhrases = {
  groups: {
    ground: "Ground units",
    groundDirect: "Direct ground units",
    air: "Air units",
    indirect: "Indirect units",
    indirectOrSea: "Indirect and naval units",
    seaOrCopter: "Naval units and copters",
  },
  weathers: { clear: "clear", snow: "snow", rain: "rain", sandstorm: "sandstorm" },
  scoped: (group, effect) => `${group}: ${effect}`,
  firepower: (value) => `${value}% firepower`,
  defense: (value) => `${value}% defense`,
  movement: (value) => `${value} movement`,
  range: (value) => `${value} range`,
  vision: (value) => `${value} vision`,
  heal: (hp) => `Restores ${hp} HP`,
  strike: (hp) => `The largest enemy group (radius of 2) loses ${hp} HP (down to 0.1 HP at most)`,
  resupply: "Resupplies all units",
  weather: (weather, days) => `Changes the weather to ${weather} for ${days} day(s)`,
  ignoresWeather: "Movement ignores the weather",
};

const describe = (effects: COEffect[]) => describeEffects(effects, englishEffectPhrases);

const compilePower = ({ name, stars: starCost, effects }: Definition["power"]) => ({
  name,
  stars: starCost,
  description: describe(effects),
  hooks: compileHooks(effects, true),
  ...(effects.some(({ kind }) => instantKinds.includes(kind))
    ? { instantEffect: (player: PlayerInMatchWrapper) => runInstantEffects(effects, player) }
    : {}),
});

export const daysOfRuinCOProperties = Object.entries(daysOfRuinCOs).map(
  ([name, definition]): [CO, COProperties] => [
    name as DaysOfRuinCO,
    {
      displayName: definition.name,
      gameVersion: "AW2",
      ...(definition.dayToDay.length > 0
        ? {
            dayToDay: {
              description: describe(definition.dayToDay),
              hooks: compileHooks(definition.dayToDay, false),
            },
          }
        : {}),
      powers: {
        COPower: compilePower(definition.power),
        superCOPower: compilePower(definition.superPower),
      },
    },
  ],
);
