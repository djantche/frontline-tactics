import type { BattleManifest, UnitBattleData } from "./battle-manifest";

const unitDelayMs = 75;
const moveInMs = 610;
const impactMs = 1000;
const explosionMs = 900;
/** The hit shows for a moment, then the lost units blow up. */
const hitToExplosionMs = 160;
/** The survivors answer right after the hit, while the explosions are still playing. */
const hitToCounterMs = 280;
const holdMs = 700;

export const sideWidth = 128;
export const sceneHeight = 192;

export type BattleSideView = {
  unitType: keyof BattleManifest["units"];
  army: keyof UnitBattleData["armies"];
  co: keyof BattleManifest["cos"];
  /** raw HP, from 0 to 100 */
  hpBefore: number;
  hpAfter: number;
  terrain: string;
  stars: number;
};

export type BattleView = {
  attacker: BattleSideView;
  defender: BattleSideView;
};

/** Each unit of a formation stands for a part of the HP, like in Advance Wars. */
export const unitCountOf = (hp: number, maxCount: number) =>
  Math.max(0, Math.ceil((Math.ceil(hp / 10) / 10) * maxCount));

/** Where a member of the formation stands, measured from the bottom left of the side. */
export const formationPosition = (index: number, maxCount: number): [number, number] =>
  maxCount <= 1 ? [0, 0] : [(index * 70) % 100, 15 * (maxCount - index) + 8];

export type SideAction =
  | { kind: "moveIn"; start: number; end: number }
  | { kind: "fire"; start: number; end: number }
  | { kind: "impact"; start: number; end: number; hpFrom: number; hpTo: number };

export type Timeline = {
  attacker: SideAction[];
  defender: SideAction[];
  sounds: { at: number; name: string }[];
  end: number;
};

export const buildTimeline = (view: BattleView, manifest: BattleManifest): Timeline => {
  const attackerData = manifest.units[view.attacker.unitType];
  const defenderData = manifest.units[view.defender.unitType];

  const attacker: SideAction[] = [];
  const defender: SideAction[] = [];
  const sounds: Timeline["sounds"] = [];
  let time = 300;
  let lastEffectEnd = 0;

  const moves = attackerData.armies[view.attacker.army].move !== null;

  if (moves) {
    attacker.push({ kind: "moveIn", start: time, end: time + moveInMs });
    sounds.push({
      at: time,
      name: attackerData.kind === "foot" ? "infantry_move.wav" : "tank_move.wav",
    });
    time += moveInMs;
  }

  const exchange = (
    shooterData: UnitBattleData,
    shooterActions: SideAction[],
    targetData: UnitBattleData,
    targetActions: SideAction[],
    hpFrom: number,
    hpTo: number,
    shooterHp: number,
  ) => {
    const count = Math.max(1, unitCountOf(shooterHp, shooterData.maxCount));
    const fireMs = shooterData.fireMs + unitDelayMs * count;

    const hitAt = time + fireMs;

    shooterActions.push({ kind: "fire", start: time, end: hitAt });

    for (let index = 0; index < count; index++) {
      for (const name of shooterData.fireSounds) {
        sounds.push({ at: time + index * unitDelayMs, name });
      }
    }

    targetActions.push({ kind: "impact", start: hitAt, end: hitAt + impactMs, hpFrom, hpTo });

    const hits = Math.max(1, unitCountOf(hpFrom, targetData.maxCount));

    for (let index = 0; index < hits; index++) {
      for (const name of shooterData.impactSounds) {
        sounds.push({ at: hitAt + 60 + index * unitDelayMs, name });
      }
    }

    const lost = unitCountOf(hpFrom, targetData.maxCount) - unitCountOf(hpTo, targetData.maxCount);

    const explosionSounds = {
      foot: "dying_fadeout.wav",
      land: "explosion+land.wav",
      air: "explosion+air.wav",
      copter: "explosion+copter.wav",
      sea: "explosion+water.wav",
    };

    for (let index = 0; index < lost; index++) {
      sounds.push({
        at: hitAt + hitToExplosionMs + index * unitDelayMs,
        name: explosionSounds[targetData.kind],
      });
    }

    lastEffectEnd = Math.max(
      lastEffectEnd,
      hitAt + impactMs,
      lost > 0 ? hitAt + hitToExplosionMs + lost * unitDelayMs + explosionMs : 0,
    );
    time = hitAt + hitToCounterMs;
  };

  exchange(
    attackerData,
    attacker,
    defenderData,
    defender,
    view.defender.hpBefore,
    view.defender.hpAfter,
    view.attacker.hpBefore,
  );

  // The attacker only lost HP if the defender survived and could fight back.
  if (view.attacker.hpAfter < view.attacker.hpBefore) {
    exchange(
      defenderData,
      defender,
      attackerData,
      attacker,
      view.attacker.hpBefore,
      view.attacker.hpAfter,
      view.defender.hpAfter,
    );
  }

  return { attacker, defender, sounds, end: lastEffectEnd + holdMs };
};

export const timings = { explosionMs, hitToExplosionMs, unitDelayMs, moveInMs };
