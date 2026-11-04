import { Container } from "pixi.js";
import { getUnloadablePositions } from "shared/match-logic/events/handlers/unload/checkUnloadTiles";
import { getDirection, isSamePosition, type Position } from "shared/schemas/position";
import type { UnitType } from "shared/schemas/unit";
import type { UnitWrapper } from "shared/wrappers/unit";
import type { GameContext, GameMenu } from "../game-context";
import { tileConstructor } from "../sprite-constructor";

type LoadedUnitChoice = {
  isFirstUnit: boolean;
  unitType: UnitType;
  hp: number;
  positions: Position[];
};

export const createUnloadMenu = (
  context: GameContext,
  newPosition: Position,
  unit: UnitWrapper,
  /**
   * Function can be called as 2nd unload. In this case, this variable will have the info of the first unload
   */
  firstUnloadInfo?: { unloadedPosition: Position; isFirstUnit: boolean },
): GameMenu => {
  const { player, interactiveContainer, currentUnitClickedRef, pathRef, sendAction, ui } = context;

  if (!unit.isTransport() || unit.data.loadedUnit === null) {
    throw new Error("Asked to create unlaod menu for unit without loaded units");
  }

  const withoutFirstUnload = (positions: Position[]) =>
    firstUnloadInfo === undefined
      ? positions
      : positions.filter((pos) => !isSamePosition(pos, firstUnloadInfo.unloadedPosition));

  const choices: LoadedUnitChoice[] = [];

  if (firstUnloadInfo === undefined || !firstUnloadInfo.isFirstUnit) {
    choices.push({
      isFirstUnit: true,
      unitType: unit.data.loadedUnit.type,
      hp: Math.ceil(unit.data.loadedUnit.stats.hp / 10),
      positions: withoutFirstUnload(
        getUnloadablePositions(unit, unit.data.loadedUnit, newPosition),
      ),
    });
  }

  if (
    "loadedUnit2" in unit.data &&
    unit.data.loadedUnit2 !== null &&
    (firstUnloadInfo === undefined || firstUnloadInfo.isFirstUnit)
  ) {
    choices.push({
      isFirstUnit: false,
      unitType: unit.data.loadedUnit2.type,
      hp: Math.ceil(unit.data.loadedUnit2.stats.hp / 10), //visual hp
      positions: withoutFirstUnload(
        getUnloadablePositions(unit, unit.data.loadedUnit2, newPosition),
      ),
    });
  }

  const clickedUnloadPosition = (
    unloadPos: Position,
    isFirstUnit: boolean,
    canOtherUnitBeUnloaded: boolean,
  ) => {
    if (canOtherUnitBeUnloaded) {
      //there were no other options (or the only unloadable position for the other unit was this one), commit the unload action
      if (currentUnitClickedRef.current !== null) {
        const path = pathRef.current ?? [currentUnitClickedRef.current.data.position];

        const unloads = [
          { isSecondUnit: !isFirstUnit, direction: getDirection(newPosition, unloadPos) },
        ];

        if (firstUnloadInfo !== undefined) {
          unloads.push({
            isSecondUnit: !firstUnloadInfo.isFirstUnit,
            direction: getDirection(newPosition, firstUnloadInfo.unloadedPosition),
          });
        }

        void sendAction({
          type: "move",
          subAction: {
            type: "unloadWait",
            unloads: unloads,
          },
          path: path,
        });

        currentUnitClickedRef.current = null;
      }

      return;
    }

    ui.openMenu({
      kind: "actions",
      position: newPosition,
      items: [
        {
          id: "unload",
          kind: "action",
          action: "Unload",
          onSelect: () => {
            ui.openMenu(
              createUnloadMenu(context, newPosition, unit, {
                unloadedPosition: unloadPos,
                isFirstUnit,
              }),
            );
          },
        },
        {
          id: "wait",
          kind: "action",
          action: "Wait",
          onSelect: () => {
            ui.openMenu(null);
            void sendAction({
              type: "move",
              subAction: {
                type: "unloadWait",
                unloads: [
                  { isSecondUnit: !isFirstUnit, direction: getDirection(newPosition, unloadPos) },
                ],
              },
              path: pathRef.current ?? [newPosition],
            });

            currentUnitClickedRef.current = null;
          },
        },
      ],
    });
  };

  const openUnloadTiles = (choice: LoadedUnitChoice) => {
    const unloadTilesContainer = new Container();
    unloadTilesContainer.name = "unloadUnitsBox";

    for (const unloadPos of choice.positions) {
      const unloadTile = tileConstructor(unloadPos, "#43d9e4");
      unloadTile.eventMode = "static";

      unloadTile.on("pointerdown", () => {
        const otherChoice = choices.find((other) => other !== choice);
        const canOtherUnitBeUnloaded =
          player.getVersionProperties().unloadOnlyAfterMove &&
          (otherChoice === undefined ||
            otherChoice.positions.every((pos) => isSamePosition(pos, unloadPos)));

        clickedUnloadPosition(unloadPos, choice.isFirstUnit, canOtherUnitBeUnloaded);
        unloadTilesContainer.destroy();
      });

      unloadTilesContainer.addChild(unloadTile);
    }

    unloadTilesContainer.zIndex = 999;
    interactiveContainer.addChild(unloadTilesContainer);
  };

  return {
    kind: "unload",
    position: newPosition,
    items: choices.map((choice) => ({
      id: choice.isFirstUnit ? "first" : "second",
      kind: "unit",
      unitType: choice.unitType,
      army: player.data.army,
      value: choice.hp,
      valueKind: "hp",
      disabled: choice.positions.length === 0,
      onSelect: () => {
        ui.openMenu(null);
        openUnloadTiles(choice);
      },
    })),
  };
};
