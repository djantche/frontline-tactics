import { observable } from "@trpc/server/observable";
import { TRPCError } from "@trpc/server";
import { emit, subscribe } from "server/emitter/event-emitter";
import { prisma } from "server/prisma/prisma-client";
import {
  validateMainActionAndToEvent,
  validateSubActionAndToEvent,
} from "shared/match-logic/events/action-to-event";
import {
  applyMainEventToMatch,
  applySubEventToMatch,
} from "shared/match-logic/events/apply-event-to-match";
import { mainActionSchema } from "shared/schemas/action";
import { getFinalPositionSafe, isSamePosition } from "shared/schemas/position";
import type {
  Emittable,
  EmittableEvent,
  MainEventsWithoutSubEvents,
  MainEventWithSubEvents,
  SubEvent,
  MatchEndEvent,
} from "shared/types/events";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import { MatchWrapper } from "shared/wrappers/match";
import { UnitWrapper } from "shared/wrappers/unit";
import { mainEventToEmittables } from "../../shared/match-logic/events/event-to-emittable";
import { updateMoveVision } from "../../shared/match-logic/events/handlers/move";
import { fillDiscoveredUnitsAndProperties } from "../../shared/match-logic/events/vision-update";
import { matchBaseProcedure, playerInMatchBaseProcedure, router } from "../trpc/trpc-setup";

const attachSubEvent = (
  mainEventWithoutSubEvent: MainEventsWithoutSubEvents,
  subEvent: SubEvent,
): MainEventWithSubEvents => {
  if (mainEventWithoutSubEvent.type === "move") {
    return {
      ...mainEventWithoutSubEvent,
      subEvent,
    };
  }

  return mainEventWithoutSubEvent;
};

