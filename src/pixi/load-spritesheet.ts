import type {
  ArmySpritesheetData,
  SheetNames,
  SpritesheetDataByArmy,
} from "frontend/components/match/getSpritesheetData";
import { BaseTexture, SCALE_MODES, Spritesheet, utils } from "pixi.js";
import { loadCoastalAtlas } from "frontend/map/coastal-atlas";
import type { CoastalWeather } from "frontend/map/coastal-atlas";

export type LoadedSpriteSheet = Record<SheetNames, Spritesheet<ArmySpritesheetData>> & {
  coastal?: Record<CoastalWeather, Spritesheet>;
};

//This function transforms our RAW spritesheets into finer spritesheets pixi can read well, this is client-side
export async function loadSpritesFromSpriteMap(
  spriteMap: SpritesheetDataByArmy,
): Promise<LoadedSpriteSheet> {
  const pixiSpriteSheets: Partial<LoadedSpriteSheet> = {};

  for (const sheetName in spriteMap) {
    const rawSpriteSheet = spriteMap[sheetName as SheetNames];

    if (rawSpriteSheet !== undefined) {
      if (rawSpriteSheet.meta.image === undefined) {
        throw new Error(`No spritesheet image found for ${sheetName}`);
      }

      const pixiSheet = new Spritesheet<ArmySpritesheetData>(
        BaseTexture.from(`/img/spriteSheet/${rawSpriteSheet.meta.image}`, {
          scaleMode: SCALE_MODES.NEAREST,
        }),
        rawSpriteSheet,
      );
      await pixiSheet.parse();
      pixiSpriteSheets[sheetName as SheetNames] = pixiSheet;
      utils.clearTextureCache();
    }
  }

  const coast = await loadCoastalAtlas();
  const coastal = {} as Record<CoastalWeather, Spritesheet>;

  for (const weather of ["clear", "rain", "snow"] as const) {
    const sheet = new Spritesheet(
      BaseTexture.from(coast.images[weather], { scaleMode: SCALE_MODES.NEAREST }),
      {
        frames: coast.frames,
        animations: coast.animations,
        meta: { scale: "1" },
      },
    );
    await sheet.parse();
    coastal[weather] = sheet;
  }

  return { ...pixiSpriteSheets, coastal } as LoadedSpriteSheet;
}
