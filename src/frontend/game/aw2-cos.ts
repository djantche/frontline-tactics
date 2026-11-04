import type { CO } from "shared/schemas/co";

/** The COs playable in the app: rooms are always created with AW2 COs. */
export const aw2COs: CO[] = [
  "andy",
  "max",
  "sami",
  "nell",
  "hachi",
  "olaf",
  "grit",
  "colin",
  "eagle",
  "drake",
  "jess",
  "kanbei",
  "sonja",
  "sensei",
  "sturm",
  "hawke",
  "adder",
  "lash",
  "flak",
];

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export const coDisplayName = (co: CO) => co.split("-").map(capitalize).join(" ");
