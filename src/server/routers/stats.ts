import { TRPCError } from "@trpc/server";
import { prisma } from "server/prisma/prisma-client";
import type { FinishedMatch } from "server/tools/player-stats";
import { computePlayerStats, matchHistoryOf } from "server/tools/player-stats";
import { z } from "zod";
import { publicBaseProcedure, router } from "../trpc/trpc-setup";

const recentMatchesCount = 20;

const loadFinishedMatches = async (): Promise<FinishedMatch[]> => {
  const matches = await prisma.match.findMany({
    where: { status: "finished" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      playerState: true,
      map: { select: { name: true } },
      Event: {
        where: { content: { path: ["type"], equals: "matchEnd" } },
        select: { content: true },
      },
    },
  });

  return matches.map((match) => {
    const endEvent = match.Event[0]?.content;

    return {
      id: match.id,
      name: match.name,
      mapName: match.map.name,
      players: match.playerState,
      winnerIds: endEvent?.type === "matchEnd" ? endEvent.winningTeamPlayerIds : null,
    };
  });
};

export const statsRouter = router({
  leaderboard: publicBaseProcedure.query(async () =>
    computePlayerStats(await loadFinishedMatches()),
  ),
  player: publicBaseProcedure.input(z.object({ name: z.string() })).query(async ({ input }) => {
    const player = await prisma.player.findUnique({
      where: { name: input.name },
      select: { id: true, name: true, displayName: true },
    });

    if (player === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Player ${input.name} not found` });
    }

    const matches = await loadFinishedMatches();
    const leaderboard = computePlayerStats(matches);
    const position = leaderboard.findIndex(({ id }) => id === player.id);

    return {
      ...player,
      rank: position === -1 ? null : position + 1,
      stats: position === -1 ? null : leaderboard[position],
      history: matchHistoryOf(matches, player.id).slice(0, recentMatchesCount),
    };
  }),
});
