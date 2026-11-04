import { TRPCError } from "@trpc/server";
import { emit } from "server/emitter/event-emitter";
import { matchStore } from "server/match-store";
import { pageMatchIndex } from "server/page-match-index";
import { playerMatchIndex } from "server/player-match-index";
import { prisma } from "server/prisma/prisma-client";
import { DispatchableError } from "shared/DispatchedError";
import {
  applyMatchStartEvent,
  createMatchStartEvent,
} from "shared/match-logic/events/handlers/match-start";
import type { Army } from "shared/schemas/army";
import { armySchema } from "shared/schemas/army";
import { coIdSchema } from "shared/schemas/co";
import { playerSlotForUnitsSchema } from "shared/schemas/player-slot";
import { positionSchema } from "shared/schemas/position";
import { z } from "zod";
import type { NonStoredEvent } from "shared/types/events";
import type { MatchWrapper } from "shared/wrappers/match";
import type { PlayerInMatch } from "../../shared/types/server-match-state";
import {
  matchBaseProcedure,
  playerBaseProcedure,
  playerInMatchBaseProcedure,
  publicBaseProcedure,
  router,
} from "../trpc/trpc-setup";
import { createMatchProcedure } from "./match/create";
import { matchToFrontend, throwIfMatchNotInSetupState } from "./match/util";

const broadcastLobbyEvent = (match: MatchWrapper, event: NonStoredEvent) => {
  for (const player of match.getAllPlayers()) {
    emit(player.data.id, event);
  }
};

