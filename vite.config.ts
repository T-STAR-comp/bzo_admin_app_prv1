import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

/** Dev-only fallback when using index.vite.html as the entry (no root index.html). */
function spaFallbackPlugin(htmlPath = "/index.vite.html"): Plugin {
  return {
    name: "biazo-spa-fallback",
    configureServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          const url = (req.url ?? "").split("?")[0]!;
          if (req.method !== "GET" && req.method !== "HEAD") return next();
          if (
            url.startsWith("/@") ||
            url.startsWith("/node_modules/") ||
            url.startsWith("/src/") ||
            url.startsWith("/assets/") ||
            /\.[a-zA-Z0-9]+$/.test(url)
          ) {
            return next();
          }
          if (url !== "/" && url !== htmlPath) {
            req.url = htmlPath;
          }
          next();
        });
      };
    },
  };
}

export default defineConfig({
  appType: "spa",
  plugins: [react(), tailwindcss(), spaFallbackPlugin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: { port: 3001 },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.vite.html"),
      },
    },
  },
});
