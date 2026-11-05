import { drawMap, drawTile, loadSpriteSheets, mapPixelSize } from "frontend/map/draw-map";
import { useEffect, useRef } from "react";
import type { Army } from "shared/schemas/army";
import type { Tile } from "shared/schemas/tile";
import type { Weather } from "shared/schemas/weather";
import { cx } from "./cx";

/** A palette beach is shown at a shoreline instead of as an isolated shoal. */
export function TileSwatch({
  tile,
  weather = "clear",
  className,
}: {
  tile: Tile;
  weather?: Weather;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let current = true;
    void loadSpriteSheets()
      .then((sheets) => {
        const context = canvasRef.current?.getContext("2d");

        if (!current || context === undefined || context === null) {
          return;
        }

        const land: Tile = { type: "plain", variant: "normal" };
        const beach: Tile = { type: "shoal" };
        const water: Tile = { type: "sea" };
        const surroundings = [
          [land, land, land],
          [beach, tile, beach],
          [water, water, water],
        ];
        context.clearRect(0, 0, 16, 32);
        context.imageSmoothingEnabled = false;
        context.save();
        context.translate(-16, -16);
        drawTile(context, sheets, tile, 1, 1, undefined, weather, surroundings);
        context.restore();
      })
      .catch(() => undefined);

    return () => {
      current = false;
    };
  }, [tile, weather]);
  return (
    <canvas
      ref={canvasRef}
      width={16}
      height={32}
      aria-hidden
      className={cx("pixelated @block", className)}
    />
  );
}

type Props = {
  tiles: Tile[][];
  /** The army of each player slot. Defaults to orange star against blue moon. */
  armies?: Army[];
  label?: string;
  className?: string;
  weather?: Weather;
};

/** A static picture of a map. It scales to the width of its container. */
export function MapCanvas({ tiles, armies, label, className, weather = "clear" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = mapPixelSize(tiles);

  useEffect(() => {
    let isCurrent = true;

    void loadSpriteSheets().then((sheets) => {
      const context = canvasRef.current?.getContext("2d");

      if (isCurrent && context !== null && context !== undefined) {
        drawMap(context, sheets, tiles, armies, weather);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [tiles, armies, weather, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className={cx("pixelated @block @h-auto @w-full", className)}
    />
  );
}
