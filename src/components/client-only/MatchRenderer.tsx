"use client";
import { ArmyChip } from "frontend/components/rooms/ArmyChip";
import { Badge } from "frontend/ui/Badge";
import { Button } from "frontend/ui/Button";
import { cx } from "frontend/ui/cx";
import { COPortrait } from "frontend/ui/COPortrait";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { ArrowLeft, Coins, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import type { LoadedSpriteSheet } from "pixi/load-spritesheet";
import { getCOProperties } from "shared/match-logic/co";
import type { MatchWrapper } from "shared/wrappers/match";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import type { FrontendUnit } from "../../frontend/components/match/FrontendUnit";
import type { ChangeableTileWithSprite } from "../../frontend/components/match/types";
import { usePixi } from "./use-pixi";

type Props = {
  match: MatchWrapper<ChangeableTileWithSprite, FrontendUnit>;
  player: PlayerInMatchWrapper;
  spriteSheets: LoadedSpriteSheet;
};

export const baseTileSize = 16;
export const renderMultiplier = 2;
export const renderedTileSize = baseTileSize * renderMultiplier;
export const mapBorder = baseTileSize / 2;

function PlayerPanel({
  player,
  isCurrent,
  isMe,
}: {
  player: PlayerInMatchWrapper;
  isCurrent: boolean;
  isMe: boolean;
}) {
  const t = useT();

  return (
    <div
      aria-current={isCurrent ? "true" : undefined}
      className={cx(
        "@flex @items-center @gap-2.5 @border @px-2.5 @py-1.5",
        isCurrent ? "@border-accent @bg-accent-soft" : "@border-line @bg-raised",
      )}
    >
      <COPortrait co={player.data.coId.name} className="@h-9 @w-9" />
      <div className="@min-w-0">
        <p className="@flex @items-center @gap-1.5 @text-sm @font-semibold">
          <ArmyChip army={player.data.army} />
          <span className="@max-w-[9rem] @truncate">{player.data.name}</span>
          {isMe && <span className="@font-normal @text-fg-muted">({t.room.you})</span>}
        </p>
        <p className="@flex @gap-3 @text-xs @text-fg-muted">
          <span className="@inline-flex @items-center @gap-1" title={t.game.funds}>
            <Coins className="@h-3 @w-3" aria-hidden />
            <span className="@sr-only">{t.game.funds} </span>
            {player.data.funds}
          </span>
          <span className="@inline-flex @items-center @gap-1" title={t.game.units}>
            <Shield className="@h-3 @w-3" aria-hidden />
            <span className="@sr-only">{t.game.units} </span>
            {player.getUnits().length}
          </span>
        </p>
      </div>
    </div>
  );
}

function COPowerControls({
  player,
  isMyTurn,
}: {
  player: PlayerInMatchWrapper;
  isMyTurn: boolean;
}) {
  const t = useT();
  const powerMutation = trpc.action.send.useMutation();

  const { COPower, superCOPower } = getCOProperties(player.data.coId).powers;
  const texts = t.guide.cos.texts[player.data.coId.name];
  const starCost = player.getPowerStarCost();
  const filledStars = Math.floor((player.data.powerMeter / starCost) * 10) / 10;
  const totalStars = superCOPower?.stars ?? COPower?.stars ?? 0;
  const powerState = player.data.COPowerState;

  const activate = (isSuper: boolean) => {
    powerMutation.mutate({
      type: "coPower",
      isSuper,
      playerId: player.data.id,
      matchId: player.match.id,
    });
  };

  const canUse = (stars: number | undefined) =>
    isMyTurn && powerState === "no-power" && stars !== undefined && filledStars >= stars;

  return (
    <div className="@flex @items-center @gap-2">
      <div title={t.game.powerMeter} className="@w-24">
        <div
          role="meter"
          aria-label={t.game.powerMeter}
          aria-valuemin={0}
          aria-valuemax={totalStars}
          aria-valuenow={Math.min(filledStars, totalStars)}
          className="@h-1.5 @w-full @bg-overlay"
        >
          <div
            className="@h-full @bg-accent"
            style={{ width: `${Math.min(100, (filledStars / Math.max(totalStars, 1)) * 100)}%` }}
          />
        </div>
        <p className="@mt-0.5 @text-[0.7rem] @text-fg-muted">
          {t.game.stars(Math.min(filledStars, totalStars), totalStars)}
        </p>
      </div>
      {powerState === "no-power" ? (
        <>
          {COPower !== undefined && (
            <Button
              size="sm"
              variant="secondary"
              title={texts?.power ?? COPower.description}
              disabled={!canUse(COPower.stars)}
              loading={powerMutation.isLoading}
              icon={<Zap className="@h-3.5 @w-3.5" aria-hidden />}
              onClick={() => activate(false)}
            >
              {t.game.power}
            </Button>
          )}
          {superCOPower !== undefined && (
            <Button
              size="sm"
              variant="secondary"
              title={texts?.superPower ?? superCOPower.description}
              disabled={!canUse(superCOPower.stars)}
              loading={powerMutation.isLoading}
              icon={<Sparkles className="@h-3.5 @w-3.5" aria-hidden />}
              onClick={() => activate(true)}
            >
              {t.game.superPower}
            </Button>
          )}
        </>
      ) : (
        <Badge tone="accent" dot>
          {powerState === "co-power" ? t.game.powerActive : t.game.superPowerActive}
        </Badge>
      )}
    </div>
  );
}

export function MatchRenderer({ match, player, spriteSheets }: Props) {
  const t = useT();
  const { pixiContainerRef, actionError } = usePixi(match, spriteSheets, player);
  const passTurnMutation = trpc.action.send.useMutation();
  const currentPlayer = match.getCurrentTurnPlayer();
  const isMyTurn = match.status === "playing" && currentPlayer.data.id === player.data.id;
  const error = passTurnMutation.error ?? actionError;

  return (
    <div className="@flex @min-h-0 @flex-1 @flex-col">
      <div className="@flex @flex-wrap @items-center @gap-x-4 @gap-y-2 @border-b @border-line @bg-surface @px-4 @py-2">
        <Link
          href="/"
          aria-label={t.game.backToRooms}
          className="@flex @h-8 @w-8 @items-center @justify-center @text-fg-muted hover:@text-fg"
        >
          <ArrowLeft className="@h-5 @w-5" aria-hidden />
        </Link>
        <div className="@min-w-0">
          <h1 className="@truncate @text-xl @leading-tight">{match.name ?? match.map.data.name}</h1>
          <p className="@text-xs @text-fg-muted">{t.game.day(match.turn)}</p>
        </div>
        <div className="@flex @flex-wrap @gap-2">
          {match.getAllPlayers().map((matchPlayer) => (
            <PlayerPanel
              key={matchPlayer.data.id}
              player={matchPlayer}
              isCurrent={matchPlayer.data.id === currentPlayer.data.id}
              isMe={matchPlayer.data.id === player.data.id}
            />
          ))}
        </div>
        <div className="@ml-auto @flex @flex-wrap @items-center @gap-3">
          <COPowerControls player={player} isMyTurn={isMyTurn} />
          <p
            aria-live="polite"
            className={cx("@text-sm @font-semibold", isMyTurn ? "@text-accent" : "@text-fg-muted")}
          >
            {isMyTurn ? t.game.yourTurn : t.game.opponentTurn(currentPlayer.data.name)}
          </p>
          <Button
            className="@select-none"
            disabled={!isMyTurn}
            loading={passTurnMutation.isLoading}
            onClick={() => {
              passTurnMutation
                .mutateAsync({
                  type: "passTurn",
                  playerId: player.data.id,
                  matchId: match.id,
                })
                .catch((err) => {
                  console.log(err);
                });
            }}
          >
            {isMyTurn ? t.game.endTurn : t.game.waiting}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="@bg-danger-soft @px-4 @py-2 @text-sm">
          {t.game.actionFailed} ({error.message})
        </p>
      )}
      <div ref={pixiContainerRef} className="@flex-1 @overflow-auto @bg-canvas @p-4" />
    </div>
  );
}
