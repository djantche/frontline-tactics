import { useQuery } from "@tanstack/react-query";
import { FrontendUnit } from "frontend/components/match/FrontendUnit";
import type { SpritesheetDataByArmy } from "frontend/components/match/getSpritesheetData";
import type { ChangeableTileWithSprite } from "frontend/components/match/types";
import { ButtonLink } from "frontend/ui/Button";
import { EmptyState } from "frontend/ui/EmptyState";
import { Page } from "frontend/ui/Page";
import { Skeleton } from "frontend/ui/Skeleton";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { Trophy } from "lucide-react";
import { loadSpritesFromSpriteMap } from "pixi/load-spritesheet";
import { useMemo } from "react";
import { MatchWrapper } from "shared/wrappers/match";
import { MatchRenderer } from "./MatchRenderer";

type Props = {
  matchId: string;
  playerId: string;
  spritesheetDataByArmy: SpritesheetDataByArmy;
};

export function MatchLoader({ matchId, playerId, spritesheetDataByArmy }: Props) {
  const t = useT();
  const spriteSheetQuery = useQuery({
    queryKey: ["spritesheets"],
    queryFn: () => loadSpritesFromSpriteMap(spritesheetDataByArmy),
  });

  const utils = trpc.useUtils();
  const fullMatchQuery = trpc.match.full.useQuery(
    { matchId, playerId },
    {
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
    },
  );

  const refreshMatch = () => {
    void utils.match.full.invalidate({ matchId, playerId });
  };

  trpc.action.onEvent.useSubscription(
    { matchId, playerId },
    {
      onStarted: refreshMatch,
      onData: refreshMatch,
    },
  );

  // Rebuild from the authoritative snapshot, including remote builds, captures,
  // attacks and reconnects, rather than applying only a subset of game events.
  //
  // A refetch returns new objects even when nothing happened (react-query can't share
  // the Dates of the map), and every new wrapper rebuilds the whole Pixi application,
  // which would close open menus. So the content decides if this is a new snapshot.
  const snapshotKey = JSON.stringify(fullMatchQuery.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snapshot = useMemo(() => fullMatchQuery.data, [snapshotKey]);

  const match = useMemo(() => {
    const data = snapshot;

    if (data === undefined) {
      return undefined;
    }

    const wrapper = new MatchWrapper<ChangeableTileWithSprite, FrontendUnit>(
      data.id,
      data.leagueType,
      data.changeableTiles.map((tile) => ({ ...tile, sprite: null })),
      data.rules,
      data.status,
      data.map,
      structuredClone(data.players),
      structuredClone(data.units),
      FrontendUnit,
      data.turn,
      data.name,
    );

    if (data.status === "playing") {
      wrapper.setWeather(data.currentWeather, 1);
    }

    return wrapper;
  }, [snapshot]);

  const backToRooms = <ButtonLink href="/">{t.game.backToRooms}</ButtonLink>;

  if (fullMatchQuery.isError || spriteSheetQuery.isError) {
    return (
      <Page title={t.game.loadFailed}>
        <EmptyState
          title={t.game.loadFailed}
          text={fullMatchQuery.error?.message ?? spriteSheetQuery.error?.toString()}
          action={backToRooms}
        />
      </Page>
    );
  }

  if (match === undefined || spriteSheetQuery.data === undefined) {
    return (
      <Page title={t.game.loading}>
        <p className="@sr-only" role="status">
          {t.game.loading}
        </p>
        <Skeleton className="@h-96 @w-full" />
      </Page>
    );
  }

  const title = match.name ?? match.map.data.name;

  if (match.status === "setup") {
    return (
      <Page title={title}>
        <EmptyState
          title={t.game.notStarted}
          action={<ButtonLink href={`/rooms/${match.id}`}>{t.game.backToRoom}</ButtonLink>}
        />
      </Page>
    );
  }

  if (match.status === "finished") {
    const winners = match.getAllPlayers().filter((p) => p.data.status === "alive");

    return (
      <Page title={title}>
        <EmptyState
          icon={<Trophy className="@h-10 @w-10 @text-accent" aria-hidden />}
          title={t.game.finishedTitle}
          text={
            winners.length > 0
              ? t.game.winner(winners.map((p) => p.data.name).join(", "))
              : t.game.draw
          }
          action={backToRooms}
        />
      </Page>
    );
  }

  const player = match.getPlayerById(playerId);

  if (player === undefined) {
    return (
      <Page title={title}>
        <EmptyState title={t.game.notInMatch} action={backToRooms} />
      </Page>
    );
  }

  return <MatchRenderer match={match} spriteSheets={spriteSheetQuery.data} player={player} />;
}
