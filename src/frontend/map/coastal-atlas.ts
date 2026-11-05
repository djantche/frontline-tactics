import type { AtlasFrame } from "./draw-map";
import { applyTerrainPalette } from "shared/map/terrain-appearance";
import type { Weather } from "shared/schemas/weather";

export type CoastalWeather = "clear" | "rain" | "snow";
export type CoastalAtlas = {
  images: Record<CoastalWeather, HTMLCanvasElement>;
  frames: Record<string, AtlasFrame>;
  animations: Record<string, string[]>;
};
export const coastalWeather = (weather: Weather): CoastalWeather =>
  weather === "rain" || weather === "snow" ? weather : "clear";
const loadImage = async (path: string) => {
  const image = new Image();
  image.src = path;
  await image.decode();
  return image;
};

const imagePixels = (image: HTMLImageElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (context === null) {
    throw new Error("Canvas is unavailable");
  }

  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
};

let pending: Promise<CoastalAtlas> | undefined;

export function loadCoastalAtlas(): Promise<CoastalAtlas> {
  pending ??= (async () => {
    const response = await fetch("/img/spriteSheet/coast.json");

    if (!response.ok) {
      throw new Error("Coastal sprites are unavailable");
    }

    const data = (await response.json()) as Pick<CoastalAtlas, "frames" | "animations">;
    const [mask, ...palettes] = await Promise.all([
      loadImage("/img/spriteSheet/coast-mask.png"),
      ...["clear", "rain", "snow"].map((weather) =>
        loadImage(`/commander-wars/images/terrain/biome_palettes/palette_${weather}+aw2.png`),
      ),
    ]);
    const source = imagePixels(mask);
    const images = Object.fromEntries(
      palettes.map((palette, index) => {
        const canvas = document.createElement("canvas");
        canvas.width = mask.width;
        canvas.height = mask.height;
        const context = canvas.getContext("2d");

        if (context === null) {
          throw new Error("Canvas is unavailable");
        }

        const colours = imagePixels(palette);
        const pixels = context.createImageData(canvas.width, canvas.height);
        pixels.data.set(
          applyTerrainPalette(source.data, colours.data, palette.width, palette.height),
        );
        context.putImageData(pixels, 0, 0);
        return [["clear", "rain", "snow"][index], canvas];
      }),
    ) as Record<CoastalWeather, HTMLCanvasElement>;
    return { ...data, images };
  })().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
