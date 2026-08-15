declare global {
  interface Window {
    __BIAZO_API_URL?: string;
  }
}

export function getApiBase(): string {
  if (typeof window !== "undefined" && window.__BIAZO_API_URL) {
    return window.__BIAZO_API_URL;
  }
  return import.meta.env.VITE_API_URL ?? "/api";
}
