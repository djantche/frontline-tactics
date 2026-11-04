import type { COProperties } from "shared/match-logic/co";
import type { CombatProps, Hooks } from "shared/match-logic/co-hooks";
import type { CO } from "shared/schemas/co";
import { getDistance, isSamePosition } from "shared/schemas/position";
import type { Weather } from "shared/schemas/weather";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import type { UnitWrapper } from "shared/wrappers/unit";
import { getTerrainDefenseStars } from "../terrain-properties";
import { applySenseiPowerSpawn } from "./sensei/apply-sensei-power";

/**
 * The COs of Commander Wars, written as tables of effects: the game runs them, and the guide
 * describes them in every language from the same data, so the texts can't lie about the rules.
 *
 * Their numbers come from the scripts of Commander Wars. That game has CO zones and CO units,
 * and effects our engine can't express (paralysis, splash damage, attacking twice...). Those
 * became global effects with the same spirit: the tables below are what actually happens.
 */

export type UnitGroup =
  | "foot"
  | "ground"
  | "groundDirect"
  | "air"
  | "sea"
  | "direct"
  | "indirect"
  | "indirectOrSea"
  | "seaOrCopter";

export type CombatCondition =
  | "vsLowerOrEqualHp"
  | "vsHigherHp"
  | "vsDirect"
  | "vsIndirect"
  | "vsGrouped"
  | "vsAlone"
  | "supported"
  | "onNature"
  | "onProperty"
  | "nearMountain"
  | "inSandstorm";

export type UnitFilter =
  | "air"
  | "onProperty"
  | "notOnProperty"
  | "onNature"
  | "mostExpensive"
  | "densest";

export type COEffect =
  | { kind: "firepower"; value: number; units?: UnitGroup; when?: CombatCondition }
  | { kind: "firepowerPerEnemyStar"; value: number }
  | { kind: "firepowerPerOwnStar"; value: number }
  /** The firepower doesn't drop with the HP of the unit. */
  | { kind: "constantFirepower"; value: number }
  | { kind: "defense"; value: number; units?: UnitGroup; when?: CombatCondition }
  | { kind: "movement"; value: number; units?: UnitGroup }
  | { kind: "range"; value: number; units?: UnitGroup }
  | { kind: "vision"; value: number }
  | { kind: "terrainStars"; value: number; when?: CombatCondition }
  | { kind: "luck"; good: number; bad: number }
  | {
      kind: "luckByArmySize";
      goodPerUnit: number;
      goodMax: number;
      badPerUnit: number;
      badMax: number;
    }
  | { kind: "buildCost"; percent: number }
  | { kind: "heal"; hp: number; on?: UnitFilter }
  | { kind: "hit"; hp: number; targets?: UnitFilter }
  | { kind: "resupply" }
  | { kind: "stealFunds"; percent: number }
  | { kind: "drainAmmo"; percent: number }
  | { kind: "spawn"; unit: "infantry" | "mech" }
  | { kind: "weather"; weather: Weather; days: number }
  /** Handled in getWeatherSpecialMovement. */
  | { kind: "ignoresWeather"; only?: Weather };

type Definition = {
  name: string;
  dayToDay: COEffect[];
  power: { name: string; stars: number; effects: COEffect[] };
  superPower: { name: string; stars: number; effects: COEffect[] };
};

const fp = (value: number, units?: UnitGroup, when?: CombatCondition): COEffect => ({
  kind: "firepower",
  value,
  units,
  when,
});
const def = (value: number, units?: UnitGroup, when?: CombatCondition): COEffect => ({
  kind: "defense",
  value,
  units,
  when,
});
const move = (value: number, units?: UnitGroup): COEffect => ({ kind: "movement", value, units });
const range = (value: number, units: UnitGroup = "indirect"): COEffect => ({
  kind: "range",
  value,
  units,
});
const vision = (value: number): COEffect => ({ kind: "vision", value });
const stars = (value: number, when?: CombatCondition): COEffect => ({
  kind: "terrainStars",
  value,
  when,
});
const heal = (hp: number, on?: UnitFilter): COEffect => ({ kind: "heal", hp, on });
const hit = (hp: number, targets?: UnitFilter): COEffect => ({ kind: "hit", hp, targets });
const weather = (kind: Weather, days = 1): COEffect => ({ kind: "weather", weather: kind, days });
const cost = (percent: number): COEffect => ({ kind: "buildCost", percent });
const luck = (good: number, bad: number): COEffect => ({ kind: "luck", good, bad });
const resupply: COEffect = { kind: "resupply" };
const steal = (percent: number): COEffect => ({ kind: "stealFunds", percent });
const drainAmmo = (percent: number): COEffect => ({ kind: "drainAmmo", percent });
const spawn = (unit: "infantry" | "mech"): COEffect => ({ kind: "spawn", unit });
const constantFp = (value: number): COEffect => ({ kind: "constantFirepower", value });

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

