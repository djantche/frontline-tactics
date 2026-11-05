import {
  drawMap,
  drawTile,
  loadSpriteSheets,
  mapPixelSize,
  mapTopMargin,
  tileSize,
} from "frontend/map/draw-map";
import type { SpriteSheets } from "frontend/map/draw-map";
import { useT } from "i18n";
import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Tile } from "shared/schemas/tile";
import type { Weather } from "shared/schemas/weather";
import { brushPositions, linePositions, rectanglePositions } from "./editor-state";
import type { Position } from "./editor-state";

export type EditorTool = "brush" | "line" | "rectangle" | "fill" | "eraser" | "eyedropper" | "pan";

type Props = {
  weather: Weather;
  tiles: Tile[][];
  brush: Tile;
  tool: EditorTool;
  size: number;
  symmetric: boolean;
  zoom: number;
  grid: boolean;
  fitKey: number;
  onZoom: (zoom: number) => void;
  onHover: (position: Position | undefined) => void;
  onBegin: () => void;
  onPaint: (positions: Position[]) => void;
  onPick: (position: Position) => void;
};

export function EditorCanvas({
  weather,
  tiles,
  brush,
  tool,
  size,
  symmetric,
  zoom,
  grid,
  fitKey,
  onZoom,
  onHover,
  onBegin,
  onPaint,
  onPick,
}: Props) {
  const labels = useT().mapEditor;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ start: Position; last: Position }>();
  const pan = useRef<{ x: number; y: number }>();
  const spaceRef = useRef(false);
  const [space, setSpace] = useState(false);
  const [hovered, setHovered] = useState<Position>();
  const [shapeStart, setShapeStart] = useState<Position>();
  const [sheets, setSheets] = useState<SpriteSheets>();
  const [loadFailed, setLoadFailed] = useState(false);
  const { width, height } = mapPixelSize(tiles);
  const columns = tiles[0].length,
    rows = tiles.length;

  useEffect(() => {
    let current = true;
    void loadSpriteSheets()
      .then((loaded) => {
        if (current) {
          setSheets(loaded);
        }
      })
      .catch(() => {
        if (current) {
          setLoadFailed(true);
        }
      });

    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");

    if (context !== undefined && context !== null && sheets !== undefined) {
      drawMap(context, sheets, tiles, undefined, weather);
    }
  }, [tiles, sheets, width, height, weather]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (fitKey > 0 && viewport !== null) {
      const available = Math.min(
        (viewport.clientWidth - 64) / width,
        (viewport.clientHeight - 64) / height,
      );
      onZoom(Math.max(0.5, Math.min(4, Math.floor(available * 2) / 2)));
    }
  }, [fitKey, onZoom, width, height]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, [contenteditable=true]") !== null
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        spaceRef.current = true;
        setSpace(true);
      }
    };

    const up = (event: KeyboardEvent | FocusEvent) => {
      if (event.type === "blur" || ("code" in event && event.code === "Space")) {
        spaceRef.current = false;
        setSpace(false);
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  useEffect(() => {
    const context = overlayRef.current?.getContext("2d");

    if (context === undefined || context === null) {
      return;
    }

    context.clearRect(0, 0, width, height);

    if (grid) {
      context.strokeStyle = "rgba(14,18,23,.25)";
      context.lineWidth = 1 / zoom;
      context.beginPath();

      for (let x = 0; x <= columns; x++) {
        context.moveTo(x * tileSize, mapTopMargin);
        context.lineTo(x * tileSize, height);
      }
      for (let y = 0; y <= rows; y++) {
        context.moveTo(0, mapTopMargin + y * tileSize);
        context.lineTo(width, mapTopMargin + y * tileSize);
      }

      context.stroke();
    }

    if (hovered === undefined || tool === "pan" || space) {
      return;
    }

    const shape =
      shapeStart !== undefined
        ? tool === "line"
          ? linePositions(shapeStart, hovered)
          : rectanglePositions(shapeStart, hovered)
        : [hovered];
    const positions = brushPositions(
      tiles,
      shape,
      ("playerSlot" in brush && tool !== "eraser") || tool === "eyedropper" || tool === "fill"
        ? 1
        : size,
    );
    const outlined =
      symmetric && tool !== "eyedropper"
        ? [
            ...positions.map((position) => ({ position, mirrored: false })),
            ...positions.map(([x, y]) => ({
              position: [columns - 1 - x, rows - 1 - y] as Position,
              mirrored: true,
            })),
          ]
        : positions.map((position) => ({ position, mirrored: false }));

    for (const {
      position: [x, y],
      mirrored,
    } of outlined) {
      if (sheets !== undefined && !["eyedropper", "fill", "eraser"].includes(tool)) {
        const preview =
          mirrored && "playerSlot" in brush && brush.playerSlot >= 0
            ? { ...brush, playerSlot: 1 - brush.playerSlot }
            : brush;
        context.save();
        context.imageSmoothingEnabled = false;
        context.globalAlpha = 0.65;
        drawTile(context, sheets, preview, x, y, undefined, weather, tiles);
        context.restore();
      }

      context.fillStyle = mirrored ? "rgba(91,155,245,.17)" : "rgba(228,114,32,.2)";
      context.fillRect(x * tileSize, mapTopMargin + y * tileSize, tileSize, tileSize);
      context.strokeStyle = mirrored ? "#5B9BF5" : "#F58F45";
      context.lineWidth = 1.5 / zoom;
      context.strokeRect(x * tileSize, mapTopMargin + y * tileSize, tileSize, tileSize);
    }
  }, [
    tiles,
    hovered,
    shapeStart,
    brush,
    size,
    symmetric,
    tool,
    grid,
    zoom,
    sheets,
    columns,
    rows,
    width,
    height,
    space,
    weather,
  ]);

  const point = (event: PointerEvent<HTMLCanvasElement>): Position | undefined => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * columns);
    const y = Math.floor(
      (((event.clientY - bounds.top) / bounds.height) * height - mapTopMargin) / tileSize,
    );
    return x >= 0 && x < columns && y >= 0 && y < rows ? [x, y] : undefined;
  };

  const hover = (position: Position | undefined) => {
    setHovered(position);
    onHover(position);
  };

  const stamp = (positions: Position[]) =>
    onPaint(
      brushPositions(
        tiles,
        positions,
        ("playerSlot" in brush && tool !== "eraser") || tool === "fill" ? 1 : size,
      ),
    );

  const stop = (commit: boolean) => {
    if (commit && gesture.current !== undefined && (tool === "rectangle" || tool === "line")) {
      const { start, last } = gesture.current;
      onBegin();
      stamp(tool === "line" ? linePositions(start, last) : rectanglePositions(start, last));
    }

    gesture.current = undefined;
    pan.current = undefined;
    setShapeStart(undefined);
  };

  return (
    <div
      ref={viewportRef}
      data-testid="editor-viewport"
      className="@relative @min-h-[24rem] @flex-1 @overflow-auto @bg-canvas"
      style={{
        backgroundImage: "radial-gradient(#2C3743 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {loadFailed && (
        <p role="alert" className="@p-4 @text-danger">
          {labels.spriteLoadFailed}
        </p>
      )}
      <div className="@flex @min-h-full @min-w-full @items-start @justify-start @p-8">
        <div
          className="@relative @m-auto @shrink-0 @shadow-2xl"
          style={{ width: width * zoom, height: height * zoom }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            aria-label={labels.canvas}
            tabIndex={0}
            data-testid="editor-canvas"
            className="pixelated @block @touch-none focus:@outline-none focus-visible:@outline-accent"
            style={{
              width: width * zoom,
              height: height * zoom,
              cursor: tool === "pan" || space ? "grab" : "crosshair",
            }}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => {
              const position = point(event);

              if (event.button === 2) {
                if (position !== undefined) {
                  onPick(position);
                }

                return;
              }

              event.preventDefault();
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId);

              if (event.button === 1 || tool === "pan" || spaceRef.current) {
                pan.current = { x: event.clientX, y: event.clientY };
                return;
              }

              if (position === undefined || event.button !== 0) {
                return;
              }

              hover(position);

              if (tool === "eyedropper") {
                onPick(position);
                return;
              }

              if (tool === "line" || tool === "rectangle") {
                gesture.current = { start: position, last: position };
                setShapeStart(position);
              } else {
                onBegin();
                stamp([position]);

                if (tool !== "fill") {
                  gesture.current = { start: position, last: position };
                }
              }
            }}
            onPointerMove={(event) => {
              if (pan.current !== undefined && viewportRef.current !== null) {
                viewportRef.current.scrollLeft -= event.clientX - pan.current.x;
                viewportRef.current.scrollTop -= event.clientY - pan.current.y;
                pan.current = { x: event.clientX, y: event.clientY };
                return;
              }

              const position = point(event);
              hover(position);

              if (gesture.current !== undefined && position !== undefined) {
                if (tool !== "line" && tool !== "rectangle") {
                  stamp(linePositions(gesture.current.last, position));
                }

                gesture.current.last = position;
              }
            }}
            onPointerUp={() => stop(true)}
            onPointerCancel={() => stop(false)}
            onLostPointerCapture={() => stop(false)}
            onPointerLeave={() => {
              if (gesture.current === undefined) {
                hover(undefined);
              }
            }}
            onKeyDown={(event) => {
              const directions: Record<string, Position> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              };
              const delta = directions[event.key];

              if (delta !== undefined) {
                event.preventDefault();
                const [x, y] = hovered ?? [0, 0];
                hover([
                  Math.max(0, Math.min(columns - 1, x + delta[0])),
                  Math.max(0, Math.min(rows - 1, y + delta[1])),
                ]);
              }

              if (event.key === "Enter" && hovered !== undefined) {
                event.preventDefault();

                if (tool === "eyedropper") {
                  onPick(hovered);
                } else {
                  onBegin();
                  stamp([hovered]);
                }
              }
            }}
          />
          <canvas
            ref={overlayRef}
            width={width}
            height={height}
            aria-hidden
            className="pixelated @pointer-events-none @absolute @inset-0 @h-full @w-full"
          />
        </div>
      </div>
    </div>
  );
}
