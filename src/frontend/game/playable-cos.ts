import { coSchema } from "shared/schemas/co";
import type { CO } from "shared/schemas/co";
import type { COTexts } from "i18n/guide-fr";
import { getCOProperties } from "shared/match-logic/co";
import type { COEffectPhrases } from "shared/match-logic/game-constants/cos/days-of-ruin";
import {
  daysOfRuinCOs,
  describeEffects,
  isDaysOfRuinCO,
} from "shared/match-logic/game-constants/cos/days-of-ruin";

/** The COs playable in the app, all with the AW2 rules that rooms are created with. */
export const playableCOs: CO[] = [...coSchema.options].sort((a, b) =>
  coDisplayName(a).localeCompare(coDisplayName(b)),
);

export function coDisplayName(co: CO) {
  return getCOProperties({ name: co, version: "AW2" }).displayName;
}

/** The translated rules of a CO. When there are none, the guide shows those of the engine. */
export function coTextsOf(
  co: CO,
  labels: { texts: Partial<Record<CO, COTexts>>; effects: COEffectPhrases },
): COTexts | undefined {
  if (!isDaysOfRuinCO(co)) {
    return labels.texts[co];
  }

  const { dayToDay, power, superPower } = daysOfRuinCOs[co];

  return {
    dayToDay: dayToDay.length > 0 ? describeEffects(dayToDay, labels.effects) : undefined,
    power: describeEffects(power.effects, labels.effects),
    superPower: describeEffects(superPower.effects, labels.effects),
  };
}
