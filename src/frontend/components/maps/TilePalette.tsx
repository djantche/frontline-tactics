import { TileSwatch } from "frontend/ui/MapCanvas";
import { cx } from "frontend/ui/cx";
import { useT } from "i18n";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { Tile } from "shared/schemas/tile";
import type { Weather } from "shared/schemas/weather";
import { plainTile } from "./editor-state";

export type Owner = -1 | 0 | 1;
export const terrainPalette: Tile[] = [
  plainTile,
  { type: "forest" },
  { type: "mountain" },
  { type: "road", variant: "right-left" },
  { type: "bridge", variant: "right-left" },
  { type: "river", variant: "right-left" },
  { type: "sea" },
  { type: "shoal" },
  { type: "reef" },
  { type: "pipe", variant: "right-left" },
  { type: "pipeSeam", variant: "right-left", hp: 99 },
  { type: "unusedSilo" },
];
const propertyTypes = ["hq", "city", "base", "airport", "port", "commtower", "lab"] as const;

export function OwnerPicker({
  owner,
  onChange,
}: {
  owner: Owner;
  onChange: (owner: Owner) => void;
}) {
  const labels = useT().mapEditor;
  return (
    <div role="radiogroup" aria-label={labels.owner} className="@grid @grid-cols-3 @gap-1">
      {([-1, 0, 1] as const).map((slot) => (
        <button
          key={slot}
          type="button"
          role="radio"
          aria-checked={slot === owner}
          onClick={() => onChange(slot)}
          className={cx(
            "@flex @h-9 @items-center @justify-center @gap-1.5 @border @text-xs @font-medium",
            slot === owner
              ? "@border-accent @bg-accent-soft @text-fg"
              : "@border-line @text-fg-muted hover:@bg-raised",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "@h-2.5 @w-2.5",
              slot === -1 ? "@bg-fg-subtle" : slot === 0 ? "@bg-orange-star" : "@bg-blue-moon",
            )}
          />
          {slot === -1 ? labels.neutral : labels.player(slot + 1)}
        </button>
      ))}
    </div>
  );
}

export function TilePalette({
  weather,
  brush,
  owner,
  onOwner,
  onSelect,
}: {
  weather: Weather;
  brush: Tile;
  owner: Owner;
  onOwner: (owner: Owner) => void;
  onSelect: (tile: Tile) => void;
}) {
  const labels = useT().mapEditor;
  const property = "playerSlot" in brush;
  const [category, setCategory] = useState<"terrain" | "properties">(
    property ? "properties" : "terrain",
  );
  const [search, setSearch] = useState("");
  useEffect(() => {
    setCategory(property ? "properties" : "terrain");
  }, [property]);
  const properties: Tile[] = propertyTypes.map((type) => ({ type, playerSlot: owner }));
  const tiles = (category === "terrain" ? terrainPalette : properties).filter((tile) =>
    labels.tileNames[tile.type as keyof typeof labels.tileNames]
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );

  return (
    <div className="@flex @min-h-0 @flex-col">
      <div
        className="@grid @grid-cols-2 @border-b @border-line"
        role="tablist"
        aria-label={labels.palette}
      >
        {(["terrain", "properties"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={category === tab}
            onClick={() => {
              setCategory(tab);
              setSearch("");
            }}
            className={cx(
              "@border-b-2 @px-2 @py-3 @text-xs @font-semibold",
              category === tab
                ? "@border-accent @text-fg"
                : "@border-transparent @text-fg-muted hover:@text-fg",
            )}
          >
            {labels[tab]}
          </button>
        ))}
      </div>
      <div className="@p-3">
        <label className="@flex @h-9 @items-center @gap-2 @border @border-line @bg-canvas @px-2 @text-fg-subtle">
          <Search className="@h-3.5 @w-3.5 @shrink-0" aria-hidden />
          <input
            aria-label={labels.searchTiles}
            placeholder={labels.searchTiles}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="@min-w-0 @flex-1 @bg-transparent @text-xs @text-fg @outline-none"
          />
        </label>
        {category === "properties" && (
          <div className="@mt-3">
            <p className="@mb-2 @text-[10px] @font-semibold @uppercase @tracking-widest @text-fg-subtle">
              {labels.owner}
            </p>
            <OwnerPicker owner={owner} onChange={onOwner} />
          </div>
        )}
      </div>
      <div
        className="@grid @grid-cols-4 @gap-1.5 @px-3 @pb-3 laptop:@grid-cols-3"
        role="tabpanel"
        aria-label={labels[category]}
      >
        {tiles.map((tile) => {
          const selected =
            tile.type === brush.type &&
            (!("playerSlot" in tile) ||
              ("playerSlot" in brush && tile.playerSlot === brush.playerSlot));
          const disabled = tile.type === "hq" && owner === -1;
          const label = labels.tileNames[tile.type as keyof typeof labels.tileNames];
          const preview = disabled ? { type: "hq" as const, playerSlot: 0 } : tile;
          return (
            <button
              key={tile.type}
              type="button"
              title={disabled ? labels.hqNeedsOwner : label}
              aria-label={label}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelect(tile)}
              className={cx(
                "@relative @flex @h-[94px] @min-w-0 @flex-col @items-center @justify-end @border @pb-2 @transition-colors disabled:@cursor-not-allowed disabled:@opacity-30",
                selected
                  ? "@border-accent @bg-accent-soft"
                  : "@border-line @bg-raised hover:@border-line-strong hover:@bg-overlay",
              )}
            >
              <TileSwatch weather={weather} tile={preview} className="!@h-16 !@w-8 @shrink-0" />
              <span className="@w-full @truncate @px-0.5 @text-center @text-[10px] @font-medium">
                {label}
              </span>
              {selected && (
                <span aria-hidden className="@absolute @right-1 @top-1 @h-1.5 @w-1.5 @bg-accent" />
              )}
            </button>
          );
        })}
      </div>
      {tiles.length === 0 && (
        <p className="@px-3 @py-6 @text-center @text-xs @text-fg-muted">{labels.noTiles}</p>
      )}
      <p className="@border-t @border-line @px-3 @py-3 @text-[11px] @leading-relaxed @text-fg-subtle">
        {labels.paletteHint}
      </p>
    </div>
  );
}