export const commanderWarsCOs = {
  adam: co(
    "Adam",
    [fp(5), def(5)],
    ["Decimation", 4, [move(1), fp(30), def(10)]],
    ["Cartesian Cleanup", 9, [move(1), fp(40), def(20)]],
  ),
  aira: co(
    "Aira",
    [],
    ["Gust Storm", 4, [weather("clear"), fp(20), def(20)]],
    ["Hurricannon", 8, [weather("clear"), hit(3, "air"), fp(20), def(20)]],
  ),
  alexander: co(
    "Alexander",
    [def(5, undefined, "onProperty")],
    ["Peace Riots", 3, [fp(10), def(10)]],
    ["Inevitable Revolution", 7, [steal(50), fp(20), def(20)]],
  ),
  alexis: co(
    "Alexis",
    [def(10, undefined, "onProperty")],
    ["Crystal Brace", 4, [heal(3, "onProperty"), fp(15), fp(15, undefined, "onProperty"), def(15)]],
    [
      "Crystal Edge",
      8,
      [
        hit(3, "onProperty"),
        heal(3, "onProperty"),
        fp(15),
        fp(35, undefined, "onProperty"),
        def(15),
      ],
    ],
  ),
  amy: co(
    "Amy",
    [move(1, "sea")],
    ["Fluid Dynamics", 3, [move(2, "sea"), fp(10), fp(30, "sea"), def(10), cost(-10)]],
    ["Photon Discharge", 8, [fp(10), fp(40, "sea"), def(50)]],
  ),
  beast: co(
    "The Beast",
    [fp(30), def(-10)],
    ["Steroids", 3, [heal(2), fp(60), def(10)]],
    ["The Beast's Law", 6, [heal(3), move(2), fp(70), def(10)]],
  ),
  brenner: co(
    "Brenner",
    [def(10)],
    ["Reinforce", 4, [heal(3), fp(10), def(30)]],
    ["Lifeline", 6, [heal(5), fp(10), def(50)]],
  ),
  cairn: co(
    "Cairn",
    [stars(2, "onNature"), fp(-10, undefined, "onProperty")],
    ["Call of the Wild", 2, [stars(4, "onNature"), range(1), vision(1), fp(10), def(10)]],
    [
      "Force of Nature",
      5,
      [heal(1, "onNature"), stars(4, "onNature"), fp(10), fp(20, undefined, "onNature"), def(10)],
    ],
  ),
  cassidy: co(
    "Cassidy",
    [fp(10, undefined, "vsLowerOrEqualHp")],
    ["Rampage", 3, [fp(30), fp(30, undefined, "vsLowerOrEqualHp"), def(10)]],
    ["Scorched Earth", 7, [hit(1), fp(30), fp(50, undefined, "vsLowerOrEqualHp"), def(10)]],
  ),
  caulder: co(
    "Caulder",
    [],
    ["Mass Regeneration", 7, [heal(5), fp(60), def(50)]],
    ["Perfect Healing", 12, [heal(10), fp(60), def(50)]],
  ),
  conrad: co(
    "Conrad",
    [luck(0, 0), fp(10)],
    ["Calculated Strike", 3, [vision(1), luck(0, 0), fp(20), def(10)]],
    ["Precision Assault", 7, [vision(1), luck(50, 0), fp(20), def(10)]],
  ),
  davis: co(
    "Davis",
    [{ kind: "luckByArmySize", goodPerUnit: 1, goodMax: 30, badPerUnit: 1, badMax: 20 }],
    [
      "Survival Plans",
      3,
      [
        { kind: "luckByArmySize", goodPerUnit: 4, goodMax: 100, badPerUnit: 3, badMax: 60 },
        fp(10),
        def(10),
      ],
    ],
    [
      "The Stronger Side",
      6,
      [
        { kind: "luckByArmySize", goodPerUnit: 6, goodMax: 150, badPerUnit: 4, badMax: 100 },
        fp(10),
        def(10),
      ],
    ],
  ),
  epoch: co(
    "Epoch",
    [luck(20, 0)],
    ["Short Circuit", 1, [luck(30, 0), fp(20), def(20)]],
    ["Shocker", 5, [move(1, "direct"), range(1), luck(35, 0), fp(30), def(30)]],
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
  graves: co(
    "Graves",
    [],
    ["Plague", 4, [hit(1), fp(20), def(15)]],
    ["Perdition", 7, [hit(2), fp(20), def(15)]],
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
  "ik-486-b7": co(
    "IK-486-B7",
    [def(10, "direct")],
    ["Wall of Defense", 3, [fp(10), def(10), def(20, "direct")]],
    ["Great Counterstrike", 7, [fp(10), def(10), def(40, "direct")]],
  ),
  isabella: co(
    "Isabella",
    [],
    ["Deep Strike", 3, [move(1), range(1), fp(20), def(20)]],
    ["Overlord", 6, [move(2), range(2), fp(30), def(30)]],
  ),
  joey: co(
    "Joey",
    [fp(20, undefined, "vsHigherHp"), fp(-10, undefined, "vsLowerOrEqualHp")],
    ["Eccentricity", 4, [fp(10), fp(50, undefined, "vsHigherHp"), def(30)]],
    ["Tempestuous Technique", 7, [cost(-20), fp(10), fp(50, undefined, "vsHigherHp"), def(10)]],
  ),
  julia: co(
    "Julia",
    [constantFp(65)],
    ["Rallying Cry", 5, [constantFp(80), def(10)]],
    ["Media Mayhem", 10, [constantFp(90), def(10)]],
  ),
  lin: co(
    "Lin",
    [fp(10, "ground")],
    ["Preliminary Scout", 4, [vision(1), fp(10), fp(20, "ground"), def(10), def(20, "ground")]],
    ["Night Vision", 6, [vision(2), fp(10), fp(40, "ground"), def(10), def(40, "ground")]],
  ),
  mary: co(
    "Mary",
    [{ kind: "firepowerPerEnemyStar", value: 2 }],
    ["Highway of Pain", 3, [fp(20), def(10), { kind: "firepowerPerEnemyStar", value: 5 }]],
    ["Bloody Mary", 6, [fp(30), def(10), { kind: "firepowerPerEnemyStar", value: 15 }]],
  ),
  meiyo: co(
    "Meiyo",
    [fp(5, undefined, "vsLowerOrEqualHp")],
    ["Training Camp", 3, [fp(30), def(30)]],
    ["War Training", 7, [fp(50), def(50)]],
  ),
  melanthe: co(
    "Melanthe",
    [stars(1, "onNature"), fp(20, undefined, "onNature")],
    [
      "Synthetic Seedlings",
      3,
      [heal(3, "onNature"), stars(2, "onNature"), fp(10), fp(40, undefined, "onNature"), def(10)],
    ],
    [
      "Agent Dreadroot",
      7,
      [
        hit(2, "onNature"),
        heal(4, "onNature"),
        stars(2, "onNature"),
        fp(10),
        fp(40, undefined, "onNature"),
        def(10),
      ],
    ],
  ),
  mina: co(
    "Mina",
    [],
    ["Portent of Adversity", 3, [fp(20), def(20)]],
    ["Dark Lightning", 8, [hit(5, "mostExpensive"), fp(20), def(20)]],
  ),
  minamoto: co(
    "Minamoto",
    [fp(20, undefined, "nearMountain")],
    ["Wind Blade", 3, [fp(10), fp(60, undefined, "nearMountain"), def(10)]],
    ["Storm Slash", 6, [move(2), fp(10), fp(70, undefined, "nearMountain"), def(10)]],
  ),
  nana: co(
    "Nana",
    [fp(5, "indirect")],
    ["Chain Reaction", 5, [hit(1, "densest"), fp(10), def(10)]],
    ["Explosive Tantrum", 9, [hit(2, "densest"), fp(10), def(10)]],
  ),
  napoleon: co(
    "Napoleon",
    [def(20), def(10, undefined, "vsIndirect")],
    ["Blast Shield", 4, [fp(20), def(40), def(20, undefined, "vsIndirect")]],
    [
      "Last Stand",
      8,
      [
        fp(20),
        { kind: "firepowerPerOwnStar", value: 10 },
        def(50),
        def(10, undefined, "vsIndirect"),
      ],
    ],
  ),
  ozzy: co(
    "Ozzy",
    [def(15)],
    ["Hammer On", 3, [fp(10), def(50)]],
    ["Grand Finale", 6, [fp(10), def(50)]],
  ),
  penny: co(
    "Penny",
    [{ kind: "ignoresWeather" }],
    ["Stormfront", 3, [weather("rain", 2), fp(10), def(10)]],
    ["Enigma", 6, [weather("rain", 2), move(2), range(2), fp(30), def(10)]],
  ),
  peter: co(
    "Peter",
    [fp(20, undefined, "vsDirect"), { kind: "firepowerPerEnemyStar", value: -5 }],
    ["General Offensive", 2, [fp(10), fp(40, undefined, "vsDirect"), def(10)]],
    ["Bombing Run", 5, [hit(2, "notOnProperty"), fp(10), fp(40, undefined, "vsDirect"), def(10)]],
  ),
  rattigan: co(
    "Rattigan",
    [fp(25, undefined, "vsGrouped"), fp(-10, undefined, "vsAlone")],
    ["Raid", 3, [move(1), fp(10), fp(20, undefined, "vsGrouped"), def(10)]],
    [
      "The Sweep",
      7,
      [hit(1), fp(10), fp(40, undefined, "vsGrouped"), def(10), def(20, undefined, "vsGrouped")],
    ],
  ),
  roboandy: co(
    "Robo-Andy",
    [fp(5), luck(10, 5)],
    ["Cooldown", 3, [heal(1), fp(10), def(10)]],
    ["Critical Mass", 6, [heal(3), fp(10), def(10)]],
  ),
  robosturm: co(
    "Robo-Sturm",
    [move(1), fp(-20), def(20)],
    ["Mechanized Storm", 4, [drainAmmo(50), move(2), def(60)]],
    ["Mechanized Destruction", 9, [hit(2), drainAmmo(50), move(3), def(50)]],
  ),
  sabaki: co(
    "Sabaki",
    [],
    ["Speed Salvage", 3, [heal(1), fp(10), def(10)]],
    ["Rejuvenation Raid", 6, [heal(3), fp(10), def(10)]],
  ),
  sanjuro: co(
    "Sanjuro",
    [fp(5)],
    ["Heart of Gold", 2, [fp(10), def(10)]],
    ["Buying Power", 6, [cost(-50), fp(50), def(40)]],
  ),
  smitan: co(
    "Smitan",
    [fp(5, "direct")],
    ["Scramble Tactics", 3, [range(1), fp(10), def(10)]],
    ["Flare Drive", 8, [range(2), fp(20), def(10)]],
  ),
  sophie: co(
    "Sophie",
    [def(5)],
    ["Sudden Strike", 2, [fp(20), def(20)]],
    ["Total War", 6, [fp(30), def(20)]],
  ),
  tabitha: co(
    "Tabitha",
    [],
    ["Firestorm", 4, [hit(4, "densest"), fp(60), def(50)]],
    ["Apocalypse", 8, [hit(8, "densest"), fp(80), def(50)]],
  ),
  tasha: co(
    "Tasha",
    [fp(15, "air")],
    ["Sonic Boom", 3, [move(1), fp(10), fp(40, "air"), def(10), def(20, "air")]],
    ["Fox One", 6, [move(2), fp(10), fp(60, "air"), def(10), def(20, "air")]],
  ),
  varlot: co(
    "Varlot",
    [],
    ["Acquisition", 4, [steal(25), fp(20), def(20)]],
    ["Hostile Takeover", 8, [heal(4), fp(20), def(20)]],
  ),
  walter: co(
    "Walter",
    [],
    ["Memento", 5, [fp(20), def(20)]],
    ["Magnum Opus", 9, [hit(1), drainAmmo(80), fp(20), def(20)]],
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
  xavier: co(
    "Xavier",
    [fp(10, undefined, "supported")],
    ["Phasing Charge", 3, [fp(10), fp(30, undefined, "supported"), def(10)]],
    ["Reality Minus", 7, [fp(10), fp(60, undefined, "supported"), def(10)]],
  ),
  yukio: co(
    "Yukio",
    [fp(15), def(15)],
    ["Dark Assault", 8, [spawn("infantry"), fp(10), def(10)]],
    ["Total Invasion", 15, [spawn("mech"), hit(4, "mostExpensive"), fp(10), def(10)]],
  ),
  zandra: co(
    "Zandra",
    [{ kind: "ignoresWeather", only: "sandstorm" }, fp(10, undefined, "inSandstorm")],
    [
      "Sand Shift",
      4,
      [weather("sandstorm"), range(1), fp(10), fp(45, undefined, "inSandstorm"), def(10)],
    ],
    [
      "Desert Gale",
      7,
      [weather("sandstorm"), hit(2), range(1), fp(10), fp(45, undefined, "inSandstorm"), def(10)],
    ],
  ),
} satisfies Partial<Record<CO, Definition>>;

export type CommanderWarsCO = keyof typeof commanderWarsCOs;

export const isCommanderWarsCO = (name: CO): name is CommanderWarsCO => name in commanderWarsCOs;

const isCopter = (unit: UnitWrapper) =>
  unit.data.type === "battleCopter" || unit.data.type === "transportCopter";

const isInGroup = (unit: UnitWrapper, group: UnitGroup | undefined) => {
  const { facility } = unit.properties;

  switch (group) {
    case undefined:
      return true;
    case "foot":
      return unit.isInfantryOrMech();
    case "ground":
      return facility === "base";
    case "groundDirect":
      return facility === "base" && !unit.isIndirect();
    case "air":
      return facility === "airport";
    case "sea":
      return facility === "port";
    case "direct":
      return !unit.isIndirect();
    case "indirect":
      return unit.isIndirect();
    case "indirectOrSea":
      return unit.isIndirect() || facility === "port";
    case "seaOrCopter":
      return facility === "port" || isCopter(unit);
  }
};

const natureTiles = new Set(["plain", "forest", "mountain", "river", "shoal", "reef", "sea"]);

const isOnProperty = (unit: UnitWrapper) => "playerSlot" in unit.getTile();
const isOnNature = (unit: UnitWrapper) => natureTiles.has(unit.getTile().type);

const isNearMountain = (unit: UnitWrapper) => {
  const [unitX, unitY] = unit.data.position;
  const { tiles } = unit.match.map.data;

  for (let y = unitY - 2; y <= unitY + 2; y++) {
    for (let x = unitX - 2; x <= unitX + 2; x++) {
      if (Math.abs(x - unitX) + Math.abs(y - unitY) <= 2 && tiles[y]?.[x]?.type === "mountain") {
        return true;
      }
    }
  }

  return false;
};

const isConditionMet = (
  condition: CombatCondition | undefined,
  self: UnitWrapper,
  other: UnitWrapper,
) => {
  const isAllyOf = (unit: UnitWrapper, ally: UnitWrapper) =>
    unit.data.playerSlot === ally.data.playerSlot;

  switch (condition) {
    case undefined:
      return true;
    case "vsLowerOrEqualHp":
      return other.getVisualHP() <= self.getVisualHP();
    case "vsHigherHp":
      return other.getVisualHP() > self.getVisualHP();
    case "vsDirect":
      return !other.isIndirect();
    case "vsIndirect":
      return other.isIndirect();
    case "vsGrouped":
      return other.getNeighbouringUnits().some((unit) => isAllyOf(unit, other));
    case "vsAlone":
      return !other.getNeighbouringUnits().some((unit) => isAllyOf(unit, other));
    case "supported":
      return other
        .getNeighbouringUnits()
        .some(
          (unit) => isAllyOf(unit, self) && !isSamePosition(unit.data.position, self.data.position),
        );
    case "onNature":
      return isOnNature(self);
    case "onProperty":
      return isOnProperty(self);
    case "nearMountain":
      return isNearMountain(self);
    case "inSandstorm":
      return self.match.getCurrentWeather() === "sandstorm";
  }
};

const maxDefense = 150;

const sumOf = (values: number[]) => values.reduce((total, value) => total + value, 0);

const compileHooks = (effects: COEffect[], isPower: boolean): Partial<Hooks> => {
  const hooks: Partial<Hooks> = {};
  const has = (kinds: COEffect["kind"][]) => effects.some(({ kind }) => kinds.includes(kind));

  if (has(["firepower", "firepowerPerEnemyStar", "firepowerPerOwnStar", "constantFirepower"])) {
    hooks.attack = ({ attacker, defender }: CombatProps) => {
      const { player } = attacker;
      let value = 100 + player.getCommtowerAttackBoost();

      for (const effect of effects) {
        if (
          effect.kind === "firepower" &&
          isInGroup(attacker, effect.units) &&
          isConditionMet(effect.when, attacker, defender)
        ) {
          value += effect.value;
        } else if (effect.kind === "constantFirepower") {
          // the damage formula multiplies by the HP: this cancels it
          value += effect.value - 100;
          value = (value * 10) / attacker.getVisualHP();
        }
      }

      const enemyStars = getTerrainDefenseStars(defender.getTile().type);
      const ownStars = getTerrainDefenseStars(attacker.getTile().type);

      value += sumOf(
        effects.map((effect) => {
          if (effect.kind === "firepowerPerEnemyStar") {
            return effect.value * enemyStars;
          }

          return effect.kind === "firepowerPerOwnStar" ? effect.value * ownStars : 0;
        }),
      );

      const powerBonus = isPower ? player.getVersionProperties().powerFirepowerMod(100) - 100 : 0;

      return Math.max(0, value - powerBonus);
    };
  }

  if (has(["defense"])) {
    hooks.defense = ({ attacker, defender }: CombatProps) => {
      const value = sumOf(
        effects.map((effect) =>
          effect.kind === "defense" &&
          isInGroup(defender, effect.units) &&
          isConditionMet(effect.when, defender, attacker)
            ? effect.value
            : 0,
        ),
      );
      const powerBonus = isPower
        ? defender.player.getVersionProperties().powerDefenseMod(100) - 100
        : 0;

      return Math.min(maxDefense, 100 + value) - powerBonus;
    };
  }

  if (has(["movement"])) {
    hooks.movementPoints = (points, unit) =>
      points +
      sumOf(
        effects.map((effect) =>
          effect.kind === "movement" && isInGroup(unit, effect.units) ? effect.value : 0,
        ),
      );
  }

  if (has(["range"])) {
    hooks.attackRange = (baseRange, unit) =>
      baseRange +
      sumOf(
        effects.map((effect) =>
          effect.kind === "range" && unit.isIndirect() && isInGroup(unit, effect.units)
            ? effect.value
            : 0,
        ),
      );
  }

  if (has(["vision"])) {
    hooks.vision = (baseVision) =>
      baseVision + sumOf(effects.map((effect) => (effect.kind === "vision" ? effect.value : 0)));
  }

  if (has(["terrainStars"])) {
    hooks.terrainStars = (baseStars, { attacker, defender }) =>
      baseStars +
      sumOf(
        effects.map((effect) =>
          effect.kind === "terrainStars" && isConditionMet(effect.when, defender, attacker)
            ? effect.value
            : 0,
        ),
      );
  }

  if (has(["buildCost"])) {
    hooks.buildCost = (baseCost) =>
      baseCost +
      sumOf(
        effects.map((effect) =>
          effect.kind === "buildCost" ? Math.round((baseCost * effect.percent) / 100) : 0,
        ),
      );
  }

  for (const effect of effects) {
    if (effect.kind === "luck") {
      hooks.maxGoodLuck = () => effect.good;
      hooks.maxBadLuck = () => effect.bad;
    } else if (effect.kind === "luckByArmySize") {
      const lead = ({ attacker }: CombatProps) => {
        const own = attacker.player.getUnits().length;
        return own - attacker.player.team.getEnemyUnits().length;
      };

      hooks.maxGoodLuck = (props) =>
        10 + Math.min(effect.goodMax, Math.max(0, lead(props)) * effect.goodPerUnit);
      hooks.maxBadLuck = (props) =>
        Math.min(effect.badMax, Math.max(0, -lead(props)) * effect.badPerUnit);
    }
  }

  return hooks;
};

const selectUnits = (units: UnitWrapper[], filter: UnitFilter | undefined) => {
  switch (filter) {
    case undefined:
      return units;
    case "air":
      return units.filter((unit) => unit.properties.facility === "airport");
    case "onProperty":
      return units.filter(isOnProperty);
    case "notOnProperty":
      return units.filter((unit) => !isOnProperty(unit));
    case "onNature":
      return units.filter(isOnNature);
    case "mostExpensive": {
      const sorted = [...units].sort((a, b) => b.getBuildCost() - a.getBuildCost());
      return sorted.slice(0, Math.ceil(units.length * 0.2));
    }
    case "densest": {
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
    }
  }
};

/** It runs on the server and on every client, so it must stay deterministic. */
const runInstantEffects = (effects: COEffect[], player: PlayerInMatchWrapper) => {
  for (const effect of effects) {
    switch (effect.kind) {
      case "heal":
        selectUnits(player.getUnits(), effect.on).forEach((unit) => unit.heal(effect.hp));
        break;
      case "hit":
        selectUnits(player.team.getEnemyUnits(), effect.targets).forEach((unit) =>
          unit.damageUntil1HP(effect.hp),
        );
        break;
      case "resupply":
        player.getUnits().forEach((unit) => unit.resupply());
        break;
      case "stealFunds":
        for (const enemy of player.match.getAllPlayers()) {
          if (enemy.team.index !== player.team.index) {
            const stolen = Math.floor((enemy.data.funds * effect.percent) / 100);
            enemy.data.funds -= stolen;
            player.data.funds += stolen;
          }
        }

        break;
      case "drainAmmo":
        player.team.getEnemyUnits().forEach((unit) => {
          const ammo = unit.getAmmo();

          if (ammo !== null) {
            unit.setAmmo(Math.floor((ammo * (100 - effect.percent)) / 100));
          }
        });
        break;
      case "spawn":
        applySenseiPowerSpawn(player, effect.unit);
        break;
      case "weather":
        player.match.setWeather(effect.weather, effect.days);
        break;
    }
  }
};

const instantKinds: COEffect["kind"][] = [
  "heal",
  "hit",
  "resupply",
  "stealFunds",
  "drainAmmo",
  "spawn",
  "weather",
];

/** The words of a language to describe effects. The guide gives them. */
export type COEffectPhrases = {
  groups: Record<UnitGroup, string>;
  conditions: Record<CombatCondition, string>;
  healFilters: Record<UnitFilter, string>;
  hitTargets: Record<UnitFilter | "all", string>;
  weathers: Record<Weather, string>;
  units: { infantry: string; mech: string };
  scoped: (group: string, effect: string) => string;
  firepower: (value: string) => string;
  defense: (value: string) => string;
  constantFirepower: (value: number) => string;
  firepowerPerEnemyStar: (value: string) => string;
  firepowerPerOwnStar: (value: string) => string;
  movement: (value: string) => string;
  range: (value: string) => string;
  vision: (value: string) => string;
  terrainStars: (value: string) => string;
  luck: (good: number, bad: number) => string;
  luckByArmySize: (
    goodPerUnit: number,
    goodMax: number,
    badPerUnit: number,
    badMax: number,
  ) => string;
  buildCost: (value: string) => string;
  heal: (hp: number) => string;
  hit: (targets: string, hp: number) => string;
  resupply: string;
  stealFunds: (percent: number) => string;
  drainAmmo: (percent: number) => string;
  spawn: (unit: string) => string;
  weather: (weather: string, days: number) => string;
  ignoresWeather: (weather: string | undefined) => string;
};

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** A rule for some units adds to the general one: what the player needs to read is the total. */
const totalOf = (effect: COEffect & { kind: "firepower" | "defense" }, effects: COEffect[]) => {
  if (effect.units === undefined && effect.when === undefined) {
    return effect.value;
  }

  return sumOf(
    effects.map((other) =>
      other === effect ||
      (other.kind === effect.kind && other.units === undefined && other.when === undefined)
        ? (other as typeof effect).value
        : 0,
    ),
  );
};

const describeEffect = (effect: COEffect, effects: COEffect[], words: COEffectPhrases) => {
  const scoped = (text: string, units?: UnitGroup, when?: CombatCondition) => {
    const conditioned = when === undefined ? text : `${text} ${words.conditions[when]}`;

    return units === undefined ? conditioned : words.scoped(words.groups[units], conditioned);
  };

  switch (effect.kind) {
    case "firepower":
      return scoped(words.firepower(signed(totalOf(effect, effects))), effect.units, effect.when);
    case "defense":
      return scoped(words.defense(signed(totalOf(effect, effects))), effect.units, effect.when);
    case "constantFirepower":
      return words.constantFirepower(effect.value);
    case "firepowerPerEnemyStar":
      return words.firepowerPerEnemyStar(signed(effect.value));
    case "firepowerPerOwnStar":
      return words.firepowerPerOwnStar(signed(effect.value));
    case "movement":
      return scoped(words.movement(signed(effect.value)), effect.units);
    case "range":
      return scoped(words.range(signed(effect.value)), effect.units);
    case "vision":
      return words.vision(signed(effect.value));
    case "terrainStars":
      return scoped(words.terrainStars(signed(effect.value)), undefined, effect.when);
    case "luck":
      return words.luck(effect.good, effect.bad);
    case "luckByArmySize":
      return words.luckByArmySize(
        effect.goodPerUnit,
        effect.goodMax,
        effect.badPerUnit,
        effect.badMax,
      );
    case "buildCost":
      return words.buildCost(signed(effect.percent));
    case "heal":
      return effect.on === undefined
        ? words.heal(effect.hp)
        : `${words.heal(effect.hp)} ${words.healFilters[effect.on]}`;
    case "hit":
      return words.hit(words.hitTargets[effect.targets ?? "all"], effect.hp);
    case "resupply":
      return words.resupply;
    case "stealFunds":
      return words.stealFunds(effect.percent);
    case "drainAmmo":
      return words.drainAmmo(effect.percent);
    case "spawn":
      return words.spawn(words.units[effect.unit]);
    case "weather":
      return words.weather(words.weathers[effect.weather], effect.days);
    case "ignoresWeather":
      return words.ignoresWeather(
        effect.only === undefined ? undefined : words.weathers[effect.only],
      );
  }
};

export const describeEffects = (effects: COEffect[], words: COEffectPhrases) =>
  effects.map((effect) => `${describeEffect(effect, effects, words)}.`).join(" ");

export const englishEffectPhrases: COEffectPhrases = {
  groups: {
    foot: "Footsoldiers",
    ground: "Ground units",
    groundDirect: "Direct ground units",
    air: "Air units",
    sea: "Naval units",
    direct: "Direct units",
    indirect: "Indirect units",
    indirectOrSea: "Indirect and naval units",
    seaOrCopter: "Naval units and copters",
  },
  conditions: {
    vsLowerOrEqualHp: "against units with equal or lower HP",
    vsHigherHp: "against units with higher HP",
    vsDirect: "against direct units",
    vsIndirect: "against indirect units",
    vsGrouped: "against units next to an ally",
    vsAlone: "against isolated units",
    supported: "when another unit stands next to the enemy",
    onNature: "on natural terrain",
    onProperty: "on a property",
    nearMountain: "within 2 tiles of a mountain",
    inSandstorm: "in a sandstorm",
  },
  healFilters: {
    air: "for air units",
    onProperty: "for units on a property",
    notOnProperty: "for units outside properties",
    onNature: "for units on natural terrain",
    mostExpensive: "for the most expensive 20% of units",
    densest: "for the largest group of units",
  },
  hitTargets: {
    all: "All enemy units",
    air: "Enemy air units",
    onProperty: "Enemy units on a property",
    notOnProperty: "Enemy units outside properties",
    onNature: "Enemy units on natural terrain",
    mostExpensive: "The most expensive 20% of enemy units",
    densest: "The largest enemy group (radius of 2)",
  },
  weathers: { clear: "clear", snow: "snow", rain: "rain", sandstorm: "sandstorm" },
  units: { infantry: "infantry", mech: "mech" },
  scoped: (group, effect) => `${group}: ${effect}`,
  firepower: (value) => `${value}% firepower`,
  defense: (value) => `${value}% defense`,
  constantFirepower: (value) => `${value}% firepower, whatever the HP of the unit`,
  firepowerPerEnemyStar: (value) => `${value}% firepower per terrain star of the target`,
  firepowerPerOwnStar: (value) => `${value}% firepower per terrain star of the unit`,
  movement: (value) => `${value} movement`,
  range: (value) => `${value} range`,
  vision: (value) => `${value} vision`,
  terrainStars: (value) => `${value} terrain stars`,
  luck: (good, bad) => `Luck of ${good}% and bad luck of ${bad}%`,
  luckByArmySize: (goodPerUnit, goodMax, badPerUnit, badMax) =>
    `With more units than the enemy: +${goodPerUnit}% luck per unit of lead (up to ${goodMax}%). With fewer: +${badPerUnit}% bad luck per unit behind (up to ${badMax}%)`,
  buildCost: (value) => `${value}% build cost`,
  heal: (hp) => `Restores ${hp} HP`,
  hit: (targets, hp) => `${targets} lose ${hp} HP (down to 0.1 HP at most)`,
  resupply: "Resupplies all units",
  stealFunds: (percent) => `Takes ${percent}% of the funds of the enemies`,
  drainAmmo: (percent) => `Enemy units lose ${percent}% of their ammo`,
  spawn: (unit) => `Spawns 9 HP ${unit}, ready to move, on free allied cities`,
  weather: (weather, days) => `Changes the weather to ${weather} for ${days} day(s)`,
  ignoresWeather: (weather) =>
    weather === undefined ? "Movement ignores the weather" : `Movement ignores ${weather}`,
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

export const commanderWarsCOProperties = Object.entries(commanderWarsCOs).map(
  ([name, definition]): [CO, COProperties] => [
    name as CommanderWarsCO,
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
