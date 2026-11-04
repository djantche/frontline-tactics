import type { MatchEndEvent } from "shared/types/events";
import type { MatchWrapper } from "shared/wrappers/match";

export function applyMatchEndEvent(match: MatchWrapper, event: MatchEndEvent) {
  match.status = "finished";

  for (const player of match.getAllPlayers()) {
    player.data.hasCurrentTurn = false;

    if (
      event.winningTeamPlayerIds !== null &&
      !event.winningTeamPlayerIds.includes(player.data.id)
    ) {
      player.data.status = "routed";
    }
  }
}
