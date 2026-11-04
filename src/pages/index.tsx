import { useAuthDialog } from "frontend/components/auth/useAuthDialog";
import { CreateRoomDialog } from "frontend/components/rooms/CreateRoomDialog";
import { RoomCard } from "frontend/components/rooms/RoomCard";
import { usePlayers } from "frontend/context/players";
import { Button } from "frontend/ui/Button";
import { EmptyState } from "frontend/ui/EmptyState";
import { Page, PageHeader } from "frontend/ui/Page";
import { Skeleton } from "frontend/ui/Skeleton";
import { Tabs } from "frontend/ui/Tabs";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { Plus, Swords } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import type { Tile } from "shared/schemas/tile";
import type { FrontendMatch } from "shared/types/component-data";

const refreshIntervalMs = 3000;

type RoomGridProps = {
  matches: FrontendMatch[] | undefined;
  tilesByMapId: Map<string, Tile[][]>;
  emptyTitle: string;
  emptyText: string;
  emptyAction?: React.ReactNode;
};

function RoomGrid({ matches, tilesByMapId, emptyTitle, emptyText, emptyAction }: RoomGridProps) {
  if (matches === undefined) {
    return (
      <div className="@grid @gap-4 smallscreen:@grid-cols-2 laptop:@grid-cols-3">
        <Skeleton className="@h-80" />
        <Skeleton className="@h-80" />
        <Skeleton className="@h-80" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="@h-8 @w-8" aria-hidden />}
        title={emptyTitle}
        text={emptyText}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="@grid @gap-4 smallscreen:@grid-cols-2 laptop:@grid-cols-3 desktop:@grid-cols-4">
      {matches.map((match) => (
        <RoomCard key={match.id} match={match} tiles={tilesByMapId.get(match.map.id)} />
      ))}
    </div>
  );
}

export default function RoomsPage() {
  const t = useT();
  const { status } = useSession();
  const { open: openAuthDialog } = useAuthDialog();
  const { currentPlayer } = usePlayers();
  const [isCreating, setIsCreating] = useState(false);

  const { data: maps } = trpc.map.getAll.useQuery();
  const { data: allMatches, isError } = trpc.match.getAll.useQuery(
    { pageNumber: 0 },
    { refetchInterval: refreshIntervalMs },
  );
  const { data: myMatches } = trpc.match.getPlayerMatches.useQuery(
    { playerId: currentPlayer?.id ?? "" },
    { enabled: currentPlayer !== undefined, refetchInterval: refreshIntervalMs },
  );

  const tilesByMapId = useMemo(() => new Map(maps?.map((map) => [map.id, map.tiles])), [maps]);

  const isMine = (match: FrontendMatch) =>
    match.players.some((player) => player.id === currentPlayer?.id);

  const openRooms = allMatches?.filter(
    (match) =>
      match.state === "setup" && match.players.length < match.map.numberOfPlayers && !isMine(match),
  );
  const liveGames = allMatches?.filter((match) => match.state === "playing" && !isMine(match));
  const ongoingGames = myMatches?.filter((match) => match.state !== "finished");
  const finishedGames = myMatches?.filter((match) => match.state === "finished");

  const onCreate = () => {
    if (status === "authenticated") {
      setIsCreating(true);
    } else {
      openAuthDialog();
    }
  };

  const createButton = (
    <Button icon={<Plus className="@h-4 @w-4" aria-hidden />} onClick={onCreate}>
      {t.rooms.create}
    </Button>
  );

  const openTab = {
    key: "open",
    label: t.rooms.tabOpen,
    count: openRooms?.length,
    content: (
      <RoomGrid
        matches={openRooms}
        tilesByMapId={tilesByMapId}
        emptyTitle={t.rooms.emptyOpenTitle}
        emptyText={t.rooms.emptyOpenText}
        emptyAction={createButton}
      />
    ),
  };

  const mineTab = {
    key: "mine",
    label: t.rooms.tabMine,
    count: ongoingGames?.length,
    content: (
      <RoomGrid
        matches={ongoingGames}
        tilesByMapId={tilesByMapId}
        emptyTitle={t.rooms.emptyMineTitle}
        emptyText={t.rooms.emptyMineText}
        emptyAction={createButton}
      />
    ),
  };

  const liveTab = {
    key: "live",
    label: t.rooms.tabLive,
    count: liveGames?.length,
    content: (
      <RoomGrid
        matches={liveGames}
        tilesByMapId={tilesByMapId}
        emptyTitle={t.rooms.emptyLiveTitle}
        emptyText={t.rooms.emptyLiveText}
      />
    ),
  };

  const finishedTab = {
    key: "finished",
    label: t.rooms.tabFinished,
    count: finishedGames?.length,
    content: (
      <RoomGrid
        matches={finishedGames}
        tilesByMapId={tilesByMapId}
        emptyTitle={t.rooms.emptyFinishedTitle}
        emptyText={t.rooms.emptyFinishedText}
      />
    ),
  };

  return (
    <Page title={t.rooms.title} wide>
      {status === "unauthenticated" && (
        <section className="@mb-8 @border @border-line @bg-surface @px-6 @py-10">
          <p className="@text-sm @font-semibold @uppercase @tracking-widest @text-accent">
            {t.home.eyebrow}
          </p>
          <h1 className="@mt-2 @text-6xl @leading-none">{t.home.title}</h1>
          <p className="@mt-3 @max-w-xl @text-fg-muted">{t.home.subtitle}</p>
          <Button size="lg" className="@mt-5" onClick={() => openAuthDialog()}>
            {t.home.play}
          </Button>
        </section>
      )}

      <PageHeader title={t.rooms.title} description={t.rooms.description} actions={createButton} />

      {isError ? (
        <EmptyState title={t.rooms.loadFailed} />
      ) : (
        <Tabs
          items={
            status === "authenticated"
              ? [openTab, mineTab, liveTab, finishedTab]
              : [openTab, liveTab]
          }
        />
      )}

      <CreateRoomDialog open={isCreating} onClose={() => setIsCreating(false)} />
    </Page>
  );
}
