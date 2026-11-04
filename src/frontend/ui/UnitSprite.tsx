import { loadSpriteSheets } from "frontend/map/draw-map";
import { useEffect, useRef, useState } from "react";
import type { Army } from "shared/schemas/army";
import type { UnitType } from "shared/schemas/unit";
import { cx } from "./cx";

type Props = {
  unitType: UnitType;
  army?: Army;
  className?: string;
};

/** The first frame of the animation of a unit. */
export function UnitSprite({ unitType, army = "orange-star", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 16, height: 16 });

  useEffect(() => {
    let isCurrent = true;

    void loadSpriteSheets().then((sheets) => {
      const sheet = sheets[army];
      const frameName = sheet.animations?.[unitType]?.[0];
      const frame = frameName === undefined ? undefined : sheet.frames[frameName]?.frame;

      if (!isCurrent || frame === undefined) {
        return;
      }

      setSize({ width: frame.w, height: frame.h });

      // the canvas is resized by the state above on the next render
      requestAnimationFrame(() => {
        const context = canvasRef.current?.getContext("2d");
        context?.drawImage(sheet.image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
      });
    });

    return () => {
      isCurrent = false;
    };
  }, [unitType, army]);

  return (
    <canvas
      ref={canvasRef}
      width={size.width}
      height={size.height}
      aria-hidden
      className={cx("pixelated @inline-block @h-6 @w-6", className)}
    />
  );
}
