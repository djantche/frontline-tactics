import { playSound } from "frontend/game/audio";
import { throwIfCantMoveIntoUnit } from "shared/match-logic/events/handlers/move";
import type { Position } from "shared/schemas/position";
import { isSamePosition } from "shared/schemas/position";
import { isUnitProducingProperty } from "../shared/schemas/tile";
import { displayEnemyRange } from "./displayEnemyRange";
import type { GameContext } from "./game-context";
import { buildUnitMenu } from "./in-game-menus/buildUnitMenu";
import subActionMenu from "./in-game-menus/subActionMenu";
import { createUnloadMenu } from "./in-game-menus/unloadSubactionMenu";
import { createTilesContainer } from "./interactiveTileFunctions";
import { renderAttackTiles } from "./renderAttackTiles";
import { getAccessibleNodes, showPath, updatePath } from "./show-pathing";
import { movingUnitName, walkAlongPath } from "./unit-animations";

/** Removes everything temporary (menus, paths, the walking unit) and clears the selection. */
export const resetScreen = (context: GameContext) => {
  const {
    mapContainer,
    unitContainer,
    interactiveContainer,
    currentUnitClickedRef,
    moveTilesRef,
    pathRef,
    hasWalkedRef,
    ui,
  } = context;

  ui.openMenu(null);
  ui.showForecast(null);
  interactiveContainer.getChildByName("preAttackBox")?.destroy();
  interactiveContainer.getChildByName("repairUnitsBox")?.destroy();
  interactiveContainer.getChildByName("launchMissileClickableBox")?.destroy();
  interactiveContainer.getChildByName("unloadUnitsBox")?.destroy();
  mapContainer.getChildByName("highlightedTiles")?.destroy();
  mapContainer.getChildByName("pathArrows")?.destroy();
  unitContainer.getChildByName(movingUnitName)?.destroy();

  const selectedPosition = currentUnitClickedRef.current?.data.position;

  if (selectedPosition !== undefined) {
    const original = unitContainer.getChildByName(
      `unit-${selectedPosition[0]}-${selectedPosition[1]}`,
    );

    if (original !== null) {
      original.visible = true;
    }
  }

  moveTilesRef.current = null;
  currentUnitClickedRef.current = null;
  pathRef.current = null;
  hasWalkedRef.current = false;
};

const walkToDestination = async (context: GameContext, destination: Position) => {
  const {
    app,
    match,
    player,
    mapContainer,
    unitContainer,
    interactiveContainer,
    currentUnitClickedRef,
    moveTilesRef,
    pathRef,
    hasWalkedRef,
    isWalkingRef,
    spriteSheets,
    ui,
  } = context;

  const unit = currentUnitClickedRef.current;

  if (unit === null || moveTilesRef.current === null) {
    return;
  }

  const origin = unit.data.position;

  // on a touch screen there was no hover to draw the path
  const path = updatePath(unit, moveTilesRef.current, pathRef.current ?? [origin], destination);
  pathRef.current = path;

  mapContainer.getChildByName("highlightedTiles")?.destroy();
  mapContainer.getChildByName("pathArrows")?.destroy();
  interactiveContainer.getChildByName("preAttackBox")?.destroy();
  moveTilesRef.current = null;

  if (path.length > 1) {
    const original = unitContainer.getChildByName(`unit-${origin[0]}-${origin[1]}`);

    if (original !== null) {
      original.visible = false;
    }

    isWalkingRef.current = true;
    await walkAlongPath({
      app,
      parent: unitContainer,
      spriteSheets,
      unitType: unit.data.type,
      army: unit.player.data.army,
      path: [...path],
    });
    isWalkingRef.current = false;
    hasWalkedRef.current = true;
  }

  // the player may have left the selection, or the scene was rebuilt during the walk
  if (currentUnitClickedRef.current === unit) {
    ui.openMenu(subActionMenu(context, match, player, destination, unit));
  }
};

