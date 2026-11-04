import { drawMap, loadSpriteSheets, mapPixelSize } from "frontend/map/draw-map";
import { useEffect, useRef } from "react";
import type { Army } from "shared/schemas/army";
import type { Tile } from "shared/schemas/tile";
import { cx } from "./cx";

type Props = {
  tiles: Tile[][];
  /** The army of each player slot. Defaults to orange star against blue moon. */
  armies?: Army[];
  label?: string;
  className?: string;
};

/** A static picture of a map. It scales to the width of its container. */
export function MapCanvas({ tiles, armies, label, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = mapPixelSize(tiles);

  useEffect(() => {
    let isCurrent = true;

    void loadSpriteSheets().then((sheets) => {
      const context = canvasRef.current?.getContext("2d");

      if (isCurrent && context !== null && context !== undefined) {
        drawMap(context, sheets, tiles, armies);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [tiles, armies, width, height]);

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
