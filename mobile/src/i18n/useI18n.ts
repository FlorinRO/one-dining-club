import { translate } from "./translations";
import { usePreferencesStore } from "../store/preferencesStore";

export function useI18n() {
  const language = usePreferencesStore((state) => state.language);

  return {
    language,
    t: (key: string, fallback?: string) => translate(language, key, fallback),
    tr: (ro: string, en: string) => (language === "en" ? en : ro),
  };
}
