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

  async forgotPassword(email: string, flow?: "courier") {
    await apiClient.post("/auth/password-reset/", flow ? { email, flow } : { email });
  },

  async me() {
    const { data } = await apiClient.get<User>("/auth/me/");
    return data;
  },

  async updateMe(payload: Partial<Pick<User, "first_name" | "last_name" | "phone">>) {
    const { data } = await apiClient.patch<User>("/auth/me/", payload);
    return data;
  },

  async logout(refresh: string) {
    await apiClient.post("/auth/logout/", { refresh });
  },
};
