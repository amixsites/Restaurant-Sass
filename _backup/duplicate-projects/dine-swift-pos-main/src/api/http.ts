import { readStoredSession, useAuthStore } from "@/store/auth-store";
import type { AuthSession } from "@/types/pos";

export const API_BASE_URL =
  (import.meta.env.VITE_POS_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

const parseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

export const getAuthSession = (): AuthSession | null => {
  const stateSession = useAuthStore.getState().session;
  if (stateSession) {
    return stateSession;
  }

  return readStoredSession();
};

const refreshSession = async (): Promise<AuthSession | null> => {
  const existing = getAuthSession();
  if (!existing?.refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: existing.refreshToken }),
  });

  if (!response.ok) {
    useAuthStore.getState().clearSession();
    return null;
  }

  const session = (await response.json()) as AuthSession;
  useAuthStore.getState().setSession(session);
  return session;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, retryOnUnauthorized = true, headers, ...rest } = options;

  const session = getAuthSession();
  const requestHeaders = new Headers(headers ?? {});

  if (body !== undefined) {
    requestHeaders.set("content-type", "application/json");
  }

  if (auth && session?.accessToken) {
    requestHeaders.set("authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshSession();
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (!response.ok) {
    const payload = await parseBody(response);
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "Request failed")
        : response.statusText || "Request failed";
    throw new ApiError(message, response.status, payload);
  }

  return (await parseBody(response)) as T;
}
