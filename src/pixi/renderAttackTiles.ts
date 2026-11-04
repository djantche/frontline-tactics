import { Container } from "pixi.js";
import type { Position } from "../shared/schemas/position";
import type { GameContext } from "./game-context";
import { getBattleForecast } from "./interactiveTileFunctions";
import { getAttackTargetTiles } from "./show-pathing";
import { tileConstructor } from "./sprite-constructor";

export function renderAttackTiles(context: GameContext, attackingPosition?: Position) {
  const {
    interactiveContainer,
    match,
    currentUnitClickedRef,
    pathRef,
    mapContainer,
    sendAction,
    ui,
  } = context;

  interactiveContainer.getChildByName("preAttackBox")?.destroy();

  const attackTileContainer = new Container();
  attackTileContainer.name = "preAttackBox";

  if (currentUnitClickedRef.current === null) {
    return attackTileContainer;
  }

  const attackTiles = getAttackTargetTiles(match, currentUnitClickedRef.current, attackingPosition);

  attackTiles.forEach((pos) => {
    const attackTile = tileConstructor(pos, "#be1919");
    attackTile.eventMode = "static";

    attackTile.on("pointerenter", () => {
      const attacker = currentUnitClickedRef.current;

      if (attacker === null) {
        return;
      }

      const defender = match.getUnit(pos);
      const attackingPos =
        pathRef.current !== null
          ? pathRef.current[pathRef.current.length - 1]
          : attacker.data.position;

      ui.showForecast({
        ...getBattleForecast(match, attacker, attackingPos, pos),
        position: pos,
        attackerType: attacker.data.type,
        attackerArmy: attacker.player.data.army,
        defenderType: defender?.data.type,
        defenderArmy: defender?.player.data.army,
      });

      if (attacker.isIndirect()) {
        pathRef.current = null;
        mapContainer.getChildByName("pathArrows")?.destroy();
      }
    });

    attackTile.on("pointerleave", () => {
      ui.showForecast(null);
    });

    attackTile.on("pointerdown", () => {
      if (currentUnitClickedRef.current !== null) {
        //unit will not move if path is null (= not moving) or if it's indirect
        const path =
          pathRef.current && !currentUnitClickedRef.current.isIndirect()
            ? pathRef.current
            : [currentUnitClickedRef.current.data.position];

        ui.showForecast(null);
        void sendAction({
          type: "move",
          subAction: {
            type: "attack",
            defenderPosition: pos,
          },
          path: path,
        });

        //The currentUnitClicked has changed (moved, attacked, died), therefore, we delete the previous information as it is not accurate anymore
        //this also helps so when the screen resets, we dont have two copies of a unit
        currentUnitClickedRef.current = null;
      }
    });

    attackTileContainer.addChild(attackTile);
  });

  attackTileContainer.zIndex = 999;
  return attackTileContainer;
}
