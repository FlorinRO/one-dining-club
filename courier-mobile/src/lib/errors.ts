import { AxiosError } from "axios";

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
      if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
        return value[0].trim();
      }
    }
  }

  return fallback;
}
