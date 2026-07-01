import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { User } from "../types/models";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hasHydrated: boolean;
  setSession: (payload: { access: string; refresh: string; user: User }) => void;
  setUser: (user: User | null) => void;
  updateTokens: (payload: { access: string; refresh: string }) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setSession: ({ access, refresh, user }) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
        }),
      setUser: (user) => set({ user }),
      updateTokens: ({ access, refresh }) =>
        set({
          accessToken: access,
          refreshToken: refresh,
        }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "yumzy-courier-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
