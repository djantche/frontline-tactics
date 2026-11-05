import { usePlayers } from "frontend/context/players";
import { Button, ButtonLink } from "frontend/ui/Button";
import { MapCanvas } from "frontend/ui/MapCanvas";
import { Switch } from "frontend/ui/Switch";
import { TextField } from "frontend/ui/TextField";
import { cx } from "frontend/ui/cx";
import { useToast } from "frontend/ui/Toast";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  Grid2X2,
  Hand,
  Maximize,
  Minus,
  MousePointer2,
  PaintBucket,
  Paintbrush,
  Pipette,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Slash,
  Square,
  Swords,
  Undo2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { maxMapSize, minMapSize, validateMap } from "shared/map/validate-map";
import type { MapIssue } from "shared/map/validate-map";
import type { Tile } from "shared/schemas/tile";
import type { CreatableMap } from "shared/schemas/map";
import type { Weather } from "shared/schemas/weather";
import { CreateRoomDialog } from "../rooms/CreateRoomDialog";
import { EditorCanvas } from "./EditorCanvas";
import type { EditorTool } from "./EditorCanvas";
import { TilePalette } from "./TilePalette";
import type { Owner } from "./TilePalette";
import {
  createEmptyTiles,
  editorReducer,
  floodFillPositions,
  parseDraft,
  plainTile,
  resizeTiles,
  transformTiles,
} from "./editor-state";
import type { MapTransform, Position } from "./editor-state";

type Props = { mapId?: string; initialName?: string; initialTiles?: Tile[][]; isCopy?: boolean };

