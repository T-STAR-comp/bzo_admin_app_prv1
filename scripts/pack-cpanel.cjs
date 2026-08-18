"use strict";

const fs = require("node:fs");
const path = require("node:path");

const appName = process.argv[2] || "app";
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const outDir = path.join(root, "cpanel-upload");

if (!fs.existsSync(distDir)) {
  console.error("Run npm run build first.");
  process.exit(1);
}

const indexHtml = path.join(distDir, "index.html");
if (!fs.existsSync(indexHtml)) {
  console.error("dist/index.html is missing. Run npm run build first.");
  process.exit(1);
}

const html = fs.readFileSync(indexHtml, "utf8");
if (html.includes("/src/main.tsx") || html.includes("/src/main.js")) {
  console.error("dist/index.html is a DEV file (references /src/main). Run npm run build.");
  process.exit(1);
}

const assetRefs = [...html.matchAll(/(?:src|href)="(\/?assets\/[^"]+)"/g)].map((m) =>
  m[1].replace(/^\//, ""),
);
for (const asset of assetRefs) {
  if (!fs.existsSync(path.join(distDir, asset))) {
    console.error(`Missing bundled asset: dist/${asset}`);
    process.exit(1);
  }
}

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

const skipFiles = new Set(["index.vite.html"]);

for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
  if (skipFiles.has(entry.name)) continue;
  const from = path.join(distDir, entry.name);
  const to = path.join(outDir, entry.name);
  if (entry.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.copyFileSync(from, to);
  }
}

const htaccess = path.join(distDir, ".htaccess");
if (!fs.existsSync(htaccess)) {
  console.error("dist/.htaccess is missing. Run npm run build.");
  process.exit(1);
}

fs.writeFileSync(
  path.join(outDir, "README-UPLOAD.txt"),
  [
    `${appName} - cPanel upload package`,
    "",
    "Upload EVERYTHING inside this folder into your domain public_html",
    "(or the subdomain folder for this app).",
    "",
    "Do NOT upload:",
    "  - index.vite.html from the repo root",
    "  - any index.html that references /src/main.tsx",
    "  - the src/ folder",
    "",
    "After upload you should have:",
    "  public_html/index.html",
    "  public_html/assets/*.js",
    "  public_html/.htaccess",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Ready: ${outDir}`);
console.log("Upload the contents of cpanel-upload/ to cPanel public_html.");
