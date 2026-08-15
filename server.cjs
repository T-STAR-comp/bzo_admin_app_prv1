"use strict";

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 3001;
const distDir = path.join(__dirname, "dist");
const indexPath = [path.join(distDir, "index.html"), path.join(distDir, "index.vite.html")].find((p) =>
  fs.existsSync(p),
);

if (!indexPath) {
  console.error("Missing frontend build. Run `npm run build` before starting the app.");
  process.exit(1);
}

const indexTemplate = fs.readFileSync(indexPath, "utf8");
if (indexTemplate.includes("/src/main.tsx")) {
  console.error(
    "dist/index.html still references /src/main.tsx — the production build is missing or stale. Run `npm run build`.",
  );
  process.exit(1);
}

const runtimeApiUrl = process.env.API_URL || process.env.VITE_API_URL || "";
const indexHtml = runtimeApiUrl
  ? indexTemplate.replace(
      "</head>",
      `<script>window.__BIAZO_API_URL=${JSON.stringify(runtimeApiUrl)}</script></head>`,
    )
  : indexTemplate;

function sendIndex(_req, res) {
  res.type("html").send(indexHtml);
}

app.use(
  express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      } else if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=utf-8");
      } else if (filePath.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm");
      }
    },
  }),
);

app.get("/", sendIndex);
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/assets/") || req.path.includes(".")) {
    return next();
  }
  sendIndex(req, res);
});

app.listen(port, () => {
  console.log(`Biazo admin app listening on port ${port}`);
  console.log(`Serving static files from ${distDir}`);
  if (runtimeApiUrl) {
    console.log(`Runtime API URL: ${runtimeApiUrl}`);
  }
});
