import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppLanguage = "ro" | "en";
export type ThemePreference = "system" | "light" | "dark";

type PreferencesState = {
  language: AppLanguage;
  themePreference: ThemePreference;
  hasHydrated: boolean;
  setLanguage: (language: AppLanguage) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: "ro",
      themePreference: "system",
      hasHydrated: false,
      setLanguage: (language) => set({ language }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "one-dining-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        themePreference: state.themePreference,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
