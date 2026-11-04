import type { ComponentProps } from "react";
import { cx } from "./cx";

type Props = ComponentProps<"div"> & { interactive?: boolean };

export function Card({ interactive, className, ...props }: Props) {
  return (
    <div
      className={cx(
        "@border @border-line @bg-surface",
        interactive === true && "@transition-colors hover:@border-line-strong hover:@bg-raised",
        className,
      )}
      {...props}
    />
  );
}
