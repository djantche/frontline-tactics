import type { Dictionary } from "i18n/fr";
import { dictionaryOfLocale, toLocale } from "i18n";
import type { UnitType } from "shared/schemas/unit";

// Pixi code runs outside of React, so it reads the locale that Next.js sets on <html>.
const dictionary = () => dictionaryOfLocale(toLocale(document.documentElement.lang));

/** The bitmap font of the menus only has uppercase-friendly ASCII glyphs, no accents. */
const toBitmapText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toUpperCase();

export const actionLabel = (action: keyof Dictionary["actions"]) =>
  toBitmapText(dictionary().actions[action]);

export const unitLabel = (unitType: UnitType) =>
  // shortened to fit in the build menu, next to the cost
  toBitmapText(dictionary().units[unitType]).replace(" NOIRE", " N.");
