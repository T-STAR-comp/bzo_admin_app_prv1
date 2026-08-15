"use strict";

const fs = require("node:fs");

const distIndex = "dist/index.vite.html";
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, "dist/index.html");
}

if (fs.existsSync("spa.htaccess")) {
  fs.copyFileSync("spa.htaccess", "dist/.htaccess");
}

// Apache DirectoryIndex serves root index.html — must be the production build, not dev.
if (fs.existsSync("dist/index.html")) {
  fs.copyFileSync("dist/index.html", "index.html");
}
