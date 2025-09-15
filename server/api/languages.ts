import { defineCachedEventHandler, useStorage } from "nitropack/runtime";
import { parse } from "yaml";

export interface LanguageEntry {
  type?: "data" | "programming" | "markup" | "prose" | null;
  color?: string;
  extensions?: string[];
  aliases?: string[];
  ace_mode?: string;
  codemirror_mode?: string;
  codemirror_mime_type?: string;
  wrap?: boolean;
  filenames?: string[];
  interpreters?: string[];
  language_id?: number;
  tm_scope?: string;
  group?: string;
  fs_name?: string;
}

export interface LanguageListEntry extends LanguageEntry {
  label: string;
}

// Type for the whole languages object
export type LanguagesYml = Record<string, LanguageEntry>;

export default defineCachedEventHandler(async (_event) => {
  const file = await useStorage<string>("assets:server").getItem("languages.yml");
  const languages = parse(file!) as LanguagesYml;
  // Flatten the record into a list
  const languageList: LanguageListEntry[] = Object.entries(languages).map(([label, entry]) => ({
    label,
    ...entry,
  }));
  return languageList;
}, {
  maxAge: 60 * 60 * 24 * 3, // Cache for 3 days
});