export function MapEditor({ mapId, initialName = "", initialTiles, isCopy = false }: Props) {
  const labels = useT().mapEditor;
  const toast = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { currentPlayer } = usePlayers();
  const initial = useMemo(() => initialTiles ?? createEmptyTiles(20, 20), [initialTiles]);
  const [{ tiles, past, future }, dispatch] = useReducer(editorReducer, {
    tiles: initial,
    past: [],
    future: [],
  });
  const [name, setName] = useState(initialName);
  const [tool, setTool] = useState<EditorTool>("brush");
  const [brush, setBrush] = useState<Tile>(plainTile);
  const [size, setSize] = useState(1);
  const [owner, setOwner] = useState<Owner>(0);
  const [symmetric, setSymmetric] = useState(false);
  const [grid, setGrid] = useState(true);
  const [previewWeather, setPreviewWeather] = useState<Weather>("clear");
  const [zoom, setZoom] = useState(2);
  const [fitKey, setFitKey] = useState(0);
  const [hovered, setHovered] = useState<Position>();
  const [savedMapId, setSavedMapId] = useState(isCopy ? undefined : mapId);
  const [savedDigest, setSavedDigest] = useState(
    JSON.stringify({ name: initialName, tiles: initial }),
  );
  const [restored, setRestored] = useState(false);
  const [localDraft, setLocalDraft] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: initial[0].length,
    height: initial.length,
  });
  const importRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<() => void>(() => undefined);
  const draftKey = `map-draft-${isCopy ? "copy-" : ""}${mapId ?? "new"}`;
  const digest = useMemo(() => JSON.stringify({ name, tiles }), [name, tiles]);
  const dirty = digest !== savedDigest;
  const width = tiles[0].length,
    height = tiles.length;
  const issues = useMemo(() => validateMap(tiles), [tiles]);
  const valid = issues.length === 0 && name.trim() !== "";
  const saveMap = trpc.map.save.useMutation();
  const updateMap = trpc.map.update.useMutation();
  const saving = saveMap.isLoading || updateMap.isLoading;
  const activeTile = hovered === undefined ? undefined : tiles[hovered[1]]?.[hovered[0]];
  const tileName = (tile: Tile) => labels.tileNames[tile.type as keyof typeof labels.tileNames];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      const draft = raw === null ? undefined : parseDraft(raw);

      if (draft !== undefined) {
        dispatch({ type: "replace", tiles: draft.tiles });
        setName(draft.name);
      }
    } catch {
      setLocalDraft(false);
    }

    setRestored(true);
  }, [draftKey]);

  useEffect(() => {
    if (!restored) {
      return;
    }

    try {
      if (digest === savedDigest) {
        window.localStorage.removeItem(draftKey);
      } else {
        window.localStorage.setItem(draftKey, digest);
      }
    } catch {
      setLocalDraft(false);
    }
  }, [digest, draftKey, restored, savedDigest]);

  useEffect(() => {
    setDimensions({ width, height });
  }, [width, height]);

  const selectBrush = (tile: Tile) => {
    setBrush(tile);

    if ("playerSlot" in tile) {
      setOwner(tile.playerSlot as Owner);
    }

    if (["eraser", "eyedropper", "pan"].includes(tool) || tile.type === "hq") {
      setTool("brush");
    }
  };

  const changeOwner = (next: Owner) => {
    setOwner(next);

    if ("playerSlot" in brush) {
      setBrush(
        brush.type === "hq" && next === -1
          ? { type: "city", playerSlot: -1 }
          : { ...brush, playerSlot: next },
      );
    }
  };

  const pick = (position: Position) => {
    selectBrush(tiles[position[1]][position[0]]);
    setTool("brush");
  };

  const paint = useCallback(
    (positions: Position[]) => {
      const target = tool === "eraser" ? plainTile : brush;
      const affected = tool === "fill" ? floodFillPositions(tiles, positions[0]) : positions;
      dispatch({ type: "paint", positions: affected, tile: target, symmetric });
    },
    [brush, tool, tiles, symmetric],
  );

  const transform = (kind: MapTransform) =>
    dispatch({ type: "commit", tiles: transformTiles(tiles, kind) });

  const resize = () => {
    const clamp = (value: number) =>
      Math.min(
        maxMapSize,
        Math.max(minMapSize, Number.isFinite(value) ? Math.round(value) : minMapSize),
      );
    const nextWidth = clamp(dimensions.width),
      nextHeight = clamp(dimensions.height);
    setDimensions({ width: nextWidth, height: nextHeight });

    if (nextWidth !== width || nextHeight !== height) {
      dispatch({ type: "commit", tiles: resizeTiles(tiles, nextWidth, nextHeight) });
    }
  };

  const onSave = async () => {
    if (currentPlayer === undefined || !valid || saving) {
      return;
    }

    const content = {
      name: name.trim(),
      tiles: tiles as CreatableMap["tiles"],
      predeployedUnits: [],
      playerId: currentPlayer.id,
    };

    try {
      if (savedMapId === undefined) {
        const { id } = await saveMap.mutateAsync(content);
        setSavedMapId(id);
        void router.replace(`/maps/${id}/edit`);
      } else {
        await updateMap.mutateAsync({ ...content, mapId: savedMapId });
      }

      setSavedDigest(digest);

      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        /* The database save still succeeded. */
      }

      void utils.map.invalidate();
      toast(labels.saved, "success");
    } catch {
      toast(labels.saveFailed, "error");
    }
  };

  saveRef.current = () => {
    void onSave();
  };

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, [contenteditable=true]") !== null
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.ctrlKey || event.metaKey) {
        if (key === "z" || key === "y") {
          event.preventDefault();
          dispatch({ type: key === "y" || event.shiftKey ? "redo" : "undo" });
        }

        if (key === "s") {
          event.preventDefault();
          saveRef.current();
        }

        return;
      }

      const shortcuts: Record<string, EditorTool> = {
        b: "brush",
        l: "line",
        r: "rectangle",
        g: "fill",
        e: "eraser",
        i: "eyedropper",
        h: "pan",
      };
      const next = shortcuts[key];

      if (next !== undefined) {
        event.preventDefault();
        setTool(next);
      }

      if (key === "escape") {
        setTool("brush");
      }
    };

    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, []);

  const exportMap = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, name, tiles }, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-") || "map"}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importMap = async (file: File | undefined) => {
    if (file === undefined) {
      return;
    }

    try {
      if (file.size > 2_000_000) {
        throw new Error("Map file too large");
      }

      const draft = parseDraft(await file.text());

      if (draft === undefined) {
        throw new Error("Invalid map");
      }

      dispatch({ type: "commit", tiles: draft.tiles });
      setName(draft.name);
      toast(labels.imported, "success");
    } catch {
      toast(labels.importFailed, "error");
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

  const tools: { id: EditorTool; label: string; icon: LucideIcon; key: string }[] = [
    { id: "brush", label: labels.brush, icon: Paintbrush, key: "B" },
    { id: "line", label: labels.line, icon: Slash, key: "L" },
    { id: "rectangle", label: labels.rectangle, icon: Square, key: "R" },
    { id: "fill", label: labels.fill, icon: PaintBucket, key: "G" },
    { id: "eraser", label: labels.eraser, icon: Eraser, key: "E" },
    { id: "eyedropper", label: labels.eyedropper, icon: Pipette, key: "I" },
    { id: "pan", label: labels.pan, icon: Hand, key: "H" },
  ];
  const activeTool = tools.find((entry) => entry.id === tool)!;
  const iconButton = (
    label: string,
    Icon: LucideIcon,
    onClick: () => void,
    disabled = false,
    selected = false,
  ) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "@flex @h-8 @w-8 @shrink-0 @items-center @justify-center @border @transition-colors disabled:@opacity-30",
        selected
          ? "@border-accent @bg-accent-soft @text-accent-hover"
          : "@border-transparent @text-fg-muted hover:@border-line hover:@bg-raised hover:@text-fg",
      )}
    >
      <Icon className="@h-4 @w-4" aria-hidden />
    </button>
  );

  return (
    <div className="@flex @min-h-0 @flex-1 @flex-col @bg-canvas">
      <header className="@flex @flex-wrap @items-center @gap-3 @border-b @border-line @bg-surface @px-4 @py-3">
        <ButtonLink
          href="/maps"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="@h-4 @w-4" aria-hidden />}
        >
          <span className="@hidden smallscreen:@inline">{labels.back}</span>
        </ButtonLink>
        <div className="@mr-auto @flex @items-center @gap-3">
          <div className="@flex @h-9 @w-9 @items-center @justify-center @border @border-line-strong @bg-raised @text-accent">
            <Grid2X2 className="@h-4 @w-4" aria-hidden />
          </div>
          <div>
            <h1 className="@text-xl @leading-none">{labels.studio}</h1>
            <p className="@mt-1 @text-[11px] @text-fg-subtle">
              {labels.size(width, height)} · {labels.twoPlayers}
            </p>
          </div>
        </div>
        <div className="@flex @items-center @gap-2 @text-xs @text-fg-muted">
          <span
            aria-hidden
            className={cx(
              "@h-1.5 @w-1.5 @rounded-full",
              dirty || savedMapId === undefined ? "@bg-warning" : "@bg-success",
            )}
          />
          {dirty || savedMapId === undefined
            ? localDraft
              ? labels.localDraft
              : labels.unsaved
            : labels.savedState}
        </div>
        <Button
          icon={<Save className="@h-4 @w-4" aria-hidden />}
          disabled={!valid || currentPlayer === undefined}
          loading={saving}
          onClick={() => void onSave()}
        >
          {labels.save}
        </Button>
      </header>

      <div className="@flex @flex-wrap @items-center @gap-1 @border-b @border-line @bg-surface @px-3 @py-1.5">
        {iconButton(
          `${labels.undo} (Ctrl+Z)`,
          Undo2,
          () => dispatch({ type: "undo" }),
          past.length === 0,
        )}
        {iconButton(
          `${labels.redo} (Ctrl+Shift+Z)`,
          Redo2,
          () => dispatch({ type: "redo" }),
          future.length === 0,
        )}
        <span className="@mx-2 @h-5 @border-l @border-line" />
        <label className="@mr-2 @flex @items-center @gap-2 @text-xs @text-fg-muted">
          {labels.brushSize}
          <select
            aria-label={labels.brushSize}
            value={"playerSlot" in brush && tool !== "eraser" ? 1 : size}
            disabled={"playerSlot" in brush && tool !== "eraser"}
            onChange={(event) => setSize(Number(event.target.value))}
            className="@h-8 @border @border-line @bg-raised @px-2 @text-fg disabled:@opacity-40"
          >
            {[1, 3, 5].map((value) => (
              <option key={value} value={value}>
                {value} × {value}
              </option>
            ))}
          </select>
        </label>
        <span className="@hidden @text-[11px] @text-fg-subtle smallscreen:@inline">
          {labels.autoConnect}
        </span>
        <label className="@ml-2 @flex @items-center @gap-2 @text-xs @text-fg-muted">
          {labels.previewWeather}
          <select
            aria-label={labels.previewWeather}
            value={previewWeather}
            onChange={(event) => setPreviewWeather(event.target.value as Weather)}
            className="@h-8 @border @border-line @bg-raised @px-2 @text-fg"
          >
            <option value="clear">{labels.weatherClear}</option>
            <option value="rain">{labels.weatherRain}</option>
            <option value="snow">{labels.weatherSnow}</option>
          </select>
        </label>
        <div className="@ml-auto @flex @items-center @gap-1">
          {iconButton(labels.importMap, Upload, () => importRef.current?.click())}
          {iconButton(labels.exportMap, Download, exportMap)}
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            aria-label={labels.importMap}
            className="@hidden"
            onChange={(event) => {
              void importMap(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span className="@mx-2 @h-5 @border-l @border-line" />
          {iconButton(labels.grid, Grid2X2, () => setGrid(!grid), false, grid)}
          {iconButton(labels.fit, Maximize, () => setFitKey((value) => value + 1))}
          {iconButton(
            labels.zoomOut,
            Minus,
            () => setZoom((value) => Math.max(0.5, value - 0.5)),
            zoom <= 0.5,
          )}
          <span className="@w-12 @text-center @text-xs @tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          {iconButton(
            labels.zoomIn,
            Plus,
            () => setZoom((value) => Math.min(4, value + 0.5)),
            zoom >= 4,
          )}
        </div>
      </div>

      <div className="@flex @min-h-0 @flex-1 @flex-col laptop:@flex-row">
        <div className="@flex @shrink-0 @flex-row @border-b @border-line @bg-surface laptop:@w-[286px] laptop:@border-b-0 laptop:@border-r">
          <nav
            aria-label={labels.tools}
            className="@flex @w-12 @shrink-0 @flex-col @items-center @gap-1 @border-r @border-line @py-2"
          >
            {tools.map(({ id, label, icon: Icon, key }) => (
              <button
                key={id}
                type="button"
                title={`${label} (${key})`}
                aria-label={label}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
                className={cx(
                  "@relative @flex @h-10 @w-10 @items-center @justify-center @border",
                  tool === id
                    ? "@border-accent @bg-accent-soft @text-accent-hover"
                    : "@border-transparent @text-fg-muted hover:@bg-raised hover:@text-fg",
                )}
              >
                <Icon className="@h-[18px] @w-[18px]" aria-hidden />
                <span aria-hidden className="@absolute @bottom-0 @right-1 @text-[8px] @opacity-50">
                  {key}
                </span>
              </button>
            ))}
          </nav>
          <aside
            aria-label={labels.palette}
            className="@max-h-[320px] @min-w-0 @flex-1 @overflow-y-auto laptop:@max-h-none"
          >
            <TilePalette
              weather={previewWeather}
              brush={brush}
              owner={owner}
              onOwner={changeOwner}
              onSelect={selectBrush}
            />
          </aside>
        </div>

        <section
          className="@flex @min-h-[28rem] @min-w-0 @flex-1 @flex-col"
          aria-label={labels.workspace}
        >
          <div className="@flex @h-9 @shrink-0 @items-center @gap-2 @border-b @border-line @bg-raised @px-3 @text-[11px] @text-fg-muted">
            <MousePointer2 className="@h-3.5 @w-3.5 @text-accent" aria-hidden />
            <span className="@font-medium @text-fg">{tileName(brush)}</span>
            <span> / {activeTool.label}</span>
            <span className="@ml-auto @text-fg-subtle">{labels.canvasHint}</span>
          </div>
          <EditorCanvas
            weather={previewWeather}
            tiles={tiles}
            brush={brush}
            tool={tool}
            size={size}
            symmetric={symmetric}
            zoom={zoom}
            grid={grid}
            fitKey={fitKey}
            onZoom={setZoom}
            onHover={setHovered}
            onBegin={() => dispatch({ type: "checkpoint" })}
            onPaint={paint}
            onPick={pick}
          />
          <footer className="@flex @h-8 @shrink-0 @items-center @gap-3 @border-t @border-line @bg-surface @px-3 @text-[10px] @text-fg-muted">
            <span className="@font-mono @tabular-nums">
              {hovered === undefined ? "X —   Y —" : `X ${hovered[0] + 1}   Y ${hovered[1] + 1}`}
            </span>
            {activeTile !== undefined && (
              <span>
                {tileName(activeTile)}
                {"playerSlot" in activeTile
                  ? ` · ${activeTile.playerSlot < 0 ? labels.neutral : labels.player(activeTile.playerSlot + 1)}`
                  : ""}
              </span>
            )}
            <span className="@ml-auto @text-fg-subtle">{labels.size(width, height)}</span>
          </footer>
        </section>

        <aside
          aria-label={labels.inspector}
          className="@flex @w-full @shrink-0 @flex-col @gap-4 @overflow-y-auto @border-t @border-line @bg-surface @p-4 laptop:@w-[258px] laptop:@border-l laptop:@border-t-0"
        >
          <TextField
            label={labels.name}
            maxLength={60}
            value={name}
            placeholder={labels.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
          {isCopy && (
            <p className="@border-l-2 @border-warning @bg-warning-soft @p-2 @text-xs">
              {labels.copyNotice}
            </p>
          )}
          <section>
            <h2 className="@mb-2 @text-[10px] @font-semibold @uppercase @tracking-widest @text-fg-subtle">
              {labels.overview}
            </h2>
            <div className="@flex @h-36 @items-center @justify-center @overflow-hidden @border @border-line @bg-canvas @p-2">
              <MapCanvas
                weather={previewWeather}
                tiles={tiles}
                label={labels.overview}
                className="!@h-full !@w-auto @max-w-full @object-contain"
              />
            </div>
          </section>
          <section>
            <h2 className="@mb-3 @text-[10px] @font-semibold @uppercase @tracking-widest @text-fg-subtle">
              {labels.layout}
            </h2>
            <div className="@grid @grid-cols-2 @gap-2">
              <TextField
                label={labels.width}
                type="number"
                min={minMapSize}
                max={maxMapSize}
                value={dimensions.width}
                onChange={(event) =>
                  setDimensions({ ...dimensions, width: Number(event.target.value) })
                }
              />
              <TextField
                label={labels.height}
                type="number"
                min={minMapSize}
                max={maxMapSize}
                value={dimensions.height}
                onChange={(event) =>
                  setDimensions({ ...dimensions, height: Number(event.target.value) })
                }
              />
            </div>
            <Button
              fullWidth
              variant="secondary"
              size="sm"
              className="@mt-2"
              onClick={resize}
              disabled={dimensions.width === width && dimensions.height === height}
            >
              {labels.resize}
            </Button>
            <div className="@mt-2 @grid @grid-cols-3 @gap-1">
              {[
                ["rotate", labels.rotate, RotateCw],
                ["flipX", labels.flipX, FlipHorizontal2],
                ["flipY", labels.flipY, FlipVertical2],
              ].map(([kind, label, Icon]) => {
                const TransformIcon = Icon as LucideIcon;
                return (
                  <button
                    key={kind as string}
                    type="button"
                    title={label as string}
                    aria-label={label as string}
                    onClick={() => transform(kind as MapTransform)}
                    className="@flex @h-8 @items-center @justify-center @border @border-line @bg-raised @text-fg-muted hover:@text-fg"
                  >
                    <TransformIcon className="@h-4 @w-4" aria-hidden />
                  </button>
                );
              })}
            </div>
          </section>
          <div className="@border-y @border-line @py-3">
            <Switch
              label={labels.symmetry}
              description={labels.symmetryHint}
              checked={symmetric}
              onChange={setSymmetric}
            />
          </div>
          <section>
            <div className="@mb-2 @flex @items-center @justify-between">
              <h2 className="@text-[10px] @font-semibold @uppercase @tracking-widest @text-fg-subtle">
                {labels.validation}
              </h2>
              {issues.length === 0 ? (
                <CheckCircle2 className="@h-4 @w-4 @text-success" aria-hidden />
              ) : (
                <span className="@bg-warning-soft @px-1.5 @text-[10px] @text-warning">
                  {issues.length}
                </span>
              )}
            </div>
            {issues.length === 0 ? (
              <p className="@text-xs @text-success">{labels.valid}</p>
            ) : (
              <ul className="@space-y-2">
                {issues.map((issue) => (
                  <li
                    key={JSON.stringify(issue)}
                    className="@flex @gap-2 @text-[11px] @leading-relaxed @text-fg-muted"
                  >
                    <AlertTriangle
                      className="@mt-0.5 @h-3 @w-3 @shrink-0 @text-warning"
                      aria-hidden
                    />
                    {issueText(issue)}
                  </li>
                ))}
              </ul>
            )}
            {name.trim() === "" && (
              <p className="@mt-2 @text-[11px] @text-fg-subtle">{labels.nameRequired}</p>
            )}
          </section>
          <div className="@grid @grid-cols-2 @gap-2">
            {[0, 1].map((slot) => {
              const properties = tiles
                .flat()
                .filter((tile) => "playerSlot" in tile && tile.playerSlot === slot);
              return (
                <div key={slot} className="@border @border-line @bg-raised @p-2">
                  <p className="@flex @items-center @gap-1.5 @text-[11px] @font-semibold">
                    <span
                      className={cx("@h-2 @w-2", slot === 0 ? "@bg-orange-star" : "@bg-blue-moon")}
                    />
                    {labels.player(slot + 1)}
                  </p>
                  <p className="@mt-1 @text-[10px] @text-fg-muted">
                    {labels.propertyCount(properties.length)}
                  </p>
                </div>
              );
            })}
          </div>
          {savedMapId !== undefined && (
            <>
              <Button
                variant="secondary"
                fullWidth
                icon={<Swords className="@h-4 @w-4" aria-hidden />}
                disabled={dirty}
                onClick={() => setCreatingRoom(true)}
              >
                {labels.createRoom}
              </Button>
              <CreateRoomDialog
                open={creatingRoom}
                onClose={() => setCreatingRoom(false)}
                mapId={savedMapId}
              />
            </>
          )}
          <div className="@mt-auto @border-t @border-line @pt-3 @text-[10px] @leading-relaxed @text-fg-subtle">
            <p className="@mb-1 @flex @items-center @gap-1 @text-fg-muted">
              <Check className="@h-3 @w-3" aria-hidden />
              {labels.shortcuts}
            </p>
            {labels.shortcutsHint}
            <ButtonLink
              href="/how-to-play#terrain"
              variant="ghost"
              size="sm"
              fullWidth
              className="@mt-2"
            >
              {labels.terrainHelp}
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
