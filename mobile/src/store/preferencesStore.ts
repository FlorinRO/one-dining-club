import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppLanguage = "ro" | "en";

type PreferencesState = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: "ro",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "one-dining-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
