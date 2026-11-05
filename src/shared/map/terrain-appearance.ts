import type { Weather } from "shared/schemas/weather";
import type { Tile } from "shared/schemas/tile";

/** Existing atlas names are inconsistent (plain-rain vs plain-normal-snow). */
export function terrainFrameCandidates(tile: Tile, weather: Weather): string[] {
  const suffix = weather === "snow" || weather === "rain" ? weather : undefined;

  if ("playerSlot" in tile) {
    return suffix === undefined
      ? [`${tile.type}-0.png`]
      : [`${tile.type}-${suffix}-0.png`, `${tile.type}-0.png`];
  }

  const base =
    tile.type === "pipeSeam"
      ? `pipeseam-${tile.variant}`
      : "variant" in tile
        ? `${tile.type}-${tile.variant}`
        : tile.type;

  if (suffix === undefined) {
    return [`${base}.png`];
  }

  const candidates = [`${base}-${suffix}.png`];

  if (tile.type === "plain" && tile.variant === "normal") {
    candidates.push(`plain-${suffix}.png`);
  }

  if (tile.type === "forest") {
    candidates.push(`wood-${suffix}.png`);
  }

  if (tile.type === "unusedSilo" || tile.type === "usedSilo") {
    candidates.push(`${tile.type}-${suffix}-0.png`);
  }

  return [...candidates, `${base}.png`];
}

export function propertyAnimationName(type: string, weather: Weather) {
  return weather === "rain" || weather === "snow" ? `${type}-${weather}` : type;
}

/** Same coordinate lookup as Commander Wars' frac_matrix_shader.glsl. */
export function applyTerrainPalette(
  source: Uint8ClampedArray,
  palette: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const result = new Uint8ClampedArray(source.length);

  for (let i = 0; i < source.length; i += 4) {
    const x = Math.min(width - 1, Math.floor((source[i] / 255) * width));
    const y = Math.min(height - 1, Math.floor((source[i + 1] / 255) * height));
    const index = (y * width + x) * 4;
    result[i] = palette[index];
    result[i + 1] = palette[index + 1];
    result[i + 2] = palette[index + 2];
    result[i + 3] = source[i + 3];
  }

  return result;
}
