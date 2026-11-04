import { cx } from "./cx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("@animate-pulse @bg-raised", className)} aria-hidden />;
}
