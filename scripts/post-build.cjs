"use strict";

const fs = require("node:fs");

const distIndex = "dist/index.vite.html";
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, "dist/index.html");
}

if (fs.existsSync("spa.htaccess")) {
  fs.copyFileSync("spa.htaccess", "dist/.htaccess");
}

// Do NOT copy dist/index.html to the project root — that breaks Vite dev (MIME errors).
