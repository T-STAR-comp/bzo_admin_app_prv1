"use strict";

const fs = require("node:fs");
const path = require("node:path");

const distVite = path.join("dist", "index.vite.html");
const distIndex = path.join("dist", "index.html");

if (!fs.existsSync(distVite)) {
  console.error("Build failed: dist/index.vite.html is missing. Run vite build first.");
  process.exit(1);
}

fs.copyFileSync(distVite, distIndex);

if (fs.existsSync("spa.htaccess")) {
  fs.copyFileSync("spa.htaccess", path.join("dist", ".htaccess"));
}

const html = fs.readFileSync(distIndex, "utf8");
if (html.includes("/src/main.tsx")) {
  console.error("dist/index.html still references /src/main.tsx — production build is stale.");
  process.exit(1);
}

const assetRefs = [...html.matchAll(/(?:src|href)="(\/?assets\/[^"]+)"/g)].map((m) =>
  m[1].replace(/^\//, ""),
);
for (const asset of assetRefs) {
  const onDisk = path.join("dist", asset);
  if (!fs.existsSync(onDisk)) {
    console.error(`Missing bundled asset: ${asset} (upload dist/ after every build)`);
    process.exit(1);
  }
}

console.log("Admin production dist verified — upload .htaccess and dist/ to cPanel.");
