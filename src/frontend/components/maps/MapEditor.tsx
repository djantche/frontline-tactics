import { usePlayers } from "frontend/context/players";
import {
  drawMap,
  loadSpriteSheets,
  mapPixelSize,
  mapTopMargin,
  tileSize,
} from "frontend/map/draw-map";
import type { SpriteSheets } from "frontend/map/draw-map";
import { Button, ButtonLink } from "frontend/ui/Button";
import { Card } from "frontend/ui/Card";
import { cx } from "frontend/ui/cx";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Switch } from "frontend/ui/Switch";
import { TextField } from "frontend/ui/TextField";
import { useToast } from "frontend/ui/Toast";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eraser,
  PaintBucket,
  Paintbrush,
  Pipette,
  Redo2,
  Swords,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { maxMapSize, minMapSize, validateMap } from "shared/map/validate-map";
import type { MapIssue } from "shared/map/validate-map";
import type { CreatableMap } from "shared/schemas/map";
import type { Tile } from "shared/schemas/tile";
import { CreateRoomDialog } from "../rooms/CreateRoomDialog";
import type { Position } from "./editor-state";
import {
  createEmptyTiles,
  editorReducer,
  floodFillPositions,
  paintTiles,
  plainTile,
  resizeTiles,
} from "./editor-state";

type Tool = "brush" | "fill" | "eraser" | "eyedropper";

type Owner = -1 | 0 | 1;

const defaultSize = 20;
const minZoom = 1;
const maxZoom = 4;

const terrainPalette: Tile[] = [
  plainTile,
  { type: "road", variant: "right-left" },
  { type: "river", variant: "right-left" },
  { type: "bridge", variant: "right-left" },
  { type: "forest" },
  { type: "mountain" },
  { type: "sea" },
  { type: "shoal" },
  { type: "reef" },
  { type: "pipe", variant: "right-left" },
  { type: "pipeSeam", variant: "right-left", hp: 99 },
  { type: "unusedSilo" },
];

const propertyTypes = ["hq", "city", "base", "airport", "port", "commtower", "lab"] as const;

const isSameTile = (a: Tile, b: Tile) =>
  a.type === b.type &&
  ("playerSlot" in a && "playerSlot" in b ? a.playerSlot === b.playerSlot : true);

type Props = {
  /** The map being edited. A new map is created when this is left out. */
  mapId?: string;
  initialName?: string;
  initialTiles?: Tile[][];
  /** Saves as a new map: the original is used by a match or belongs to someone else. */
  isCopy?: boolean;
};

