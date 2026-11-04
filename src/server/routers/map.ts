import { TRPCError } from "@trpc/server";
import { prisma } from "server/prisma/prisma-client";
import { mapPlayerCount, validateMap } from "shared/map/validate-map";
import { mapSchema } from "shared/schemas/map";
import type { Tile, TileType } from "shared/schemas/tile";
import { z } from "zod";
import { playerBaseProcedure, publicBaseProcedure, router } from "../trpc/trpc-setup";

/**
 * This is the list of tile types that are shown
 * on the map list.
 */
const propertyTileTypes = [
  "city",
  "base",
  "airport",
  "commtower",
  "lab",
  "port",
] satisfies TileType[];

type PropertyStatsType = Record<(typeof propertyTileTypes)[number], number>;

const throwIfInvalid = (tiles: Tile[][]) => {
  const issues = validateMap(tiles);

  if (issues.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid map: ${issues.map(({ code }) => code).join(", ")}`,
    });
  }
};

/** Matches rebuild themselves from their map, so a map in use can never change. */
const getEditableMap = async (mapId: string, userId: string) => {
  const map = await prisma.wWMap.findUnique({
    where: { id: mapId },
    select: { authorId: true, _count: { select: { matches: true } } },
  });

  if (map === null) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Map ${mapId} not found` });
  }

  if (map.authorId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This map belongs to someone else" });
  }

  if (map._count.matches > 0) {
    throw new TRPCError({ code: "CONFLICT", message: "This map is used by a match" });
  }
};

export const mapRouter = router({
  getAll: publicBaseProcedure.query(async () => {
    // TODO pagination / filter / search
    const allMaps = await prisma.wWMap.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { name: true } },
        _count: { select: { matches: true } },
      },
    });

    return allMaps.map((map) => {
      const tiles = map.tiles as Tile[][];
      const tilesFlat = tiles.flat();

      return {
        id: map.id,
        name: map.name,
        tiles,
        authorId: map.authorId,
        authorName: map.author?.name ?? null,
        isUsedByMatch: map._count.matches > 0,
        numberOfPlayers: map.numberOfPlayers,
        // TODO which armies exactly?
        size: {
          width: tiles[0].length,
          height: tiles.length,
        },
        propertyStats: propertyTileTypes.reduce<PropertyStatsType>(
          (prev, cur) => ({
            ...prev,
            [cur]: tilesFlat.filter((tile) => tile.type === cur).length,
          }),
          {} as PropertyStatsType,
        ),
        created: map.createdAt,
      };
    });
  }),
  save: playerBaseProcedure.input(mapSchema).mutation(async ({ input, ctx }) => {
    throwIfInvalid(input.tiles);

    const { id } = await prisma.wWMap.create({
      data: {
        name: input.name,
        tiles: input.tiles,
        predeployedUnits: [],
        numberOfPlayers: mapPlayerCount,
        authorId: ctx.currentPlayer.userId,
      },
    });

    return { id };
  }),
  update: playerBaseProcedure
    .input(mapSchema.extend({ mapId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      throwIfInvalid(input.tiles);
      await getEditableMap(input.mapId, ctx.currentPlayer.userId);

      await prisma.wWMap.update({
        where: { id: input.mapId },
        data: {
          name: input.name,
          tiles: input.tiles,
        },
      });
    }),
  delete: playerBaseProcedure
    .input(z.object({ mapId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await getEditableMap(input.mapId, ctx.currentPlayer.userId);
      await prisma.wWMap.delete({ where: { id: input.mapId } });
    }),
});
