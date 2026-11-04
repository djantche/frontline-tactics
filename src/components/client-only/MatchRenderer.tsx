"use client";
import {
  COPowerControls,
  ForecastPanel,
  PlayerCard,
  TileInfo,
  TurnBanner,
} from "frontend/components/game/GameHud";
import { BattleScene } from "frontend/components/game/BattleScene";
import { GameMenuPanel } from "frontend/components/game/GameMenuPanel";
import { ShaderPicker } from "frontend/components/settings/ShaderPicker";
import { playMusic, setMusicVolume } from "frontend/game/audio";
import { useBattleManifest } from "frontend/game/battle-manifest";
import type { BattleView } from "frontend/game/battle-timeline";
import { readSettings, updateSettings, useGameSettings } from "frontend/settings/game-settings";
import { Button, ButtonLink } from "frontend/ui/Button";
import { cx } from "frontend/ui/cx";
import { Dialog } from "frontend/ui/Dialog";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { ArrowLeft, Maximize, Minimize, Settings, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";
import type { ForecastView, GameMenu, GameUI } from "pixi/game-context";
import type { LoadedSpriteSheet } from "pixi/load-spritesheet";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Position } from "shared/schemas/position";
import type { MatchWrapper } from "shared/wrappers/match";
import type { PlayerInMatchWrapper } from "shared/wrappers/player-in-match";
import type { FrontendUnit } from "../../frontend/components/match/FrontendUnit";
import type { ChangeableTileWithSprite } from "../../frontend/components/match/types";
import type { PendingEvent } from "./use-pixi";
import { usePixi } from "./use-pixi";

type Props = {
  match: MatchWrapper<ChangeableTileWithSprite, FrontendUnit>;
  player: PlayerInMatchWrapper;
  spriteSheets: LoadedSpriteSheet;
  pendingEventRef: MutableRefObject<PendingEvent | null>;
};

export const baseTileSize = 16;
export const mapBorder = baseTileSize / 2;

// Small enough to fill the screen, sprites stay crisp with nearest neighbour scaling.
const tileSizeStep = 4;
const minTileSize = 16;
const maxTileSize = 96;

