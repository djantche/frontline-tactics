import { ProtectPage } from "frontend/components/auth/ProtectPage";
import { ArmyChip } from "frontend/components/rooms/ArmyChip";
import { usePlayers } from "frontend/context/players";
import { aw2COs, coDisplayName } from "frontend/game/aw2-cos";
import { Badge } from "frontend/ui/Badge";
import { Button, ButtonLink } from "frontend/ui/Button";
import { Card } from "frontend/ui/Card";
import { COPortrait } from "frontend/ui/COPortrait";
import { EmptyState } from "frontend/ui/EmptyState";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Page, PageHeader } from "frontend/ui/Page";
import { Select } from "frontend/ui/Select";
import { Skeleton } from "frontend/ui/Skeleton";
import { useToast } from "frontend/ui/Toast";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { ArrowLeft, Link2, LogOut, MapPinOff } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { armySchema } from "shared/schemas/army";
import type { Army } from "shared/schemas/army";
import type { CO } from "shared/schemas/co";
import type { PlayerInMatch } from "shared/types/server-match-state";

const refreshIntervalMs = 1500;

function Room({ matchId, playerId }: { matchId: string; playerId: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();
  const ids = { matchId, playerId };

  const { data: match, isError } = trpc.match.full.useQuery(ids, {
    refetchInterval: refreshIntervalMs,
    retry: false,
  });

  const refresh = () => void utils.match.invalidate();
  const onError = () => toast(t.room.actionFailed, "error");
  const mutationOptions = { onSuccess: refresh, onError };

  const switchOptions = trpc.match.switchOptions.useMutation(mutationOptions);
  const joinMatch = trpc.match.join.useMutation(mutationOptions);
  const readyMatch = trpc.match.setReady.useMutation(mutationOptions);
  const leaveMatch = trpc.match.leave.useMutation({
    onSuccess: () => {
      refresh();
      void router.push("/");
    },
    onError,
  });

  const pending =
    switchOptions.isLoading || joinMatch.isLoading || readyMatch.isLoading || leaveMatch.isLoading;

  const status = match?.status;

  useEffect(() => {
    if (status === "playing" || status === "finished") {
      void router.replace(`/game/${matchId}`);
    }
  }, [status, matchId, router]);

  const players = match?.players;

  const armies = useMemo(() => {
    const bySlot: Army[] = ["orange-star", "blue-moon"];
    players?.forEach((player) => {
      bySlot[player.slot] = player.army;
    });
    return bySlot;
  }, [players]);

  if (isError) {
    return (
      <EmptyState
        icon={<MapPinOff className="@h-8 @w-8" aria-hidden />}
        title={t.room.notFoundTitle}
        text={t.room.notFoundText}
        action={<ButtonLink href="/">{t.room.back}</ButtonLink>}
      />
    );
  }

  if (match === undefined || players === undefined) {
    return <Skeleton className="@h-96 @w-full" />;
  }

  const numberOfPlayers = match.map.numberOfPlayers;
  const slots = Array.from({ length: numberOfPlayers }, (_, slot) => slot);
  const me = players.find((player) => player.id === playerId);
  const isFull = players.length >= numberOfPlayers;

  const statusText = () => {
    if (me === undefined) {
      return isFull ? t.room.statusFull : t.room.statusCanJoin;
    }

    if (!isFull) {
      return t.room.statusWaitingOpponent;
    }

    return me.ready === true ? t.room.statusWaitingReady : t.room.statusChooseOptions;
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast(t.room.inviteCopied, "success");
  };

  const playerSlot = (slot: number, player: PlayerInMatch | undefined) => {
    if (player === undefined) {
      return (
        <Card key={slot} className="@flex @items-center @gap-3 @border-dashed @p-4">
          <COPortrait co={undefined} className="@h-14 @w-14 @opacity-40" />
          <div>
            <p className="@text-xs @font-semibold @uppercase @tracking-wide @text-fg-subtle">
              {t.room.player(slot + 1)}
            </p>
            <p className="@text-fg-muted">{t.room.emptySlot}</p>
          </div>
        </Card>
      );
    }

    const isMe = player.id === playerId;
    const takenArmies = players.filter((other) => other.id !== player.id).map(({ army }) => army);
    const takenSlots = players.filter((other) => other.id !== player.id).map((other) => other.slot);
    const freeSlots = slots.filter((option) => !takenSlots.includes(option));

    return (
      <Card key={slot} className={isMe ? "@border-line-strong @p-4" : "@p-4"}>
        <div className="@flex @items-center @gap-3">
          <COPortrait
            co={player.coId.name}
            alt={coDisplayName(player.coId.name)}
            className="@h-14 @w-14"
          />
          <div className="@min-w-0 @flex-1">
            <p className="@text-xs @font-semibold @uppercase @tracking-wide @text-fg-subtle">
              {t.room.player(slot + 1)}
              {isMe && ` · ${t.room.you}`}
            </p>
            <p className="@truncate @font-semibold">{player.name}</p>
            <p className="@flex @items-center @gap-1.5 @text-xs @text-fg-muted">
              <ArmyChip army={player.army} />
              {t.armies[player.army]} · {coDisplayName(player.coId.name)}
            </p>
          </div>
          <Badge tone={player.ready === true ? "success" : "neutral"} dot>
            {player.ready === true ? t.room.readyBadge : t.room.notReadyBadge}
          </Badge>
        </div>

        {isMe && (
          <div className="@mt-4 @grid @gap-3 tablet:@grid-cols-2">
            <Select<CO>
              label={t.room.co}
              value={player.coId.name}
              disabled={pending}
              onChange={(name) =>
                switchOptions.mutate({ ...ids, selectedCO: { name, version: "AW2" } })
              }
              options={aw2COs.map((co) => ({
                value: co,
                label: coDisplayName(co),
                icon: <COPortrait co={co} className="@h-5 @w-5" />,
              }))}
            />
            <Select<Army>
              label={t.room.army}
              value={player.army}
              disabled={pending}
              onChange={(selectedArmy) => switchOptions.mutate({ ...ids, selectedArmy })}
              options={armySchema.options
                .filter((army) => !takenArmies.includes(army))
                .map((army) => ({
                  value: army,
                  label: t.armies[army],
                  icon: <ArmyChip army={army} />,
                }))}
            />
            {freeSlots.length > 1 && (
              <Select
                label={t.room.position}
                value={String(player.slot)}
                disabled={pending}
                onChange={(selectedSlot) =>
                  switchOptions.mutate({ ...ids, selectedSlot: Number(selectedSlot) })
                }
                options={freeSlots.map((option) => ({
                  value: String(option),
                  label: t.room.positionOption(option + 1),
                }))}
              />
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div data-match-id={match.id}>
      <Head>
        <title>{`${match.name ?? match.map.name} | Frontline Tactics`}</title>
      </Head>
      <Link
        href="/"
        className="@mb-3 @inline-flex @items-center @gap-1.5 @text-sm @text-fg-muted hover:@text-fg"
      >
        <ArrowLeft className="@h-4 @w-4" aria-hidden />
        {t.room.back}
      </Link>
      <PageHeader
        title={match.name ?? match.map.name}
        description={statusText()}
        actions={
          <Button
            variant="secondary"
            icon={<Link2 className="@h-4 @w-4" aria-hidden />}
            onClick={() => void copyInvite()}
          >
            {t.room.invite}
          </Button>
        }
      />

      <div className="@grid @items-start @gap-6 laptop:@grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="@flex @flex-col @gap-3">
          {slots.map((slot) =>
            playerSlot(
              slot,
              players.find((player) => player.slot === slot),
            ),
          )}

          <div className="@flex @flex-wrap @gap-2">
            {me === undefined ? (
              <Button
                size="lg"
                className="@flex-1"
                disabled={isFull}
                loading={joinMatch.isLoading}
                onClick={() =>
                  joinMatch.mutate({
                    ...ids,
                    playerSlot: null,
                    selectedCO: { name: "sami", version: "AW2" },
                  })
                }
              >
                {t.room.join}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="@flex-1"
                  variant={me.ready === true ? "secondary" : "primary"}
                  loading={readyMatch.isLoading}
                  disabled={pending}
                  onClick={() => readyMatch.mutate({ ...ids, readyState: me.ready !== true })}
                >
                  {me.ready === true ? t.room.unready : t.room.ready}
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  icon={<LogOut className="@h-4 @w-4" aria-hidden />}
                  loading={leaveMatch.isLoading}
                  disabled={pending}
                  onClick={() => leaveMatch.mutate(ids)}
                >
                  {t.room.leave}
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <div className="@flex @max-h-[32rem] @items-center @justify-center @overflow-hidden @bg-canvas @p-3">
            <MapCanvas
              tiles={match.map.tiles}
              armies={armies}
              label={match.map.name}
              className="@max-h-[30rem] !@w-auto @max-w-full"
            />
          </div>
          <dl className="@grid @grid-cols-2 @gap-x-4 @gap-y-2 @border-t @border-line @p-4 @text-sm">
            <dt className="@text-fg-muted">{t.room.mapDetails}</dt>
            <dd className="@text-right @font-medium">{match.map.name}</dd>
            <dt className="@text-fg-muted">{t.room.funds}</dt>
            <dd className="@text-right @font-medium">{match.rules.fundsPerProperty}</dd>
            <dt className="@text-fg-muted">{t.room.unitCap}</dt>
            <dd className="@text-right @font-medium">{match.rules.unitCapPerPlayer}</dd>
          </dl>
        </Card>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const t = useT();
  const { query } = useRouter();
  const { currentPlayer } = usePlayers();

  return (
    <ProtectPage>
      <Page title={t.rooms.title}>
        {typeof query.id === "string" && currentPlayer !== undefined ? (
          <Room matchId={query.id} playerId={currentPlayer.id} />
        ) : (
          <Skeleton className="@h-96 @w-full" />
        )}
      </Page>
    </ProtectPage>
  );
}
