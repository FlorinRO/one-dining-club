import { create } from "zustand";

import { User } from "../types/models";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (payload: { access: string; refresh: string; user: User }) => void;
  continueAsGuest: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setSession: ({ access, refresh, user }) =>
    set({
      accessToken: access,
      refreshToken: refresh,
      user,
    }),
  continueAsGuest: () =>
    set({
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      user: {
        id: 1,
        email: "demo@onedining.club",
        first_name: "Client",
        last_name: "Demo",
        full_name: "Client Demo",
        role: "customer",
      },
    }),
  logout: () => set({ accessToken: null, refreshToken: null, user: null }),
}));

