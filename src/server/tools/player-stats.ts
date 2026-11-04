import type { CO } from "shared/schemas/co";
import type { PlayerInMatch } from "shared/types/server-match-state";

export type FinishedMatch = {
  id: string;
  name: string | null;
  mapName: string;
  players: Pick<PlayerInMatch, "id" | "name" | "coId">[];
  /** null is a draw */
  winnerIds: string[] | null;
};

export type MatchResult = "win" | "loss" | "draw";

export type PlayerStats = {
  id: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  /** from 0 to 100 */
  winRate: number;
  /** the most played COs first */
  cos: { co: CO; games: number }[];
};

const resultOf = (match: FinishedMatch, playerId: string): MatchResult => {
  if (match.winnerIds === null) {
    return "draw";
  }

  return match.winnerIds.includes(playerId) ? "win" : "loss";
};

/** The stats of every player of these matches, best players first. */
export const computePlayerStats = (matches: FinishedMatch[]): PlayerStats[] => {
  const statsById = new Map<
    string,
    Omit<PlayerStats, "cos" | "winRate"> & { cos: Map<CO, number> }
  >();

  for (const match of matches) {
    for (const player of match.players) {
      const stats = statsById.get(player.id) ?? {
        id: player.id,
        name: player.name,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        cos: new Map<CO, number>(),
      };

      stats.games++;

      const result = resultOf(match, player.id);

      if (result === "win") {
        stats.wins++;
      } else if (result === "loss") {
        stats.losses++;
      } else {
        stats.draws++;
      }

      stats.cos.set(player.coId.name, (stats.cos.get(player.coId.name) ?? 0) + 1);
      statsById.set(player.id, stats);
    }
  }

  return [...statsById.values()]
    .map((stats) => ({
      ...stats,
      winRate: Math.round((stats.wins / stats.games) * 100),
      cos: [...stats.cos.entries()]
        .map(([co, games]) => ({ co, games }))
        .sort((a, b) => b.games - a.games),
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.games - b.games);
};

export const matchHistoryOf = (matches: FinishedMatch[], playerId: string) =>
  matches
    .filter((match) => match.players.some((player) => player.id === playerId))
    .map((match) => ({
      id: match.id,
      name: match.name,
      mapName: match.mapName,
      result: resultOf(match, playerId),
      opponents: match.players
        .filter((player) => player.id !== playerId)
        .map((player) => player.name),
      co: match.players.find((player) => player.id === playerId)?.coId.name,
    }));
