declare global {
  interface Window {
    /** Ignored in production - dev-only override, must match allowlist. */
    __BIAZO_API_URL?: string;
  }
}

const ALLOWED_DEV_API_BASES = [
  "http://localhost:4000/api",
  "https://cloud-server-01.biazo.net/api",
] as const;

function normalizeApiBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed || "/api";
}

function isAllowedDevApiBase(url: string): boolean {
  const normalized = normalizeApiBase(url);
  return ALLOWED_DEV_API_BASES.some((allowed) => normalizeApiBase(allowed) === normalized);
}

/** Trusted API base for authenticated requests. Production uses build-time VITE_API_URL only. */
export function getApiBase(): string {
  const fromBuild = import.meta.env.VITE_API_URL;
  if (typeof fromBuild === "string" && fromBuild.trim() !== "") {
    return normalizeApiBase(fromBuild);
  }

  if (import.meta.env.DEV && typeof window !== "undefined" && window.__BIAZO_API_URL) {
    const runtime = normalizeApiBase(window.__BIAZO_API_URL);
    if (isAllowedDevApiBase(runtime)) {
      return runtime;
    }
  }

  return "/api";
}
