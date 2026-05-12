import { create } from "zustand";

import { User } from "../types/models";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isGuest: boolean;
  setSession: (payload: { access: string; refresh: string; user: User }) => void;
  setUser: (user: User) => void;
  updateTokens: (payload: { access: string; refresh: string }) => void;
  continueAsGuest: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isGuest: false,
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
        email: "demo@onedining.club",
        first_name: "Client",
        last_name: "Demo",
        full_name: "Client Demo",
        role: "customer",
      },
    }),
  logout: () => set({ accessToken: null, refreshToken: null, user: null, isGuest: false }),
}));
