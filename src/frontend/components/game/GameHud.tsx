import { coTextsOf } from "frontend/game/playable-cos";
import { ArmyChip } from "frontend/components/rooms/ArmyChip";
import { playSound } from "frontend/game/audio";
import { Button } from "frontend/ui/Button";
import { COPortrait } from "frontend/ui/COPortrait";
import { cx } from "frontend/ui/cx";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { UnitSprite } from "frontend/ui/UnitSprite";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { Coins, Crosshair, Fuel, Heart, Shield, Sparkles, Star, Zap } from "lucide-react";
import type { ForecastView } from "pixi/game-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCOProperties } from "shared/match-logic/co";
import { getTerrainDefenseStars } from "shared/match-logic/game-constants/terrain-properties";
import type { Army } from "shared/schemas/army";
import type { Position } from "shared/schemas/position";
import type { Tile } from "shared/schemas/tile";
import type { MatchWrapper } from "shared/wrappers/match";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";

function PowerStars({ player }: { player: PlayerInMatchWrapper }) {
  const t = useT();
  const { COPower, superCOPower } = getCOProperties(player.data.coId).powers;
  const total = superCOPower?.stars ?? COPower?.stars ?? 0;
  const filled = player.data.powerMeter / player.getPowerStarCost();

  return (
    <div
      role="meter"
      aria-label={t.game.powerMeter}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(filled, total)}
      className="@flex @gap-px"
    >
      {Array.from({ length: total }, (_, index) => {
        const isSuperStar = COPower !== undefined && index >= COPower.stars;
        const fill = Math.max(0, Math.min(1, filled - index));

        return (
          <span key={index} className="@relative @h-2.5 @w-2.5" aria-hidden>
            <Star
              className={cx(
                "@absolute @inset-0 @h-2.5 @w-2.5",
                isSuperStar ? "@text-warning/40" : "@text-fg-subtle/60",
              )}
            />
            <span
              className="@absolute @inset-0 @overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className={cx(
                  "@h-2.5 @w-2.5",
                  isSuperStar ? "@fill-warning @text-warning" : "@fill-accent @text-accent",
                )}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function PlayerCard({
  player,
  isCurrent,
  isMe,
  alignRight = false,
}: {
  player: PlayerInMatchWrapper;
  isCurrent: boolean;
  isMe: boolean;
  alignRight?: boolean;
}) {
  const t = useT();

  return (
    <div
      aria-current={isCurrent ? "true" : undefined}
      className={cx(
        "@flex @min-w-0 @items-center @gap-2.5 @border-b-2 @px-3 @py-1 @transition-colors",
        alignRight && "@flex-row-reverse @text-right",
        isCurrent ? "@border-accent @bg-accent-soft/70" : "@border-transparent",
      )}
    >
      <COPortrait
        co={player.data.coId.name}
        className={cx("@h-10 @w-10 @shrink-0", alignRight && "@-scale-x-100")}
      />
      <div className="@min-w-0">
        <p
          className={cx(
            "@flex @items-center @gap-1.5 @text-sm @font-semibold",
            alignRight && "@flex-row-reverse",
          )}
        >
          <ArmyChip army={player.data.army} className="@shrink-0" />
          <span className="@max-w-[10rem] @truncate">{player.data.name}</span>
          {isMe && <span className="@font-normal @text-fg-muted">({t.room.you})</span>}
        </p>
        <div
          className={cx(
            "@flex @items-center @gap-3 @text-xs @text-fg-muted",
            alignRight && "@flex-row-reverse",
          )}
        >
          <span className="@inline-flex @items-center @gap-1 @tabular-nums" title={t.game.funds}>
            <Coins className="@h-3 @w-3" aria-hidden />
            <span className="@sr-only">{t.game.funds} </span>
            {player.data.funds}
          </span>
          <span className="@inline-flex @items-center @gap-1 @tabular-nums" title={t.game.units}>
            <Shield className="@h-3 @w-3" aria-hidden />
            <span className="@sr-only">{t.game.units} </span>
            {player.getUnits().length}
          </span>
          <PowerStars player={player} />
        </div>
      </div>
    </div>
  );
}

export function COPowerControls({
  player,
  isMyTurn,
}: {
  player: PlayerInMatchWrapper;
  isMyTurn: boolean;
}) {
  const t = useT();
  const powerMutation = trpc.action.send.useMutation();

  const { COPower, superCOPower } = getCOProperties(player.data.coId).powers;
  const texts = coTextsOf(player.data.coId.name, t.guide.cos);
  const filledStars = player.data.powerMeter / player.getPowerStarCost();
  const powerState = player.data.COPowerState;

  const activate = (isSuper: boolean) => {
    powerMutation.mutate({
      type: "coPower",
      isSuper,
      playerId: player.data.id,
      matchId: player.match.id,
    });
  };

  const canUse = (stars: number) => isMyTurn && powerState === "no-power" && filledStars >= stars;

  if (powerState !== "no-power") {
    return (
      <span className="game-power-active @inline-flex @items-center @gap-1.5 @border @border-accent @bg-accent-soft @px-3 @py-1.5 @text-sm @font-semibold @text-accent-hover">
        <Zap className="@h-4 @w-4" aria-hidden />
        {powerState === "co-power" ? t.game.powerActive : t.game.superPowerActive}
      </span>
    );
  }

  return (
    <div className="@flex @items-center @gap-2">
      {COPower !== undefined && (
        <Button
          variant="secondary"
          title={`${COPower.name}${t.common.colon}${texts?.power ?? COPower.description}`}
          disabled={!canUse(COPower.stars)}
          loading={powerMutation.isLoading}
          icon={<Zap className="@h-4 @w-4" aria-hidden />}
          onClick={() => activate(false)}
        >
          {t.game.power}
        </Button>
      )}
      {superCOPower !== undefined && (
        <Button
          variant="secondary"
          title={`${superCOPower.name}${t.common.colon}${
            texts?.superPower ?? superCOPower.description
          }`}
          disabled={!canUse(superCOPower.stars)}
          loading={powerMutation.isLoading}
          icon={<Sparkles className="@h-4 @w-4" aria-hidden />}
          onClick={() => activate(true)}
        >
          {t.game.superPower}
        </Button>
      )}
    </div>
  );
}

/** What's under the cursor: the terrain and, if there is one, the unit on it. */
export function TileInfo({ match, position }: { match: MatchWrapper; position: Position | null }) {
  const t = useT();

  const armies = useMemo(() => {
    const bySlot: Army[] = ["orange-star", "blue-moon"];
    match.getAllPlayers().forEach((player) => {
      bySlot[player.data.slot] = player.data.army;
    });
    return bySlot;
  }, [match]);

  const tiles = useMemo((): Tile[][] | undefined => {
    if (position === null) {
      return undefined;
    }

    // changeable tiles also carry their Pixi sprite, which is of no use here
    const { sprite: _sprite, ...tile } = match.getTile(position) as Tile & { sprite?: unknown };
    return [[tile as Tile]];
  }, [match, position]);

  if (position === null || tiles === undefined) {
    return <p className="@text-xs @text-fg-subtle">{t.game.hoverHint}</p>;
  }

  const tile = tiles[0][0];
  const unit = match.getUnit(position);
  const names = t.mapEditor.tileNames;
  const name = tile.type in names ? names[tile.type as keyof typeof names] : names.unusedSilo;
  const stars = getTerrainDefenseStars(tile.type);

  return (
    <div className="@flex @items-center @gap-4">
      <div className="@flex @items-center @gap-2">
        <span className="@w-6 @shrink-0">
          <MapCanvas tiles={tiles} armies={armies} />
        </span>
        <div>
          <p className="@text-sm @font-semibold @leading-tight">{name}</p>
          <p className="@flex @items-center @gap-0.5" aria-label={`${t.game.defense} ${stars}`}>
            {Array.from({ length: Math.max(stars, 1) }, (_, index) => (
              <Star
                key={index}
                className={cx(
                  "@h-2.5 @w-2.5",
                  stars === 0 ? "@text-fg-subtle/50" : "@fill-accent @text-accent",
                )}
                aria-hidden
              />
            ))}
          </p>
        </div>
      </div>
      {unit !== undefined && (
        <div className="@flex @items-center @gap-2 @border-l @border-line @pl-4">
          <UnitSprite unitType={unit.data.type} army={unit.player.data.army} />
          <div>
            <p className="@text-sm @font-semibold @leading-tight">{t.units[unit.data.type]}</p>
            <p className="@flex @gap-2.5 @text-xs @tabular-nums @text-fg-muted">
              <span className="@inline-flex @items-center @gap-1" title={t.game.hp}>
                <Heart className="@h-3 @w-3" aria-hidden />
                {unit.getVisualHP()}
              </span>
              <span className="@inline-flex @items-center @gap-1" title={t.game.fuel}>
                <Fuel className="@h-3 @w-3" aria-hidden />
                {unit.getFuel()}
              </span>
              {unit.getAmmo() !== null && (
                <span className="@inline-flex @items-center @gap-1" title={t.game.ammo}>
                  <Crosshair className="@h-3 @w-3" aria-hidden />
                  {unit.getAmmo()}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** The expected outcome of an attack, next to the target. */
export function ForecastPanel({
  forecast,
  tileSize,
  mapWidth,
}: {
  forecast: ForecastView;
  tileSize: number;
  mapWidth: number;
}) {
  const t = useT();
  const [x, y] = forecast.position;
  const { attackerDamage, defenderDamage } = forecast;

  const range = ({ min, max }: { min: number; max: number }) =>
    min === max ? `${min} %` : `${min}–${max} %`;

  const horizontal =
    x > mapWidth / 2
      ? { right: (mapWidth - x + 0.5) * tileSize + 4 }
      : { left: (x + 1.5) * tileSize + 4 };

  return (
    <div
      role="status"
      style={{ ...horizontal, top: (y + 0.5) * tileSize }}
      className="game-panel-in @pointer-events-none @absolute @z-20 @flex @flex-col @gap-1 @border @border-line-strong @bg-surface/95 @px-3 @py-2 @text-sm @shadow-xl @shadow-black/60"
    >
      <p className="@flex @items-center @gap-2">
        <UnitSprite unitType={forecast.attackerType} army={forecast.attackerArmy} />
        <span className="@text-xs @text-fg-muted">{t.game.damageDealt}</span>
        <span className="@ml-auto @pl-3 @font-semibold @tabular-nums @text-accent-hover">
          {range(attackerDamage)}
        </span>
      </p>
      {forecast.defenderType !== undefined && forecast.defenderArmy !== undefined && (
        <p className="@flex @items-center @gap-2">
          <UnitSprite unitType={forecast.defenderType} army={forecast.defenderArmy} />
          <span className="@text-xs @text-fg-muted">{t.game.damageTaken}</span>
          <span className="@ml-auto @pl-3 @font-semibold @tabular-nums">
            {range(defenderDamage)}
          </span>
        </p>
      )}
    </div>
  );
}

const turnBannerMs = 1500;

/** Announces every new turn, like the day banner of the original games. */
export function TurnBanner({
  turnKey,
  day,
  text,
  isMyTurn,
}: {
  turnKey: string;
  day: string;
  text: string;
  isMyTurn: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  // no banner when opening the page in the middle of a game
  const lastTurnKey = useRef(turnKey);

  useEffect(() => {
    if (lastTurnKey.current === turnKey) {
      return;
    }

    lastTurnKey.current = turnKey;
    playSound("player_turn.wav");
    setIsVisible(true);
    const timeout = setTimeout(() => setIsVisible(false), turnBannerMs);

    return () => clearTimeout(timeout);
  }, [turnKey]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="@pointer-events-none @fixed @inset-0 @z-30 @flex @items-center @justify-center"
    >
      <div
        key={turnKey}
        className={cx(
          "game-turn-banner @w-full @border-y-2 @py-5 @text-center",
          isMyTurn ? "@border-accent @bg-accent-soft/90" : "@border-line-strong @bg-surface/90",
        )}
      >
        <p className="@font-display @text-5xl @font-bold @uppercase @tracking-wide">{day}</p>
        <p className="@mt-1 @text-sm @font-medium @text-fg-muted">{text}</p>
      </div>
    </div>
  );
}
