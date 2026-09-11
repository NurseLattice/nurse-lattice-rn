const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const item of ["index.html", "manifest.webmanifest", "sw.js", "version.json", "css", "js", "data"]) {
  fs.cpSync(path.join(root, item), path.join(output, item), { recursive: true });
}
console.log("NurseLattice RN Quest static build created in dist.");
