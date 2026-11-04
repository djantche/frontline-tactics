import { useRouter } from "next/router";
import { en } from "./en";
import { fr } from "./fr";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

const dictionaries = { fr, en };

export const toLocale = (locale: string | undefined): Locale => (locale === "en" ? "en" : "fr");

export const dictionaryOfLocale = (locale: Locale) => dictionaries[locale];

export const useLocale = () => toLocale(useRouter().locale);

/** The strings of the current locale, e.g. `useT().nav.rooms`. */
export const useT = () => dictionaries[useLocale()];
