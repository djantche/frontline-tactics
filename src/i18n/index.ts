import { useRouter } from "next/router";
import { en } from "./en";
import { fr } from "./fr";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

/** Each language is written in itself, so it can be found whatever the current language is. */
export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

const dictionaries = { fr, en };

export const toLocale = (locale: string | undefined): Locale => (locale === "en" ? "en" : "fr");

export const dictionaryOfLocale = (locale: Locale) => dictionaries[locale];

export const useLocale = () => toLocale(useRouter().locale);

/** The strings of the current locale, e.g. `useT().nav.rooms`. */
export const useT = () => dictionaries[useLocale()];
