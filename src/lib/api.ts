import { getApiBase } from "./runtime-config";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getAccessToken() {
  return localStorage.getItem("biazo-admin-access");
}

function getRefreshToken() {
  return localStorage.getItem("biazo-admin-refresh");
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("biazo-admin-access", accessToken);
  localStorage.setItem("biazo-admin-refresh", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("biazo-admin-access");
  localStorage.removeItem("biazo-admin-refresh");
  sessionStorage.removeItem("biazo-admin-user");
}

export function cacheUser(user: AdminUser) {
  sessionStorage.setItem("biazo-admin-user", JSON.stringify(user));
}

export function readCachedUser(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem("biazo-admin-user");
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${getApiBase()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);

  if (!res?.ok) {
    if (res?.status === 401) clearTokens();
    return null;
  }

  const data = (await res.json()) as { accessToken: string };
  localStorage.setItem("biazo-admin-access", data.accessToken);
  return data.accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers }).catch(() => {
    throw new ApiError(0, "Cannot reach Biazo API. Ensure the server is running on port 4000.");
  });

  if (res.status === 401 && retry && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, init, false);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? "Request failed", data);
  }

  return data as T;
}

export type AdminUser = {
  id: string;
  email: string;
  username?: string | null;
  role: "admin" | "user";
  status?: string;
  firstName: string;
  lastName: string;
};

export async function adminLogin(username: string, password: string) {
  return apiFetch<{ requiresLoginCode: boolean; email: string; message: string }>(
    "/auth/admin/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    false,
  );
}

export async function adminVerifyLogin(email: string, code: string) {
  return apiFetch<{ user: AdminUser; accessToken: string; refreshToken: string }>(
    "/auth/admin/verify-login",
    { method: "POST", body: JSON.stringify({ email, code, purpose: "login" }) },
    false,
  );
}

export async function adminLogout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }
  clearTokens();
}
