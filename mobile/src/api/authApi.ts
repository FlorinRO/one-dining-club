import { apiClient } from "./client";
import { User } from "../types/models";

export type AuthResponse = {
  access: string;
  refresh: string;
  user: User;
};

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<AuthResponse>("/auth/login/", { email, password });
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  }) {
    const { data } = await apiClient.post<User>("/auth/register/", payload);
    return data;
  },

  async me() {
    const { data } = await apiClient.get<User>("/auth/me/");
    return data;
  },

  async logout(refresh: string) {
    await apiClient.post("/auth/logout/", { refresh });
  },
};

