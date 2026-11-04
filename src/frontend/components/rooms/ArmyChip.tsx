import { cx } from "frontend/ui/cx";
import type { Army } from "shared/schemas/army";

// The class names are safelisted in tailwind.config.ts
export function ArmyChip({ army, className }: { army: Army; className?: string }) {
  return <span className={cx(`@bg-${army}`, "@inline-block @h-3 @w-3", className)} aria-hidden />;
}
