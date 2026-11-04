import { useSyncExternalStore } from "react";

export const shaderKinds = ["pixel", "sharp", "soft", "scale2x", "xbr", "crt"] as const;
export type ShaderKind = (typeof shaderKinds)[number];

const shaderKey = "frontline-tactics-shader";
const defaultShader: ShaderKind = "pixel";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // the choice may also change from another tab
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

const readShader = (): ShaderKind => {
  const stored = window.localStorage.getItem(shaderKey);
  return shaderKinds.find((kind) => kind === stored) ?? defaultShader;
};

export const useShader = () => {
  const shader = useSyncExternalStore(subscribe, readShader, () => defaultShader);

  const setShader = (kind: ShaderKind) => {
    window.localStorage.setItem(shaderKey, kind);
    listeners.forEach((listener) => listener());
  };

  return [shader, setShader] as const;
};
