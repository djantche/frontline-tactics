"use client";
import { playSound } from "frontend/game/audio";
import { battleBackgrounds } from "frontend/game/battle-backgrounds";
import type { BattleSideView } from "frontend/game/battle-timeline";
import type { ShaderKind } from "frontend/settings/game-settings";
import { readSettings } from "frontend/settings/game-settings";
import type { Container, DisplayObject } from "pixi.js";
import { Application } from "pixi.js";
import type { LoadedSpriteSheet } from "pixi/load-spritesheet";
import { applyShader } from "pixi/shaders";
import { setupScene } from "pixi/setupApp";
import { flashTile, walkAlongPath } from "pixi/unit-animations";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTerrainDefenseStars } from "shared/match-logic/game-constants/terrain-properties";
import type { MainAction } from "shared/schemas/action";
import type { Position } from "shared/schemas/position";
import { isSamePosition } from "shared/schemas/position";
import type { TileType } from "shared/schemas/tile";
import type { Emittable } from "shared/types/events";
import type { MatchWrapper } from "shared/wrappers/match";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import type { FrontendUnit } from "../../frontend/components/match/FrontendUnit";
import type { ChangeableTileWithSprite } from "../../frontend/components/match/types";
import type { GameContext, GameUI } from "../../pixi/game-context";
import { handleClick, handleHover, resetScreen } from "../../pixi/handleClick";
import type { PathNode } from "../../pixi/show-pathing";
import { trpcActions } from "../../pixi/trpcActions";
import type { UnitWrapper } from "../../shared/wrappers/unit";
import { baseTileSize } from "./MatchRenderer";

/** How long a received event may wait for the snapshot it belongs to. */
const eventMaxAgeMs = 4000;

const battleSide = (unit: UnitWrapper, tile: TileType, hpAfter: number): BattleSideView => ({
  unitType: unit.data.type,
  army: unit.player.data.army,
  co: unit.player.data.coId.name,
  hpBefore: unit.getHP(),
  hpAfter,
  terrain: battleBackgrounds[tile],
  // air units don't benefit from the terrain
  stars: unit.properties.movementType === "air" ? 0 : getTerrainDefenseStars(tile),
});

export type PendingEvent = { event: Emittable; receivedAt: number };

type Options = {
  match: MatchWrapper<ChangeableTileWithSprite, FrontendUnit>;
  spriteSheets: LoadedSpriteSheet;
  player: PlayerInMatchWrapper;
  tileSize: number;
  shader: ShaderKind;
  ui: GameUI;
  onTileHover: (position: Position | null) => void;
  /** The last event of the match, replayed on screen with the next snapshot. */
  pendingEventRef: MutableRefObject<PendingEvent | null>;
};

