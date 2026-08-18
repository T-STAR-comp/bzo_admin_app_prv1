"use strict";

const fs = require("node:fs");
const path = require("node:path");

const devHtml = path.join(__dirname, "..", "index.html");
const template = path.join(__dirname, "..", "index.vite.html");

if (!fs.existsSync(template)) {
  console.error("Missing index.vite.html");
  process.exit(1);
}

fs.copyFileSync(template, devHtml);
