/** API base configured at build time by the active Vite environment file. */
export function getApiBase(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (typeof configured !== "string" || configured.trim() === "") {
    throw new Error("VITE_API_URL must be set before building the admin app.");
  }

  return configured.trim().replace(/\/+$/, "");
}
