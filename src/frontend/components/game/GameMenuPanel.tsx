import { Button } from "frontend/ui/Button";
import { cx } from "frontend/ui/cx";
import { UnitSprite } from "frontend/ui/UnitSprite";
import { useT } from "i18n";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bomb,
  Coins,
  Combine,
  Crosshair,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Hourglass,
  PackagePlus,
  Rocket,
  Trash2,
  Wrench,
} from "lucide-react";
import type { GameMenu, GameMenuItem } from "pixi/game-context";
import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

const actionIcons: Record<Extract<GameMenuItem, { kind: "action" }>["action"], LucideIcon> = {
  Wait: Hourglass,
  Join: Combine,
  Load: ArrowDownToLine,
  Capture: Flag,
  Launch: Rocket,
  Supply: PackagePlus,
  Explode: Bomb,
  Hide: EyeOff,
  Show: Eye,
  Unload: ArrowUpFromLine,
  Repair: Wrench,
  Attack: Crosshair,
  Delete: Trash2,
};

type Props = {
  menu: GameMenu;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  onCancel: () => void;
};

/** The menu of a tile. It opens next to the tile, on the side where there is room. */
export function GameMenuPanel({ menu, tileSize, mapWidth, mapHeight, onCancel }: Props) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const [x, y] = menu.position;

  useEffect(() => {
    panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [menu]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    const buttons = [
      ...(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []),
    ];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(current + step + buttons.length) % buttons.length]?.focus();
  };

  // half a tile is the border around the map
  const horizontal =
    x > mapWidth / 2
      ? { right: (mapWidth - x + 0.5) * tileSize + 4 }
      : { left: (x + 1.5) * tileSize + 4 };
  const vertical =
    y > mapHeight / 2
      ? { bottom: Math.max(0, (mapHeight - y - 0.5) * tileSize) }
      : { top: (y + 0.5) * tileSize };

  const titles = {
    build: t.game.menuBuild,
    actions: t.game.menuActions,
    unload: t.game.menuUnload,
  };

  const isLongList = menu.items.length > 7;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label={titles[menu.kind]}
      onKeyDown={onKeyDown}
      style={{ ...horizontal, ...vertical }}
      className={cx(
        "game-panel-in @absolute @z-20 @flex @max-h-[75vh] @flex-col @border @border-line-strong @bg-surface/95 @shadow-2xl @shadow-black/60 @backdrop-blur",
        isLongList ? "@w-[26rem]" : "@w-56",
      )}
    >
      <div className="@flex @items-center @justify-between @border-b @border-line @px-3 @py-1.5">
        <h2 className="@text-lg @leading-tight">{titles[menu.kind]}</h2>
        <span className="@h-1.5 @w-1.5 @bg-accent" aria-hidden />
      </div>
      <div className={cx("@overflow-y-auto @p-1", isLongList && "@grid @grid-cols-2 @gap-x-1")}>
        {menu.items.map((item) => {
          if (item.kind === "action") {
            const Icon = actionIcons[item.action];

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={item.onSelect}
                className="@flex @w-full @items-center @gap-2.5 @px-2.5 @py-2 @text-left @text-sm @font-medium @transition-colors hover:@bg-accent hover:@text-accent-fg focus-visible:@bg-accent focus-visible:@text-accent-fg focus-visible:@outline-none"
              >
                <Icon className="@h-4 @w-4 @shrink-0" aria-hidden />
                {t.actions[item.action]}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={item.onSelect}
              className="@flex @w-full @items-center @gap-2 @px-2 @py-1 @text-left @text-sm @font-medium @transition-colors enabled:hover:@bg-accent enabled:hover:@text-accent-fg focus-visible:@bg-accent focus-visible:@text-accent-fg focus-visible:@outline-none disabled:@cursor-not-allowed disabled:@text-fg-subtle"
            >
              <UnitSprite
                unitType={item.unitType}
                army={item.army}
                className={cx("@shrink-0", item.disabled && "@opacity-40 @grayscale")}
              />
              <span className="@min-w-0 @flex-1 @truncate">{t.units[item.unitType]}</span>
              <span className="@flex @shrink-0 @items-center @gap-1 @text-xs @tabular-nums">
                {item.valueKind === "cost" ? (
                  <Coins className="@h-3 @w-3" aria-label={t.game.funds} />
                ) : (
                  <Heart className="@h-3 @w-3" aria-label={t.game.hp} />
                )}
                {item.value}
              </span>
            </button>
          );
        })}
      </div>
      <div className="@border-t @border-line @p-1">
        <Button variant="ghost" size="sm" fullWidth onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