export function MapEditor({ mapId, initialName = "", initialTiles, isCopy = false }: Props) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { currentPlayer } = usePlayers();
  const labels = t.mapEditor;

  const draftKey = `map-draft-${isCopy ? "copy-" : ""}${mapId ?? "new"}`;

  const [{ tiles, past, future }, dispatch] = useReducer(editorReducer, {
    tiles: initialTiles ?? createEmptyTiles(defaultSize, defaultSize),
    past: [],
    future: [],
  });
  const [name, setName] = useState(initialName);
  const [tool, setTool] = useState<Tool>("brush");
  const [brush, setBrush] = useState<Tile>(terrainPalette[1]);
  const [owner, setOwner] = useState<Owner>(0);
  const [isSymmetric, setIsSymmetric] = useState(true);
  const [zoom, setZoom] = useState(2);
  const [hovered, setHovered] = useState<Position>();
  const [savedMapId, setSavedMapId] = useState(isCopy ? undefined : mapId);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPainting = useRef(false);
  const lastSaved = useRef(JSON.stringify({ name: initialName, tiles: initialTiles }));

  const issues = useMemo(() => validateMap(tiles), [tiles]);
  const isValid = issues.length === 0 && name.trim() !== "";

  const saveMap = trpc.map.save.useMutation();
  const updateMap = trpc.map.update.useMutation();
  const isSaving = saveMap.isLoading || updateMap.isLoading;

  const { width: pixelWidth, height: pixelHeight } = mapPixelSize(tiles);
  const width = tiles[0].length;
  const height = tiles.length;

  useEffect(() => {
    let isCurrent = true;

    void loadSpriteSheets().then((sheets: SpriteSheets) => {
      const context = canvasRef.current?.getContext("2d");

      if (isCurrent && context !== null && context !== undefined) {
        drawMap(context, sheets, tiles);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [tiles, pixelWidth, pixelHeight]);

  // Drafts survive a reload, until the map is saved.
  useEffect(() => {
    const draft = window.localStorage.getItem(draftKey);

    if (draft !== null) {
      const parsed = JSON.parse(draft) as { name: string; tiles: Tile[][] };
      dispatch({ type: "replace", tiles: parsed.tiles });
      setName(parsed.name);
    }

    setHasRestoredDraft(true);
  }, [draftKey]);

  useEffect(() => {
    if (hasRestoredDraft) {
      const current = JSON.stringify({ name, tiles });

      if (current === lastSaved.current) {
        window.localStorage.removeItem(draftKey);
      } else {
        window.localStorage.setItem(draftKey, current);
      }
    }
  }, [name, tiles, draftKey, hasRestoredDraft]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" || key === "y") {
        event.preventDefault();
        dispatch({ type: key === "y" || event.shiftKey ? "redo" : "undo" });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const positionOfEvent = (event: PointerEvent<HTMLCanvasElement>): Position | undefined => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pixelX = ((event.clientX - rect.left) / rect.width) * pixelWidth;
    const pixelY = ((event.clientY - rect.top) / rect.height) * pixelHeight;
    const x = Math.floor(pixelX / tileSize);
    const y = Math.floor((pixelY - mapTopMargin) / tileSize);

    return x >= 0 && y >= 0 && x < width && y < height ? [x, y] : undefined;
  };

  const applyTool = useCallback(
    (position: Position) => {
      const [x, y] = position;

      switch (tool) {
        case "brush":
          dispatch({
            type: "set-tiles",
            tiles: paintTiles(tiles, [position], brush, isSymmetric),
          });
          break;
        case "eraser":
          dispatch({
            type: "set-tiles",
            tiles: paintTiles(tiles, [position], plainTile, isSymmetric),
          });
          break;
        case "fill":
          dispatch({
            type: "set-tiles",
            tiles: paintTiles(tiles, floodFillPositions(tiles, position), brush, isSymmetric),
          });
          break;
        case "eyedropper": {
          const tile = tiles[y][x];
          setBrush(tile);

          if ("playerSlot" in tile) {
            setOwner(tile.playerSlot as Owner);
          }

          setTool("brush");
          break;
        }
      }
    },
    [tool, tiles, brush, isSymmetric],
  );

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const position = positionOfEvent(event);

    if (position === undefined) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool !== "eyedropper") {
      dispatch({ type: "checkpoint" });
    }

    isPainting.current = tool === "brush" || tool === "eraser";
    applyTool(position);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const position = positionOfEvent(event);
    setHovered(position);

    if (isPainting.current && position !== undefined) {
      applyTool(position);
    }
  };

  const stopPainting = () => {
    isPainting.current = false;
  };

  const onResize = (nextWidth: number, nextHeight: number) => {
    const clamp = (value: number) =>
      Math.min(maxMapSize, Math.max(minMapSize, Number.isNaN(value) ? minMapSize : value));

    dispatch({ type: "checkpoint" });
    dispatch({ type: "set-tiles", tiles: resizeTiles(tiles, clamp(nextWidth), clamp(nextHeight)) });
  };

  const selectBrush = (tile: Tile) => {
    setBrush(tile);

    if (tool === "eraser" || tool === "eyedropper") {
      setTool("brush");
    }
  };

  const onSave = async () => {
    if (currentPlayer === undefined) {
      return;
    }

    const content = {
      name,
      tiles: tiles as CreatableMap["tiles"],
      predeployedUnits: [],
      playerId: currentPlayer.id,
    };

    try {
      if (savedMapId === undefined) {
        const { id } = await saveMap.mutateAsync(content);
        setSavedMapId(id);
        window.localStorage.removeItem(draftKey);
        void router.replace(`/maps/${id}/edit`);
      } else {
        await updateMap.mutateAsync({ ...content, mapId: savedMapId });
      }

      lastSaved.current = JSON.stringify({ name, tiles });
      window.localStorage.removeItem(draftKey);
      void utils.map.invalidate();
      toast(labels.saved, "success");
    } catch {
      toast(labels.saveFailed, "error");
    }
  };

  const issueText = (issue: MapIssue) => {
    switch (issue.code) {
      case "not-rectangular":
        return labels.issueNotRectangular;
      case "wrong-size":
        return labels.issueWrongSize(minMapSize, maxMapSize);
      case "unsupported-player":
        return labels.issueUnsupportedPlayer(issue.slot + 1);
      case "missing-hq":
        return labels.issueMissingHq(issue.slot + 1);
      case "too-many-hqs":
        return labels.issueTooManyHqs(issue.slot + 1);
      case "missing-production":
        return labels.issueMissingProduction(issue.slot + 1);
    }
  };

  const tools: { id: Tool; label: string; icon: ReactNode }[] = [
    { id: "brush", label: labels.brush, icon: <Paintbrush className="@h-4 @w-4" /> },
    { id: "fill", label: labels.fill, icon: <PaintBucket className="@h-4 @w-4" /> },
    { id: "eraser", label: labels.eraser, icon: <Eraser className="@h-4 @w-4" /> },
    { id: "eyedropper", label: labels.eyedropper, icon: <Pipette className="@h-4 @w-4" /> },
  ];

  const owners: { id: Owner; label: string; className: string }[] = [
    { id: -1, label: labels.neutral, className: "@bg-fg-subtle" },
    { id: 0, label: labels.player(1), className: "@bg-orange-star" },
    { id: 1, label: labels.player(2), className: "@bg-blue-moon" },
  ];

  const paletteButton = (tile: Tile, label: string, key: string, disabled = false) => {
    const isSelected = tool !== "eraser" && isSameTile(brush, tile);

    return (
      <button
        key={key}
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={isSelected}
        disabled={disabled}
        onClick={() => selectBrush(tile)}
        className={cx(
          "@flex @h-12 @items-end @justify-center @border @bg-raised @p-0.5 @transition-colors disabled:@cursor-not-allowed disabled:@opacity-30",
          isSelected ? "@border-accent" : "@border-line hover:@border-line-strong",
        )}
      >
        <span className="@w-5">
          <MapCanvas tiles={[[tile]]} />
        </span>
      </button>
    );
  };

  const terrainName = (tile: Tile) => labels.tileNames[tile.type as keyof typeof labels.tileNames];

  return (
    <div className="@flex @min-h-0 @flex-1 @flex-col @overflow-y-auto laptop:@flex-row laptop:@overflow-hidden">
      <aside className="@flex @w-full @shrink-0 @flex-col @gap-4 @overflow-y-auto @border-b @border-line @bg-surface @p-3 laptop:@w-60 laptop:@border-b-0 laptop:@border-r">
        <Link
          href="/maps"
          className="@inline-flex @items-center @gap-1.5 @text-sm @text-fg-muted hover:@text-fg"
        >
          <ArrowLeft className="@h-4 @w-4" aria-hidden />
          {labels.back}
        </Link>

        <section>
          <h2 className="@mb-1.5 @text-lg @leading-none">{labels.tools}</h2>
          <div className="@grid @grid-cols-4 @gap-1">
            {tools.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
                className={cx(
                  "@flex @h-9 @items-center @justify-center @border @transition-colors",
                  tool === id
                    ? "@border-accent @bg-accent-soft @text-accent-hover"
                    : "@border-line @bg-raised @text-fg-muted hover:@text-fg",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="@mt-1 @grid @grid-cols-2 @gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={past.length === 0}
              icon={<Undo2 className="@h-4 @w-4" aria-hidden />}
              onClick={() => dispatch({ type: "undo" })}
            >
              {labels.undo}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={future.length === 0}
              icon={<Redo2 className="@h-4 @w-4" aria-hidden />}
              onClick={() => dispatch({ type: "redo" })}
            >
              {labels.redo}
            </Button>
          </div>
        </section>

        <section>
          <h2 className="@mb-1.5 @text-lg @leading-none">{labels.terrain}</h2>
          <div className="@grid @grid-cols-6 @gap-1 laptop:@grid-cols-4">
            {terrainPalette.map((tile) => paletteButton(tile, terrainName(tile), tile.type))}
          </div>
        </section>

        <section>
          <h2 className="@mb-1.5 @text-lg @leading-none">{labels.properties}</h2>
          <div role="radiogroup" aria-label={labels.owner} className="@mb-1.5 @flex @gap-1">
            {owners.map(({ id, label, className }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={owner === id}
                onClick={() => {
                  setOwner(id);

                  if ("playerSlot" in brush && !(brush.type === "hq" && id === -1)) {
                    setBrush({ ...brush, playerSlot: id });
                  }
                }}
                className={cx(
                  "@flex @flex-1 @items-center @justify-center @gap-1 @border @px-1 @py-1 @text-xs @font-medium",
                  owner === id ? "@border-accent @text-fg" : "@border-line @text-fg-muted",
                )}
              >
                <span className={cx("@h-2 @w-2 @shrink-0", className)} aria-hidden />
                <span className="@truncate">{label}</span>
              </button>
            ))}
          </div>
          <div className="@grid @grid-cols-6 @gap-1 laptop:@grid-cols-4">
            {propertyTypes.map((type) =>
              paletteButton(
                { type, playerSlot: owner },
                labels.tileNames[type],
                type,
                type === "hq" && owner === -1,
              ),
            )}
          </div>
        </section>

        <Switch
          label={labels.symmetry}
          description={labels.symmetryHint}
          checked={isSymmetric}
          onChange={setIsSymmetric}
        />
      </aside>

      <div className="@relative @flex @min-h-[24rem] @min-w-0 @flex-1 @flex-col">
        <div className="@flex @items-center @justify-between @gap-3 @border-b @border-line @bg-surface @px-3 @py-1.5 @text-xs @text-fg-muted">
          <span aria-live="off">
            {hovered === undefined
              ? labels.size(width, height)
              : `${labels.size(width, height)} · ${hovered[0] + 1}, ${hovered[1] + 1}`}
          </span>
          <div className="@flex @items-center @gap-1">
            <button
              type="button"
              aria-label={labels.zoomOut}
              disabled={zoom <= minZoom}
              className="@p-1 hover:@text-fg disabled:@opacity-40"
              onClick={() => setZoom(zoom - 1)}
            >
              <ZoomOut className="@h-4 @w-4" aria-hidden />
            </button>
            <span className="@w-8 @text-center @tabular-nums">{zoom}×</span>
            <button
              type="button"
              aria-label={labels.zoomIn}
              disabled={zoom >= maxZoom}
              className="@p-1 hover:@text-fg disabled:@opacity-40"
              onClick={() => setZoom(zoom + 1)}
            >
              <ZoomIn className="@h-4 @w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="@flex-1 @overflow-auto @bg-canvas @p-4">
          <canvas
            ref={canvasRef}
            width={pixelWidth}
            height={pixelHeight}
            aria-label={labels.canvas}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopPainting}
            onPointerCancel={stopPainting}
            onPointerLeave={() => setHovered(undefined)}
            className="pixelated @mx-auto @block @cursor-crosshair @touch-none"
            style={{ width: pixelWidth * zoom, height: pixelHeight * zoom }}
          />
        </div>
      </div>

      <aside className="@flex @w-full @shrink-0 @flex-col @gap-4 @overflow-y-auto @border-t @border-line @bg-surface @p-3 laptop:@w-72 laptop:@border-l laptop:@border-t-0">
        <h1 className="@text-2xl @leading-none">
          {savedMapId === undefined ? labels.titleNew : labels.titleEdit}
        </h1>
        {isCopy && (
          <p className="@border @border-warning @bg-warning-soft @p-2 @text-xs">
            {labels.copyNotice}
          </p>
        )}
        <TextField
          label={labels.name}
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="@grid @grid-cols-2 @gap-2">
          <TextField
            key={`width-${width}`}
            label={labels.width}
            type="number"
            min={minMapSize}
            max={maxMapSize}
            defaultValue={width}
            onBlur={(event) => {
              const value = Number(event.target.value);

              if (value !== width) {
                onResize(value, height);
              }
            }}
          />
          <TextField
            key={`height-${height}`}
            label={labels.height}
            type="number"
            min={minMapSize}
            max={maxMapSize}
            defaultValue={height}
            onBlur={(event) => {
              const value = Number(event.target.value);

              if (value !== height) {
                onResize(width, value);
              }
            }}
          />
        </div>

        <Card className="@p-3">
          <h2 className="@mb-1.5 @text-lg @leading-none">{labels.validation}</h2>
          {issues.length === 0 ? (
            <p className="@flex @items-center @gap-1.5 @text-xs @text-success">
              <CheckCircle2 className="@h-4 @w-4 @shrink-0" aria-hidden />
              {labels.valid}
            </p>
          ) : (
            <ul className="@flex @flex-col @gap-1">
              {issues.map((issue) => (
                <li
                  key={JSON.stringify(issue)}
                  className="@flex @items-start @gap-1.5 @text-xs @text-warning"
                >
                  <AlertTriangle className="@mt-px @h-3.5 @w-3.5 @shrink-0" aria-hidden />
                  {issueText(issue)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Button
          size="lg"
          fullWidth
          disabled={!isValid || currentPlayer === undefined}
          loading={isSaving}
          onClick={() => void onSave()}
        >
          {labels.save}
        </Button>
        {name.trim() === "" && <p className="@text-xs @text-fg-muted">{labels.nameRequired}</p>}

        {savedMapId !== undefined && (
          <Button
            variant="secondary"
            fullWidth
            icon={<Swords className="@h-4 @w-4" aria-hidden />}
            onClick={() => setIsCreatingRoom(true)}
          >
            {labels.createRoom}
          </Button>
        )}
        {savedMapId !== undefined && (
          <CreateRoomDialog
            open={isCreatingRoom}
            onClose={() => setIsCreatingRoom(false)}
            mapId={savedMapId}
          />
        )}
        <ButtonLink href="/how-to-play#terrain" variant="ghost" fullWidth>
          {labels.terrainHelp}
        </ButtonLink>
      </aside>
    </div>
  );
}
