import { usePlayers } from "frontend/context/players";
import { Badge } from "frontend/ui/Badge";
import type { BadgeTone } from "frontend/ui/Badge";
import { ButtonLink } from "frontend/ui/Button";
import { Card } from "frontend/ui/Card";
import { COPortrait } from "frontend/ui/COPortrait";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Skeleton } from "frontend/ui/Skeleton";
import { useT } from "i18n";
import { useMemo } from "react";
import type { Army } from "shared/schemas/army";
import type { Tile } from "shared/schemas/tile";
import type { FrontendMatch } from "shared/types/component-data";
import { ArmyChip } from "./ArmyChip";

type Props = {
  match: FrontendMatch;
  tiles: Tile[][] | undefined;
};

export function RoomCard({ match, tiles }: Props) {
  const t = useT();
  const { currentPlayer } = usePlayers();

  const isMine = match.players.some((player) => player.id === currentPlayer?.id);
  const isFull = match.players.length >= match.map.numberOfPlayers;

  const armies = useMemo(() => {
    const bySlot: Army[] = ["orange-star", "blue-moon"];
    match.players.forEach((player) => {
      bySlot[player.slot] = player.army;
    });
    return bySlot;
  }, [match.players]);

  const states: Record<FrontendMatch["state"], { label: string; tone: BadgeTone }> = {
    setup: { label: t.rooms.stateSetup, tone: "success" },
    playing: { label: t.rooms.statePlaying, tone: "accent" },
    finished: { label: t.rooms.stateFinished, tone: "neutral" },
  };

  const action = () => {
    if (match.state === "setup") {
      return { href: `/rooms/${match.id}`, label: isMine || isFull ? t.rooms.open : t.rooms.join };
    }

    if (!isMine) {
      return undefined;
    }

    return {
      href: `/game/${match.id}`,
      label: match.state === "playing" ? t.rooms.resume : t.rooms.result,
    };
  };

  const { label: stateLabel, tone } = states[match.state];
  const link = action();

  return (
    <Card className="@flex @flex-col" data-match-id={match.id}>
      <div className="@flex @h-44 @items-center @justify-center @overflow-hidden @border-b @border-line @bg-canvas @p-2">
        {tiles === undefined ? (
          <Skeleton className="@h-full @w-full" />
        ) : (
          <MapCanvas tiles={tiles} armies={armies} className="!@h-full !@w-auto @max-w-full" />
        )}
      </div>
      <div className="@flex @flex-1 @flex-col @gap-3 @p-3">
        <div className="@flex @items-start @justify-between @gap-2">
          <div className="@min-w-0">
            <h3 className="@truncate @text-xl @leading-tight">{match.name ?? match.map.name}</h3>
            <p className="@truncate @text-xs @text-fg-muted">
              {match.map.name}
              {match.state === "playing" && ` · ${t.rooms.day(match.turn)}`}
            </p>
          </div>
          <Badge tone={tone} dot>
            {stateLabel}
          </Badge>
        </div>
        <ul className="@flex @flex-col @gap-1.5">
          {match.players.map((player) => (
            <li key={player.id} className="@flex @items-center @gap-2 @text-sm">
              <COPortrait co={player.coId.name} className="@h-6 @w-6" />
              <ArmyChip army={player.army} />
              <span className="@truncate">{player.name}</span>
            </li>
          ))}
          {!isFull && <li className="@text-sm @text-fg-subtle">{t.rooms.waitingOpponent}</li>}
        </ul>
        <div className="@mt-auto @flex @items-center @justify-between @gap-2">
          <span className="@text-xs @text-fg-muted">
            {t.rooms.players(match.players.length, match.map.numberOfPlayers)}
          </span>
          {link !== undefined && (
            <ButtonLink
              href={link.href}
              size="sm"
              variant={link.label === t.rooms.join || isMine ? "primary" : "secondary"}
            >
              {link.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  );
}
