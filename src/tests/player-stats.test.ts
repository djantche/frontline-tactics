import assert from "node:assert/strict";
import test from "node:test";
import type { FinishedMatch } from "server/tools/player-stats";
import { computePlayerStats, matchHistoryOf } from "server/tools/player-stats";

const player = (id: string, co: "andy" | "sami" = "andy") => ({
  id,
  name: id.toUpperCase(),
  coId: { name: co, version: "AW2" as const },
});

const match = (id: string, players: FinishedMatch["players"], winnerIds: string[] | null) => ({
  id,
  name: null,
  mapName: "Map",
  players,
  winnerIds,
});

void test("stats count wins, losses, draws and sort the best players first", () => {
  const stats = computePlayerStats([
    match("1", [player("a"), player("b")], ["a"]),
    match("2", [player("a"), player("b", "sami")], ["b"]),
    match("3", [player("a"), player("c")], ["a"]),
    match("4", [player("b", "sami"), player("c")], null),
  ]);

  assert.deepEqual(
    stats.map(({ id, wins, losses, draws, games, winRate }) => ({
      id,
      wins,
      losses,
      draws,
      games,
      winRate,
    })),
    [
      { id: "a", wins: 2, losses: 1, draws: 0, games: 3, winRate: 67 },
      { id: "b", wins: 1, losses: 1, draws: 1, games: 3, winRate: 33 },
      { id: "c", wins: 0, losses: 1, draws: 1, games: 2, winRate: 0 },
    ],
  );

  assert.deepEqual(stats[1].cos, [
    { co: "sami", games: 2 },
    { co: "andy", games: 1 },
  ]);
});

void test("no finished matches give an empty leaderboard", () => {
  assert.deepEqual(computePlayerStats([]), []);
});

void test("the history only lists the player's matches, with opponents and results", () => {
  const history = matchHistoryOf(
    [match("1", [player("a"), player("b")], ["b"]), match("2", [player("b"), player("c")], ["c"])],
    "a",
  );

  assert.deepEqual(history, [
    { id: "1", name: null, mapName: "Map", result: "loss", opponents: ["B"], co: "andy" },
  ]);
});
