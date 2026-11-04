import type { CO } from "shared/schemas/co";
import { cx } from "./cx";

type Props = {
  co: CO | undefined;
  /** Accessible name; the portrait is decorative when left out. */
  alt?: string;
  variant?: "small" | "full";
  className?: string;
};

export function COPortrait({ co, alt = "", variant = "small", className }: Props) {
  const fileName = co === undefined ? "no-co-small" : `${co}-${variant}`;

  return (
    <img
      src={`/img/CO/pixelated/${fileName}.png`}
      alt={alt}
      className={cx("pixelated", className)}
      draggable={false}
    />
  );
}
