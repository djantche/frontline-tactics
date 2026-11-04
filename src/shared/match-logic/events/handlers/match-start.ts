import { getRandomWeather } from "shared/match-logic/weather";
import type { MatchStartEvent } from "shared/types/events";
import type { MatchWrapper } from "shared/wrappers/match";

export function createMatchStartEvent(match: MatchWrapper): MatchStartEvent {
  return {
    type: "matchStart",
    weather:
      match.rules.weatherSetting === "random"
        ? getRandomWeather(match)
        : match.rules.weatherSetting,
  };
}

export function applyMatchStartEvent(match: MatchWrapper, event: MatchStartEvent) {
  match.status = "playing";
  match.turn = 1;

  for (const player of match.getAllPlayers()) {
    player.data.hasCurrentTurn = player.data.slot === 0;
    player.data.funds = 0;
  }

  match.units = [];

  for (const unit of match.map.data.predeployedUnits) {
    match.getPlayerBySlot(unit.playerSlot)?.addUnwrappedUnit(structuredClone(unit));
  }

  match.setWeather(event.weather, 1);
  const firstPlayer = match.getCurrentTurnPlayer();
  firstPlayer.data.funds = firstPlayer.getFundsPerTurn();

  for (const unit of match.units) {
    unit.data.isReady = true;
  }
  for (const team of match.teams) {
    team.vision?.recalculateVision(team.getUnits());
  }
}