export function MatchRenderer({ match, player, spriteSheets, pendingEventRef }: Props) {
  const t = useT();
  const [menu, setMenu] = useState<GameMenu | null>(null);
  const [forecast, setForecast] = useState<ForecastView | null>(null);
  const [hovered, setHovered] = useState<Position | null>(null);
  const [fitTileSize, setFitTileSize] = useState(32);
  const [zoomSteps, setZoomSteps] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [battle, setBattle] = useState<BattleView | null>(null);
  const { shader, musicVolume } = useGameSettings();
  const manifest = useBattleManifest();
  const playfieldRef = useRef<HTMLDivElement>(null);

  const tileSize = Math.min(
    maxTileSize,
    Math.max(minTileSize, fitTileSize + zoomSteps * tileSizeStep),
  );

  const widthInTiles = match.map.width + 1;
  const heightInTiles = match.map.height + 1;

  const ui: GameUI = useMemo(
    () => ({ openMenu: setMenu, showForecast: setForecast, playBattle: setBattle }),
    [],
  );
  const onTileHover = useCallback((position: Position | null) => setHovered(position), []);

  const { pixiContainerRef, actionError, cancelSelection } = usePixi({
    match,
    spriteSheets,
    player,
    tileSize,
    shader,
    ui,
    onTileHover,
    pendingEventRef,
  });

  useEffect(() => {
    const playfield = playfieldRef.current;

    if (playfield === null) {
      return;
    }

    const fit = () => {
      const padding = 16;
      const ideal = Math.min(
        (playfield.clientWidth - padding) / widthInTiles,
        (playfield.clientHeight - padding) / heightInTiles,
      );
      setFitTileSize(Math.max(minTileSize, Math.floor(ideal / tileSizeStep) * tileSizeStep));
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(playfield);

    return () => observer.disconnect();
  }, [widthInTiles, heightInTiles]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);

    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelSelection]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement === null) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const passTurnMutation = trpc.action.send.useMutation();
  const currentPlayer = match.getCurrentTurnPlayer();
  const isMyTurn = match.status === "playing" && currentPlayer.data.id === player.data.id;
  const error = passTurnMutation.error ?? actionError;
  const [firstPlayer, secondPlayer] = [...match.getAllPlayers()].sort(
    (a, b) => a.data.slot - b.data.slot,
  );

  const currentMusic = manifest?.cos[currentPlayer.data.coId.name]?.music;

  // Each commander has a theme, played during their turn.
  useEffect(() => {
    playMusic(musicVolume > 0 ? currentMusic : undefined);
    setMusicVolume(musicVolume);

    // browsers only start music after an interaction with the page
    const retry = () => setMusicVolume(readSettings().musicVolume);
    window.addEventListener("pointerdown", retry, { once: true });

    return () => window.removeEventListener("pointerdown", retry);
  }, [currentMusic, musicVolume]);

  useEffect(() => () => playMusic(undefined), []);

  const turnText = isMyTurn ? t.game.yourTurn : t.game.opponentTurn(currentPlayer.data.name);

  const iconButtonClass =
    "@flex @h-9 @w-9 @items-center @justify-center @text-fg-muted @transition-colors hover:@bg-raised hover:@text-fg disabled:@opacity-40";

  return (
    <div className="@fixed @inset-0 @flex @flex-col @bg-canvas">
      <header className="@grid @shrink-0 @grid-cols-[1fr_auto_1fr] @items-center @gap-3 @border-b @border-line @bg-surface @px-2">
        <div className="@flex @min-w-0 @items-center @gap-1">
          <Link href="/" aria-label={t.game.backToRooms} className={iconButtonClass}>
            <ArrowLeft className="@h-5 @w-5" aria-hidden />
          </Link>
          <h1 className="@hidden @truncate @text-lg @leading-none laptop:@block">
            {match.name ?? match.map.data.name}
          </h1>
        </div>

        <div className="@flex @min-w-0 @items-stretch">
          <PlayerCard
            player={firstPlayer}
            isCurrent={firstPlayer.data.id === currentPlayer.data.id}
            isMe={firstPlayer.data.id === player.data.id}
            alignRight
          />
          <div className="@flex @shrink-0 @items-center @border-x @border-line @px-4">
            <p className="@whitespace-nowrap @font-display @text-2xl @font-bold @uppercase">
              {t.game.day(match.turn)}
            </p>
          </div>
          <PlayerCard
            player={secondPlayer}
            isCurrent={secondPlayer.data.id === currentPlayer.data.id}
            isMe={secondPlayer.data.id === player.data.id}
          />
        </div>

        <div className="@flex @items-center @justify-end @gap-0.5">
          <button
            type="button"
            aria-label={t.game.zoomOut}
            disabled={tileSize <= minTileSize}
            className={iconButtonClass}
            onClick={() => setZoomSteps(zoomSteps - 1)}
          >
            <ZoomOut className="@h-4 @w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t.game.zoomIn}
            disabled={tileSize >= maxTileSize}
            className={iconButtonClass}
            onClick={() => setZoomSteps(zoomSteps + 1)}
          >
            <ZoomIn className="@h-4 @w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t.game.settings}
            title={t.game.settings}
            className={iconButtonClass}
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="@h-4 @w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={isFullscreen ? t.game.exitFullscreen : t.game.enterFullscreen}
            className={iconButtonClass}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="@h-4 @w-4" aria-hidden />
            ) : (
              <Maximize className="@h-4 @w-4" aria-hidden />
            )}
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="@shrink-0 @bg-danger-soft @px-4 @py-1.5 @text-sm">
          {t.game.actionFailed} ({error.message})
        </p>
      )}

      <div
        ref={playfieldRef}
        className="game-playfield @relative @flex @min-h-0 @flex-1 @overflow-auto"
      >
        <div
          className="@relative @m-auto @shrink-0 @shadow-2xl @shadow-black/70"
          style={{ width: widthInTiles * tileSize, height: heightInTiles * tileSize }}
          onPointerLeave={() => setHovered(null)}
        >
          <div ref={pixiContainerRef} />
          {menu !== null && (
            <GameMenuPanel
              menu={menu}
              tileSize={tileSize}
              mapWidth={match.map.width}
              mapHeight={match.map.height}
              onCancel={cancelSelection}
            />
          )}
          {forecast !== null && (
            <ForecastPanel forecast={forecast} tileSize={tileSize} mapWidth={match.map.width} />
          )}
        </div>
      </div>

      <Dialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t.settings.graphics}
        description={t.settings.inGameHint}
        footer={
          <ButtonLink href="/settings" variant="ghost">
            {t.settings.allSettings}
          </ButtonLink>
        }
      >
        <ShaderPicker value={shader} onChange={(kind) => updateSettings({ shader: kind })} />
      </Dialog>

      {battle !== null && <BattleScene view={battle} onEnd={() => setBattle(null)} />}

      <TurnBanner
        turnKey={`${match.turn}-${currentPlayer.data.id}`}
        day={t.game.day(match.turn)}
        text={turnText}
        isMyTurn={isMyTurn}
      />

      <footer className="@grid @h-16 @shrink-0 @grid-cols-[1fr_auto_1fr] @items-center @gap-3 @border-t @border-line @bg-surface @px-3">
        <div className="@min-w-0">
          <TileInfo match={match} position={hovered} />
        </div>
        <COPowerControls player={player} isMyTurn={isMyTurn} />
        <div className="@flex @items-center @justify-end @gap-3">
          <p
            aria-live="polite"
            className={cx(
              "@hidden @text-sm @font-semibold smallscreen:@block",
              isMyTurn ? "@text-accent-hover" : "@text-fg-muted",
            )}
          >
            {turnText}
          </p>
          <Button
            size="lg"
            className="@select-none"
            disabled={!isMyTurn}
            loading={passTurnMutation.isLoading}
            onClick={() => {
              cancelSelection();
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
      </footer>
    </div>
  );
}
