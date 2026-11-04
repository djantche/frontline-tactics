import { Container } from "pixi.js";
import {
  AvailableSubActions,
  getAvailableSubActions,
} from "shared/match-logic/events/available-sub-actions";
import type { SubAction } from "shared/schemas/action";
import {
  addDirection,
  allDirections,
  isSamePosition,
  type Position,
} from "shared/schemas/position";
import type { UnitWrapper } from "shared/wrappers/unit";
import type { MatchWrapper } from "../../shared/wrappers/match";
import type { PlayerInMatchWrapper } from "../../shared/wrappers/player-in-match";
import type { GameContext, GameMenu } from "../game-context";
import { renderAttackTiles } from "../renderAttackTiles";
import { tileConstructor } from "../sprite-constructor";
import { createUnloadMenu } from "./unloadSubactionMenu";

const openRepairTiles = (
  { match, interactiveContainer, currentUnitClickedRef, pathRef, sendAction }: GameContext,
  unit: UnitWrapper,
  origin: Position,
) => {
  const repairTilesContainer = new Container();
  repairTilesContainer.name = "repairUnitsBox";

  for (const dir of allDirections) {
    if (match.map.isOutOfBounds(addDirection(origin, dir))) {
      continue;
    }

    const unitToRepair = match.getUnit(addDirection(origin, dir));

    if (unitToRepair && unitToRepair.player.data.slot === unit.player.data.slot) {
      const repairTile = tileConstructor(addDirection(origin, dir), "#43d9e4");
      repairTile.eventMode = "static";

      repairTile.on("pointerdown", () => {
        if (currentUnitClickedRef.current !== null) {
          const path = pathRef.current ?? [currentUnitClickedRef.current.data.position];

          void sendAction({
            type: "move",
            subAction: {
              type: "repair",
              direction: dir,
            },
            path: path,
          });

          currentUnitClickedRef.current = null;
          repairTilesContainer.destroy();
        }
      });

      repairTilesContainer.addChild(repairTile);
    }
  }

  repairTilesContainer.zIndex = 999;
  interactiveContainer.addChild(repairTilesContainer);
};

const openLaunchTiles = ({
  match,
  interactiveContainer,
  currentUnitClickedRef,
  pathRef,
  sendAction,
}: GameContext) => {
  const clickableLaunchTilesContainer = new Container();
  clickableLaunchTilesContainer.name = "launchMissileClickableBox";

  for (let x = 0; x < match.map.width; x++) {
    for (let y = 0; y < match.map.height; y++) {
      const hoverableTile = tileConstructor([x, y], "#000000", 0);
      hoverableTile.eventMode = "static";
      hoverableTile.on("pointerdown", () => {
        if (currentUnitClickedRef.current !== null) {
          const path = pathRef.current ?? [currentUnitClickedRef.current.data.position];

          void sendAction({
            type: "move",
            subAction: {
              type: "launchMissile",
              targetPosition: [x, y],
            },
            path: path,
          });

          currentUnitClickedRef.current = null;
        }
      });

      clickableLaunchTilesContainer.addChild(hoverableTile);
    }
  }

  clickableLaunchTilesContainer.zIndex = 999;
  interactiveContainer.addChild(clickableLaunchTilesContainer);
};

export default function subActionMenu(
  context: GameContext,
  match: MatchWrapper,
  player: PlayerInMatchWrapper,
  newPosition: Position,
  unit: UnitWrapper,
): GameMenu {
  const { interactiveContainer, currentUnitClickedRef, pathRef, sendAction, ui } = context;

  const hasMoved =
    pathRef.current !== null &&
    !(
      pathRef.current.length === 0 ||
      (pathRef.current.length === 1 && isSamePosition(pathRef.current[0], newPosition))
    );

  const menuOptions = getAvailableSubActions(match, player, unit, newPosition, hasMoved);

  const onSelect = (name: AvailableSubActions, subAction: SubAction | undefined) => {
    ui.openMenu(null);

    switch (name) {
      case AvailableSubActions.Attack: {
        interactiveContainer.addChild(
          renderAttackTiles(
            context,
            //either last path position or asuumes unit didn't move
            pathRef.current ? pathRef.current[pathRef.current.length - 1] : unit.data.position,
          ),
        );
        break;
      }

      case AvailableSubActions.Repair: {
        openRepairTiles(context, unit, newPosition);
        break;
      }

      case AvailableSubActions.Launch: {
        openLaunchTiles(context);
        break;
      }

      case AvailableSubActions.Unload: {
        ui.openMenu(createUnloadMenu(context, newPosition, unit));
        break;
      }

      case AvailableSubActions.Delete: {
        void sendAction({
          type: "delete",
          position: newPosition,
        });

        currentUnitClickedRef.current = null;
        break;
      }

      default: {
        if (subAction === undefined) {
          throw new Error(
            "Received undefined subAction from menu option that doesn't require further interaction: " +
              name,
          );
        }

        void sendAction({
          type: "move",
          subAction: subAction,
          path: pathRef.current ?? [newPosition],
        });

        //The currentUnitClicked has changed (moved, attacked, died), therefore, we delete the previous information as it is not accurate anymore
        //this also helps so when the screen resets, we dont have two copies of a unit
        currentUnitClickedRef.current = null;
        break;
      }
    }
  };

  return {
    kind: "actions",
    position: newPosition,
    items: [...menuOptions].map(([name, subAction]) => ({
      id: String(name),
      kind: "action",
      action: AvailableSubActions[name] as keyof typeof AvailableSubActions,
      onSelect: () => onSelect(name, subAction),
    })),
  };
}
