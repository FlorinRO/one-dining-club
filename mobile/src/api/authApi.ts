import { apiClient } from "./client";
import { User } from "../types/models";

export type AuthResponse = {
  access: string;
  refresh: string;
  user: User;
};

export type RegisterResponse = {
  detail: string;
  email: string;
  requires_email_verification: boolean;
  debug?: {
    uid: string;
    token: string;
    url: string;
  };
};

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<AuthResponse>("/auth/login/", { email, password });
    return data;
  },

  async socialLogin(
    provider: "google" | "facebook" | "apple",
    token: string,
    tokenType: "access_token" | "id_token" = "access_token",
  ) {
    const { data } = await apiClient.post<AuthResponse>("/auth/social/", {
      provider,
      [tokenType]: token,
    });
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  }) {
    const { data } = await apiClient.post<RegisterResponse>("/auth/register/", payload);
    return data;
  },

  async me() {
    const { data } = await apiClient.get<User>("/auth/me/");
    return data;
  },

  async updateMe(payload: Partial<Pick<User, "email" | "first_name" | "last_name" | "phone">>) {
    const { data } = await apiClient.patch<User>("/auth/me/", payload);
    return data;
  },

  async deleteMe() {
    await apiClient.delete("/auth/me/");
  },

  async forgotPassword(email: string) {
    await apiClient.post("/auth/password-reset/", { email });
  },

  async resetPassword(payload: { uid: string; token: string; new_password: string }) {
    await apiClient.post("/auth/password-reset/confirm/", payload);
  },

  async resendEmailVerification(email: string) {
    await apiClient.post("/auth/verify-email/resend/", { email });
  },

  async logout(refresh: string) {
    await apiClient.post("/auth/logout/", { refresh });
  },
};
