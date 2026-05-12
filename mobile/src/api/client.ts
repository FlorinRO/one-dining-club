import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh/");
    const refreshToken = useAuthStore.getState().refreshToken;

    if (status !== 401 || !originalRequest || originalRequest._retry || isRefreshRequest || !refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post<{ access: string; refresh?: string }>("/auth/refresh/", { refresh: refreshToken })
          .then(({ data }) => {
            useAuthStore.getState().updateTokens({
              access: data.access,
              refresh: data.refresh ?? refreshToken,
            });
            return data.access;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const access = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  },
);