export const matchRouter = router({
  create: createMatchProcedure,

  getAll: publicBaseProcedure
    .input(z.object({ pageNumber: z.number().int().nonnegative() }))
    .query(({ input: { pageNumber } }) => {
      return pageMatchIndex.getPage(pageNumber).map(matchToFrontend);
    }),

  getPlayerMatches: playerBaseProcedure.query(
    ({ ctx: { currentPlayer } }) =>
      playerMatchIndex.getPlayerMatches(currentPlayer.id)?.map(matchToFrontend) ?? [],
  ),
  full: matchBaseProcedure.query(({ ctx: { match } }) => ({
    id: match.id,
    name: match.name,
    leagueType: match.leagueType,
    changeableTiles: match.changeableTiles,
    currentWeather: match.getCurrentWeather(),
    map: match.map.data,
    players: match.getAllPlayers().map((player) => player.data),
    rules: match.rules,
    status: match.status,
    turn: match.turn,
    units: match.units.map((u) => u.data),
    // match.getPlayerById(currentPlayer.id)?.team.getEnemyUnitsInVision() ?? []
  })),
  join: matchBaseProcedure
    .input(
      z.object({
        selectedCO: coIdSchema,
        playerSlot: z.number().int().nonnegative().nullable(),
      }),
    )
    .mutation(async ({ input, ctx: { currentPlayer, match } }) => {
      throwIfMatchNotInSetupState(match);

      if (match.getPlayerById(currentPlayer.id) !== undefined) {
        throw new Error("You've already joined this match!");
      }

      // Shouldn't the condition be '<=' not '<'?
      // If numberOfPlayers is 2, then valid playerSlots are 0 and 1.
      // input.playerSlot of 2 would bypass this if statement.
      if (input.playerSlot !== null && match.map.data.numberOfPlayers <= input.playerSlot) {
        throw new DispatchableError("Invalid player slot given");
      }

      if (input.playerSlot !== null && match.getPlayerBySlot(input.playerSlot) !== undefined) {
        throw new DispatchableError("Player slot is occupied");
      }

      //TODO check if selectedCO is allowed for tier/league/match-blacklist
      // (do players join a match with a CO pick already done or join then choose?)
      // this might not be necessary to do here but on switchCO

      // When there is not a specified slot to join, loop from 0 until an open slot is found
      let slotToJoin = 0;

      while (match.getPlayerBySlot(slotToJoin) !== undefined) {
        slotToJoin += 1;
      }

      // There should be code earlier in this flow that prevents this if statement from being true.
      if (match.map.data.numberOfPlayers <= slotToJoin) {
        throw new DispatchableError("Match is full");
      }

      const armiesOccupied = match.getAllPlayers().map((player) => player.data.army as string);
      const availableArmies = Object.keys(armySchema.Values).filter(
        (army) => !armiesOccupied.includes(army),
      );

      const playerData: PlayerInMatch = {
        id: currentPlayer.id,
        slot: input.playerSlot ?? slotToJoin,
        ready: false,
        coId: input.selectedCO,
        funds: 0,
        timesPowerUsed: 0,
        powerMeter: 0,
        status: "alive",
        hasCurrentTurn: false,
        army: availableArmies[0] as Army,
        COPowerState: "no-power",
        name: currentPlayer.name,
      };

      await prisma.match.update({
        where: { id: match.id },
        data: { playerState: [...match.getAllPlayers().map((p) => p.data), playerData] },
      });
      const player = match.addUnwrappedPlayer(playerData);
      playerMatchIndex.onPlayerJoin(player);
      broadcastLobbyEvent(match, {
        type: "player-joined",
        matchId: match.id,
        playerId: currentPlayer.id,
      });
    }),
  leave: playerInMatchBaseProcedure.mutation(async ({ ctx: { match, player } }) => {
    throwIfMatchNotInSetupState(match);

    const remainingPlayers = match.getAllPlayers().filter((p) => p.data.id !== player.data.id);

    if (remainingPlayers.length === 0) {
      await prisma.event.deleteMany({ where: { matchId: match.id } });
      await prisma.match.delete({ where: { id: match.id } });
    } else {
      await prisma.match.update({
        where: { id: match.id },
        data: { playerState: remainingPlayers.map((p) => p.data) },
      });
    }

    player.team.players = player.team.players.filter((p) => p.data.id !== player.data.id);
    match.teams = match.teams.filter((team) => team.players.length > 0);
    playerMatchIndex.onPlayerLeave(player);

    if (remainingPlayers.length === 0) {
      pageMatchIndex.removeMatch(match);
      matchStore.removeMatchFromIndex(match);
    } else {
      broadcastLobbyEvent(match, {
        matchId: match.id,
        type: "player-left",
        playerId: player.data.id,
      });
    }
  }),
  setReady: playerInMatchBaseProcedure
    .input(
      z.object({
        readyState: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx: { match, player } }) => {
      throwIfMatchNotInSetupState(match);

      const newPlayerState = match.getAllPlayers().map((p) => ({
        ...p.data,
        ready: p.data.id === player.data.id ? input.readyState : p.data.ready,
      }));
      const startsMatch =
        newPlayerState.length === match.map.data.numberOfPlayers &&
        newPlayerState.every((p) => p.ready);
      const matchStartEvent = startsMatch ? createMatchStartEvent(match) : null;

      await prisma.$transaction(async (tx) => {
        await tx.match.update({
          where: { id: match.id },
          data: { playerState: newPlayerState, status: startsMatch ? "playing" : "setup" },
        });

        if (matchStartEvent !== null) {
          await tx.event.create({ data: { content: matchStartEvent, matchId: match.id } });
        }
      });
      player.data.ready = input.readyState;

      if (matchStartEvent !== null) {
        applyMatchStartEvent(match, matchStartEvent);

        for (const participant of match.getAllPlayers()) {
          emit(participant.data.id, {
            ...matchStartEvent,
            matchId: match.id,
            teamIndex: participant.team.index,
          });
        }
      } else {
        broadcastLobbyEvent(match, {
          type: "player-changed-ready-status",
          matchId: match.id,
          playerId: player.data.id,
          ready: input.readyState,
        });
      }
    }),
  switchOptions: playerInMatchBaseProcedure
    .input(
      z.object({
        selectedCO: coIdSchema.optional(),
        selectedArmy: armySchema.optional(),
        selectedSlot: playerSlotForUnitsSchema.optional(),
      }),
    )
    .mutation(async ({ input, ctx: { match, player } }) => {
      throwIfMatchNotInSetupState(match);

      const newPlayerData: PlayerInMatch = { ...player.data };
      newPlayerData.coId = input.selectedCO ?? newPlayerData.coId;
      newPlayerData.army = input.selectedArmy ?? newPlayerData.army;
      newPlayerData.slot = input.selectedSlot ?? newPlayerData.slot;

      const armiesOccupied = match
        .getAllPlayers()
        .filter((p) => p.data.id !== player.data.id)
        .map((p) => p.data.army as string);
      const slotsOccupied = match
        .getAllPlayers()
        .filter((p) => p.data.id !== player.data.id)
        .map((p) => p.data.slot);

      // ERROR CHECKING
      // make sures that the ARMY picked by the player is different from all other players
      if (input.selectedArmy !== undefined && armiesOccupied.includes(input.selectedArmy)) {
        throw new DispatchableError("Army is already picked by another player");
      }

      // make sures that the SLOT picked by the player is different from all other players
      if (input.selectedSlot !== undefined && slotsOccupied.includes(input.selectedSlot)) {
        throw new DispatchableError("Slot is already picked by another player");
      }

      if (newPlayerData.slot >= match.map.data.numberOfPlayers) {
        throw new DispatchableError("Invalid player slot given");
      }

      newPlayerData.ready = false;

      // UPDATING STATE
      //lets create a playerState (what the db holds) to send it to the db.
      // playerState is basically a PlayerInMatchWrapper[] (well, at least the properties of it)
      const newPlayerState = match.teams.flatMap((team) =>
        team.players.map((teamPlayer) =>
          teamPlayer.data.id === player.data.id ? newPlayerData : teamPlayer.data,
        ),
      );

      //lets update prisma first, if the database updates, then we update memory
      await prisma.match.update({ where: { id: match.id }, data: { playerState: newPlayerState } });
      player.team.players = player.team.players.filter((p) => p.data.id !== player.data.id);
      match.teams = match.teams.filter((team) => team.players.length > 0);
      match.addUnwrappedPlayer(newPlayerData);
      broadcastLobbyEvent(match, {
        type: "player-changed-ready-status",
        matchId: match.id,
        playerId: player.data.id,
        ready: false,
      });

      if (input.selectedCO !== undefined) {
        broadcastLobbyEvent(match, {
          type: "player-picked-co",
          coId: input.selectedCO,
          matchId: match.id,
          playerId: player.data.id,
        });
      }

      if (input.selectedArmy !== undefined) {
        broadcastLobbyEvent(match, {
          type: "player-picked-army",
          army: input.selectedArmy,
          matchId: match.id,
          playerId: player.data.id,
        });
      }

      if (input.selectedSlot !== undefined) {
        broadcastLobbyEvent(match, {
          type: "player-picked-slot",
          slot: input.selectedSlot,
          matchId: match.id,
          playerId: player.data.id,
        });
      }
    }),
  adminUnwaitUnit: matchBaseProcedure
    .input(z.object({ position: positionSchema }))
    .mutation(({ input, ctx }) => {
      // TODO if ctx.user doesn't have the permissions to do this (e.g. isn't an admin)
      // then throw a tRPC error for unauthorized

      const unit = ctx.match.getUnitOrThrow(input.position);

      if (unit.data.isReady) {
        throw new TRPCError({
          message: "Unit is already ready (unwaited)",
          code: "BAD_REQUEST",
        });
      }

      unit.data.isReady = true;
    }),
});
