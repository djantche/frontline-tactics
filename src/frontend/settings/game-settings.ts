import { useSyncExternalStore } from "react";

export const shaderKinds = ["pixel", "sharp", "soft", "scale2x", "xbr", "crt"] as const;
export type ShaderKind = (typeof shaderKinds)[number];

export type GameSettings = {
  shader: ShaderKind;
  /** from 0 to 100 */
  soundVolume: number;
  /** from 0 to 100 */
  musicVolume: number;
  battleAnimations: boolean;
};

const storageKey = "frontline-tactics-settings";

const defaultSettings: GameSettings = {
  shader: "pixel",
  soundVolume: 70,
  musicVolume: 30,
  battleAnimations: true,
};

let cached: { raw: string | null; settings: GameSettings } | undefined;

/** The same object as long as nothing changed, as required by useSyncExternalStore. */
export const readSettings = (): GameSettings => {
  const raw = window.localStorage.getItem(storageKey);

  if (cached === undefined || cached.raw !== raw) {
    cached = {
      raw,
      settings: {
        ...defaultSettings,
        ...(raw === null ? {} : (JSON.parse(raw) as Partial<GameSettings>)),
      },
    };
  }

  return cached.settings;
};

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // the settings may also change from another tab
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

export const updateSettings = (change: Partial<GameSettings>) => {
  window.localStorage.setItem(storageKey, JSON.stringify({ ...readSettings(), ...change }));
  listeners.forEach((listener) => listener());
};

export const useGameSettings = () =>
  useSyncExternalStore(subscribe, readSettings, () => defaultSettings);
