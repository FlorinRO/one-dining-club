import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { User } from "../types/models";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isGuest: boolean;
  hasHydrated: boolean;
  setSession: (payload: { access: string; refresh: string; user: User }) => void;
  setUser: (user: User) => void;
  updateTokens: (payload: { access: string; refresh: string }) => void;
  continueAsGuest: () => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isGuest: false,
      hasHydrated: false,
      setSession: ({ access, refresh, user }) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
          isGuest: false,
        }),
      setUser: (user) => set({ user }),
      updateTokens: ({ access, refresh }) =>
        set({
          accessToken: access,
          refreshToken: refresh,
        }),
      continueAsGuest: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isGuest: true,
          user: {
            id: 1,
            email: "demo@yumzy.ro",
            first_name: "Client",
            last_name: "Demo",
            full_name: "Client Demo",
            role: "customer",
          },
        }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, isGuest: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "one-dining-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isGuest: state.isGuest,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