export const actionRouter = router({
  send: playerInMatchBaseProcedure
    .input(mainActionSchema)
    .mutation(async ({ input, ctx: { match: liveMatch } }) => {
      if (liveMatch.status !== "playing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The match has not started" });
      }

      // Validate and resolve the complete action on a detached state. Invalid subactions
      // and failed database writes must leave the live game untouched.
      const match = new MatchWrapper(
        liveMatch.id,
        liveMatch.leagueType,
        structuredClone(liveMatch.changeableTiles),
        liveMatch.rules,
        liveMatch.status,
        liveMatch.map.data,
        structuredClone(liveMatch.getAllPlayers().map((p) => p.data)),
        structuredClone(liveMatch.units.map((u) => u.data)),
        UnitWrapper,
        liveMatch.turn,
        liveMatch.name,
      );
      match.setWeather(liveMatch.getCurrentWeather(), liveMatch.weatherDaysLeft);
      match.playerToRemoveWeatherEffect =
        liveMatch.playerToRemoveWeatherEffect === null
          ? null
          : (match.getPlayerById(liveMatch.playerToRemoveWeatherEffect.data.id) ?? null);
      /* 1. Move action to event */
      const mainEventWithoutSubEvent = validateMainActionAndToEvent(match, input);

      // if there was a trap or join/load, the default subEvent is "wait" (check must be done before moving the unit)
      const isJoinOrLoad =
        mainEventWithoutSubEvent.type === "move" &&
        match.getUnit(getFinalPositionSafe(mainEventWithoutSubEvent.path)) !== undefined &&
        !isSamePosition(
          getFinalPositionSafe(mainEventWithoutSubEvent.path),
          mainEventWithoutSubEvent.path[0],
        );

      /* 2. Apply move event to match */
      applyMainEventToMatch(match, mainEventWithoutSubEvent);

      let emittableEvents: (EmittableEvent | undefined)[]; // undefined means that team doesn't receive the event

      // having this subEvent variable is shitty code but it's type-safe and good enough for now.
      let subEvent: SubEvent = { type: "wait" };

      if (mainEventWithoutSubEvent.type === "move" && input.type === "move") {
        // second condition is only needed for type-gating input event

        /* 3. Sub action to event */
        const mainEventWithSubEvent: MainEventWithSubEvents = {
          ...mainEventWithoutSubEvent,
          subEvent: {
            type: "wait",
          },
        };

        if (!mainEventWithoutSubEvent.trap && !isJoinOrLoad) {
          mainEventWithSubEvent.subEvent = validateSubActionAndToEvent(match, input);
        }

        /* 4. Sub event to emittable sub events (done inside, first)*/
        /* 5. Move event to emittable move events */
        emittableEvents = mainEventToEmittables(match, mainEventWithSubEvent);

        /* 6. Update move event vision */
        updateMoveVision(match, mainEventWithSubEvent);

        /* 7. Apply sub event to match and update sub event vision */
        applySubEventToMatch(match, mainEventWithSubEvent);
        subEvent = mainEventWithSubEvent.subEvent;
      } else {
        emittableEvents = mainEventToEmittables(match, mainEventWithoutSubEvent);
      }

      /* 8. Update move vision (and add new vision in general to emittable events) */
      fillDiscoveredUnitsAndProperties(match, emittableEvents);

      const storedEvent = attachSubEvent(mainEventWithoutSubEvent, subEvent);

      if (storedEvent.type === "delete" && storedEvent.eliminationReason !== undefined) {
        match.getCurrentTurnPlayer().data.status = "routed";
      }

      const aliveTeams = match.teams.filter((team) =>
        team.players.some((p) => p.data.status === "alive"),
      );
      const captureGoal =
        storedEvent.type === "move" &&
        storedEvent.subEvent.type === "ability" &&
        storedEvent.subEvent.eliminationReason === "property-goal-reached";
      const winningTeam = captureGoal ? match.getCurrentTurnPlayer().team : aliveTeams[0];
      const matchEndEvent: MatchEndEvent | null =
        aliveTeams.length <= 1 || captureGoal
          ? {
              type: "matchEnd",
              winningTeamPlayerIds: winningTeam?.players.map((p) => p.data.id) ?? null,
            }
          : null;
      await prisma.$transaction(async (tx) => {
        await tx.event.create({ data: { matchId: input.matchId, content: storedEvent } });

        if (matchEndEvent !== null) {
          await tx.event.create({ data: { matchId: input.matchId, content: matchEndEvent } });
          await tx.match.update({ where: { id: match.id }, data: { status: "finished" } });
        }
      });
      applyMainEventToMatch(liveMatch, storedEvent);

      if (storedEvent.type === "move") {
        applySubEventToMatch(liveMatch, storedEvent);
      }

      if (matchEndEvent !== null) {
        applyMainEventToMatch(liveMatch, matchEndEvent);
      }

      /* 9. Emit emittable events after saving and committing the live state. */
      // TODO @function either this function gets a list of emittables, or we iterate through them here.
      //  undefined means that team shouldn't receive the event
      //  emittableEvents[i] is from match.teams[i]. emittableEvents has one extra "no team"(spectator) at the end
      emittableEvents.forEach((emittableEvent: EmittableEvent | undefined) => {
        if (emittableEvent) {
          const team = match.teams.find((team) => team.index === emittableEvent.teamIndex);
          team?.players.forEach((player: PlayerInMatchWrapper) => {
            emit(player.data.id, { ...emittableEvent, matchId: match.id });
          });

          if (emittableEvent.teamIndex === -1) {
            emit("spectator", { ...emittableEvent, matchId: match.id });
          }
        }
      });

      if (matchEndEvent !== null) {
        for (const player of match.getAllPlayers()) {
          emit(player.data.id, {
            ...matchEndEvent,
            matchId: match.id,
            teamIndex: player.team.index,
          });
        }
      }
    }),
  onEvent: matchBaseProcedure.subscription(({ ctx: { match, currentPlayer } }) =>
    observable<Emittable>((emit) =>
      subscribe(
        match.id,
        match.getPlayerById(currentPlayer.id) === undefined ? "spectator" : currentPlayer.id,
        emit.next,
      ),
    ),
  ),
  // TODO create procedure for anonymous users to observe games
  // (they get their own special "-1" team or something)
});
