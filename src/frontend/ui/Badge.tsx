import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: "@bg-overlay @text-fg-muted", dot: "@bg-fg-muted" },
  accent: { badge: "@bg-accent-soft @text-accent-hover", dot: "@bg-accent" },
  success: { badge: "@bg-success-soft @text-success", dot: "@bg-success" },
  danger: { badge: "@bg-danger-soft @text-danger", dot: "@bg-danger" },
  warning: { badge: "@bg-warning-soft @text-warning", dot: "@bg-warning" },
  info: { badge: "@bg-info-soft @text-info", dot: "@bg-info" },
};

type Props = {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
};

export function Badge({ tone = "neutral", dot, children }: Props) {
  return (
    <span
      className={cx(
        "@inline-flex @items-center @gap-1.5 @px-2 @py-0.5 @text-xs @font-semibold",
        tones[tone].badge,
      )}
    >
      {dot === true && <span className={cx("@h-1.5 @w-1.5", tones[tone].dot)} aria-hidden />}
      {children}
    </span>
  );
}
