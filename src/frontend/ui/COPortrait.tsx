import type { CO } from "shared/schemas/co";
import { cx } from "./cx";

type Props = {
  co: CO | undefined;
  /** Accessible name; the portrait is decorative when left out. */
  alt?: string;
  className?: string;
};

/** The face of a CO. They all have the same frame, so they line up wherever they are shown. */
export function COPortrait({ co, alt = "", className }: Props) {
  return (
    <img
      src={
        co === undefined
          ? "/img/CO/pixelated/no-co-small.png"
          : `/commander-wars/portraits/${co}.png`
      }
      alt={alt}
      className={cx("pixelated", className)}
      draggable={false}
    />
  );
}