export const handleClick = async (clickPosition: Position, context: GameContext) => {
  const {
    match,
    player,
    mapContainer,
    interactiveContainer,
    currentUnitClickedRef,
    moveTilesRef,
    unitRangeShowRef,
    isWalkingRef,
    ui,
  } = context;

  if (isWalkingRef.current) {
    return;
  }

  //Check if there is a unit in the tile/position clicked
  const unitClicked = match.getUnit(clickPosition);

  //Check what tile is in the tile/position clicked
  const tileClicked = match.getTile(clickPosition);

  const isHachiSuperActive =
    player.data.COPowerState === "super-co-power" && player.data.coId.name === "hachi";
  const canTileBuildUnits =
    (tileClicked.type === "city" && isHachiSuperActive) || isUnitProducingProperty(tileClicked);

  //CHECK TO SEE IF WE CLICKED FACILITY
  if (
    !unitClicked &&
    player.owns(tileClicked) &&
    canTileBuildUnits &&
    match.getCurrentTurnPlayer().data.id === player.data.id &&
    currentUnitClickedRef.current === null
  ) {
    resetScreen(context);
    playSound("switchmenu.wav");
    ui.openMenu(buildUnitMenu(context, clickPosition));
  }

  //there is an currentUnitClickedRef and move tiles (the blue squares)
  // meaning the user has already clicked on a unit
  // so now we can process those movements
  else if (currentUnitClickedRef.current && moveTilesRef.current) {
    const currentUnit = currentUnitClickedRef.current;
    const isOnAccessibleTile = [...moveTilesRef.current.keys()].some((pos) =>
      isSamePosition(clickPosition, pos),
    );

    if (!isOnAccessibleTile) {
      resetScreen(context);
      return;
    }

    let canUnitMoveIntoOther = false;

    if (unitClicked) {
      try {
        throwIfCantMoveIntoUnit(currentUnit, unitClicked);
        canUnitMoveIntoOther = true;
      } catch (_e) {}
    }

    const canMoveToTile =
      unitClicked === undefined || //empty tile
      isSamePosition(currentUnit.data.position, clickPosition) || //same position
      (unitClicked.player.data.slot === currentUnit.player.data.slot && canUnitMoveIntoOther); //join or load

    if (canMoveToTile) {
      await walkToDestination(context, clickPosition);
    } else {
      resetScreen(context);
    }
  }

  //DID WE CLICK ON A UNIT?
  else if (unitClicked) {
    resetScreen(context);

    //Do we own said unit and is it our turn?
    if (player.owns(unitClicked) && match.getCurrentTurnPlayer().data.id === player.data.id) {
      //if ready, create path move tiles...
      if (unitClicked.data.isReady) {
        currentUnitClickedRef.current = unitClicked;
        playSound("selectunit.wav");

        const passablePositions = getAccessibleNodes(match, unitClicked);
        const displayedPassableTiles = createTilesContainer(
          Array.from(passablePositions.keys()),
          "#43d9e4",
          999,
          "highlightedTiles",
        );

        moveTilesRef.current = passablePositions;
        mapContainer.addChild(displayedPassableTiles);
        interactiveContainer.addChild(renderAttackTiles(context));
      }
      //if not ready but it's a transport with units and the rules allow to always unload...
      else if (
        unitClicked.isTransport() &&
        unitClicked.data.loadedUnit !== null &&
        !player.getVersionProperties().unloadOnlyAfterMove
      ) {
        //Show subaction menu of transport to drop off units
        ui.openMenu(createUnloadMenu(context, clickPosition, unitClicked));
      }
    }

    //We clicked on a unit we do not own OR it's not our turn: display its range
    else {
      mapContainer.addChild(displayEnemyRange(match, unitClicked, unitRangeShowRef));
    }
  }
  //we did not clicked on a facility nor a unit nor a path/move tiles, so we will do nothing other than ensure the state has been resetted clean
  else {
    resetScreen(context);
  }
};

export const handleHover = (hoverPosition: Position, context: GameContext) => {
  const { mapContainer, currentUnitClickedRef, moveTilesRef, pathRef, spriteSheets } = context;

  const currentUnit = currentUnitClickedRef.current;
  const moveTiles = moveTilesRef.current;

  if (currentUnit === null || moveTiles === null) {
    return;
  }

  const hoveredMoveTile = [...moveTiles.keys()].some((key) => isSamePosition(hoverPosition, key));

  if (hoveredMoveTile) {
    const newPath = updatePath(
      currentUnit,
      moveTiles,
      pathRef.current ?? [currentUnit.data.position],
      hoverPosition,
    );
    pathRef.current = newPath;
    const arrows = showPath(spriteSheets, newPath);
    mapContainer.getChildByName("pathArrows")?.destroy();
    mapContainer.addChild(arrows);
  }
};
