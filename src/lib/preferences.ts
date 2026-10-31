export const PREFERENCES_KEY = "lumi.preferences.v1";
export const themes = ["sage", "rose", "lavender", "ochre", "blue"] as const;
export type Theme = typeof themes[number];
export type Language = "zh" | "en";
export type Preferences = { language: Language; theme: Theme };
export const defaultPreferences: Preferences = { language: "zh", theme: "sage" };
export function parsePreferences(value: string | null): Preferences {
  try {
    const data = JSON.parse(value || "null");
    return { language: data?.language === "en" ? "en" : "zh", theme: themes.includes(data?.theme) ? data.theme : "sage" };
  } catch { return { ...defaultPreferences }; }
}
