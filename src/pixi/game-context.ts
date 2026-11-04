import type { BattleView } from "frontend/game/battle-timeline";
import type { Application, Container } from "pixi.js";
import type { MutableRefObject } from "react";
import type { AvailableSubActions } from "shared/match-logic/events/available-sub-actions";
import type { MainAction } from "shared/schemas/action";
import type { Army } from "shared/schemas/army";
import type { Position } from "shared/schemas/position";
import type { UnitType } from "shared/schemas/unit";
import type { MatchWrapper } from "shared/wrappers/match";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import type { UnitWrapper } from "shared/wrappers/unit";
import type { BattleForecast } from "./interactiveTileFunctions";
import type { LoadedSpriteSheet } from "./load-spritesheet";
import type { PathNode } from "./show-pathing";

export type GameMenuItem =
  | {
      id: string;
      kind: "action";
      action: keyof typeof AvailableSubActions;
      onSelect: () => void;
    }
  | {
      id: string;
      kind: "unit";
      unitType: UnitType;
      army: Army;
      /** the cost in a build menu, the HP in an unload menu */
      value: number;
      valueKind: "cost" | "hp";
      disabled: boolean;
      onSelect: () => void;
    };

/** A menu shown by React on top of the map, next to a tile. */
export type GameMenu = {
  kind: "build" | "actions" | "unload";
  position: Position;
  items: GameMenuItem[];
};

export type ForecastView = BattleForecast & {
  position: Position;
  attackerType: UnitType;
  attackerArmy: Army;
  defenderType: UnitType | undefined;
  defenderArmy: Army | undefined;
};

/** What the game code asks of the React UI around the canvas. */
export type GameUI = {
  openMenu: (menu: GameMenu | null) => void;
  showForecast: (forecast: ForecastView | null) => void;
  playBattle: (battle: BattleView) => void;
};

export type GameContext = {
  app: Application;
  match: MatchWrapper;
  player: PlayerInMatchWrapper;
  mapContainer: Container;
  unitContainer: Container;
  interactiveContainer: Container;
  currentUnitClickedRef: MutableRefObject<UnitWrapper | null>;
  moveTilesRef: MutableRefObject<Map<Position, PathNode> | null>;
  unitRangeShowRef: MutableRefObject<"attack" | "movement" | "vision">;
  pathRef: MutableRefObject<Position[] | null>;
  /** The unit has already walked on screen, the next snapshot must not replay it. */
  hasWalkedRef: MutableRefObject<boolean>;
  /** Clicks are ignored while a unit is walking. */
  isWalkingRef: MutableRefObject<boolean>;
  spriteSheets: LoadedSpriteSheet;
  sendAction: (action: MainAction) => Promise<void>;
  ui: GameUI;
};