export const usePixi = ({
  match,
  spriteSheets,
  player,
  tileSize,
  shader,
  ui,
  onTileHover,
  pendingEventRef,
}: Options) => {
  //containers holding pixi elements
  const pixiContainerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const mapContainerRef = useRef<Container<DisplayObject> | null>(null);
  const contextRef = useRef<GameContext | null>(null);
  const previousMatchRef = useRef<typeof match | null>(null);

  // the unit we've clicked (the one that will be seeing sub action menu), we keep it here to reference it later on
  const currentUnitClickedRef = useRef<UnitWrapper | null>(null);

  // when user clicks an unit, we need a variable to determine if we show them unit's movement range, attack range or vision (for fog)
  const unitRangeShowRef = useRef<"attack" | "movement" | "vision">("movement");

  //TODO: To some extent, these three all store the same type of information (positions), however, they store it at different times...
  const moveTilesRef = useRef<Map<Position, PathNode> | null>(null);

  const pathRef = useRef<Position[] | null>(null);
  const hasWalkedRef = useRef(false);
  const isWalkingRef = useRef(false);

  // a refused action leaves the unit where it walked to, so the scene is drawn again
  const [sceneVersion, setSceneVersion] = useState(0);

  const { actionMutation } = trpcActions();

  const { mutateAsync: mutateAction, error: actionError } = actionMutation;

  const uiRef = useRef(ui);
  uiRef.current = ui;

  const onTileHoverRef = useRef(onTileHover);
  onTileHoverRef.current = onTileHover;

  const widthInTiles = match.map.width + 1;
  const heightInTiles = match.map.height + 1;

  useEffect(() => {
    // Every application gets its own canvas: destroying an application loses the
    // WebGL context of its canvas for good, so a canvas can't be used a second time.
    const app = new Application({
      autoDensity: true,
      // a fractional resolution puts tile edges between two pixels, which then
      // pick up their neighbours in the sprite sheet and show as lines on the map
      resolution: Math.max(1, Math.ceil(window.devicePixelRatio)),
      backgroundAlpha: 0,
      width: widthInTiles * baseTileSize,
      height: heightInTiles * baseTileSize,
    });

    const view = app.view as HTMLCanvasElement;
    view.className = "pixelated @block";
    pixiContainerRef.current?.appendChild(view);
    appRef.current = app;
    setSceneVersion((version) => version + 1);

    return () => {
      appRef.current = null;
      app.destroy(true, { children: true, texture: false, baseTexture: false });
    };
  }, [widthInTiles, heightInTiles]);

  useEffect(() => {
    const app = appRef.current;

    if (app === null) {
      return;
    }

    app.renderer.resize(widthInTiles * tileSize, heightInTiles * tileSize);
    app.stage.scale.set(tileSize / baseTileSize);
    applyShader(app, shader);
  }, [tileSize, shader, widthInTiles, heightInTiles, sceneVersion]);

  useEffect(() => {
    const app = appRef.current;

    if (app === null) {
      return;
    }

    const sendAction = async (action: MainAction) => {
      try {
        await mutateAction({
          playerId: player.data.id,
          matchId: match.id,
          ...action,
        });
      } catch {
        // the error is shown through actionError
        setSceneVersion((version) => version + 1);
      }
    };

    const onClick = async (pos: Position) => {
      if (contextRef.current !== null) {
        await handleClick(pos, contextRef.current);
      }
    };

    const onHover = (pos: Position) => {
      onTileHoverRef.current(pos);

      if (contextRef.current !== null) {
        handleHover(pos, contextRef.current);
      }
    };

    const hasWalked = hasWalkedRef.current;

    uiRef.current.openMenu(null);
    uiRef.current.showForecast(null);
    currentUnitClickedRef.current = null;
    moveTilesRef.current = null;
    pathRef.current = null;
    hasWalkedRef.current = false;
    isWalkingRef.current = false;

    const { mapContainer, unitContainer, interactiveContainer } = setupScene(
      app,
      match,
      spriteSheets,
      onClick,
      onHover,
    );
    mapContainerRef.current = mapContainer;
    mapContainer.eventMode = "static";

    contextRef.current = {
      app,
      match,
      player,
      mapContainer,
      unitContainer,
      interactiveContainer,
      currentUnitClickedRef,
      moveTilesRef,
      unitRangeShowRef,
      pathRef,
      hasWalkedRef,
      isWalkingRef,
      spriteSheets,
      sendAction,
      ui: {
        openMenu: (menu) => uiRef.current.openMenu(menu),
        showForecast: (forecast) => uiRef.current.showForecast(forecast),
        playBattle: (battle) => uiRef.current.playBattle(battle),
      },
    };

    const previousMatch = previousMatchRef.current;
    previousMatchRef.current = match;

    const pending = pendingEventRef.current;
    pendingEventRef.current = null;

    if (pending === null || Date.now() - pending.receivedAt > eventMaxAgeMs) {
      return;
    }

    const { event } = pending;

    if (event.type === "build") {
      playSound("moveOut.wav");
      flashTile(app, unitContainer, event.position, "#f58f45");
    }

    if (event.type === "coPower") {
      playSound(event.isSuper ? "superpower.wav" : "power.wav");
    }

    if (event.type !== "move") {
      return;
    }

    const start = event.path[0];
    const end = event.path[event.path.length - 1];
    const movedUnit = previousMatch?.getUnit(start) ?? match.getUnit(end);

    const afterWalk = () => {
      const { subEvent } = event;

      if (subEvent.type === "ability" && movedUnit !== undefined) {
        if (movedUnit.data.type === "infantry" || movedUnit.data.type === "mech") {
          playSound("capture.wav");
        }
      } else if (subEvent.type === "repair") {
        playSound("repair_1.wav");
      } else if (subEvent.type === "unloadWait") {
        playSound("unload.wav");
      } else if (subEvent.type === "attack") {
        const defenderPosition = subEvent.defender?.position;

        if (defenderPosition === undefined) {
          return;
        }

        flashTile(app, unitContainer, defenderPosition, "#ffffff");

        const defender = previousMatch?.getUnit(defenderPosition);

        // Only fights between units have a scene: pipe seams don't fight back.
        if (movedUnit !== undefined && defender !== undefined && readSettings().battleAnimations) {
          uiRef.current.playBattle({
            attacker: battleSide(
              movedUnit,
              match.getTile(end).type,
              subEvent.attacker?.HP ?? movedUnit.getHP(),
            ),
            defender: battleSide(
              defender,
              match.getTile(defenderPosition).type,
              subEvent.defender?.HP ?? 0,
            ),
          });
        }
      }
    };

    if (
      hasWalked ||
      movedUnit === undefined ||
      event.path.length < 2 ||
      isSamePosition(start, end)
    ) {
      afterWalk();
      return;
    }

    // The new scene already has the unit on the last tile: it's hidden during the walk.
    const finalSprite = unitContainer.getChildByName(`unit-${end[0]}-${end[1]}`);

    if (finalSprite !== null) {
      finalSprite.visible = false;
    }

    void walkAlongPath({
      app,
      parent: unitContainer,
      spriteSheets,
      unitType: movedUnit.data.type,
      army: movedUnit.player.data.army,
      path: event.path,
    }).then((walker) => {
      if (!walker.destroyed) {
        walker.destroy();

        if (finalSprite !== null) {
          finalSprite.visible = true;
        }

        afterWalk();
      }
    });
  }, [mutateAction, match, player, spriteSheets, sceneVersion, pendingEventRef]);

  const cancelSelection = useCallback(() => {
    if (contextRef.current !== null) {
      resetScreen(contextRef.current);
    }
  }, []);

  return {
    pixiContainerRef,
    actionError,
    cancelSelection,
  };
};
