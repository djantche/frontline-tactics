import type { Match } from "@prisma/client";

type MatchId = Match["id"];

/**
 * Read up on JavaScript event emitters.
 * The code here is a typesafe implementation of the same principal.
 * You can subscribe to events with a callback function
 * that will be called when those events occur.
 */
export const createEmitter = <WithMatchId extends { matchId: MatchId }>() => {
  type Listener = (dispatched: WithMatchId) => void;
  //New update
  const listenerMap = new Map<MatchId, Map<string, Listener[]>>();

  const unsubscribe = (matchId: MatchId, playerId: string, listenerToUnsub: Listener) => {
    const matchMap = listenerMap.get(matchId);
    const listeners = matchMap?.get(playerId)?.filter((listener) => listener !== listenerToUnsub);

    if (listeners !== undefined && listeners.length > 0) {
      matchMap?.set(playerId, listeners);
    } else {
      matchMap?.delete(playerId);
    }

    if (matchMap?.size === 0) {
      listenerMap.delete(matchId);
    }
  };

  return {
    subscribe(matchId: MatchId, playerID: string, listenerToSubscribe: Listener) {
      // Ensure the match exists in the outer map
      if (!listenerMap.has(matchId)) {
        listenerMap.set(matchId, new Map());
      }

      // Get the inner map for the match
      const matchMap = listenerMap.get(matchId)!;

      matchMap.set(playerID, [...(matchMap.get(playerID) ?? []), listenerToSubscribe]);

      return () => unsubscribe(matchId, playerID, listenerToSubscribe);
    },
    unsubscribe,

    emit(playerId: string, dispatched?: WithMatchId) {
      if (!dispatched) {
        return;
      }

      listenerMap
        .get(dispatched.matchId)
        ?.get(playerId)
        ?.forEach((listener) => listener(dispatched));
    },
  };
};
