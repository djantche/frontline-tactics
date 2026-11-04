import type { Match, MatchStatus, GameMap } from "@prisma/client";
import type { PlayerInMatch } from "./server-match-state";

export type FrontendMatch = {
  id: Match["id"];
  name: Match["name"];
  map: MapBasic;
  players: PlayerInMatch[];
  state: MatchStatus;
  turn: number;
};

export type MapBasic = Pick<GameMap, "id" | "name" | "numberOfPlayers">;
