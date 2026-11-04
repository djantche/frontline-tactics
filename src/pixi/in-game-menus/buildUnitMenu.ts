import { unitPropertiesMap } from "shared/match-logic/game-constants/unit-properties";
import type { Position } from "shared/schemas/position";
import { unitTypes } from "shared/schemas/unit";
import type { GameContext, GameMenu } from "../game-context";

//only called if player has current turn
export const buildUnitMenu = (
  { match, player, sendAction, ui }: GameContext,
  [x, y]: Position,
): GameMenu => {
  const allowedUnits = unitTypes.filter((t) => !match.rules.bannedUnitTypes.includes(t));

  const facility = match.getTile([x, y]).type;

  // Filter allowed units based on facility type and then sort by cost
  const buildableUnitTypes = allowedUnits
    .filter((type) => unitPropertiesMap[type].facility === facility)
    .sort((a, b) => unitPropertiesMap[a].cost - unitPropertiesMap[b].cost);

  return {
    kind: "build",
    position: [x, y],
    items: buildableUnitTypes.map((type) => {
      const unitCost =
        player.getHook("buildCost")?.(unitPropertiesMap[type].cost, player.match) ??
        unitPropertiesMap[type].cost;

      return {
        id: type,
        kind: "unit",
        unitType: type,
        army: player.data.army,
        value: unitCost,
        valueKind: "cost",
        disabled: player.data.funds < unitCost,
        onSelect: () => {
          ui.openMenu(null);
          void sendAction({
            type: "build",
            position: [x, y],
            unitType: type,
          });
        },
      };
    }),
  };
};
