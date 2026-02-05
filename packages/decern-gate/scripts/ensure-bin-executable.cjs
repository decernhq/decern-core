const fs = require("fs");
const path = require("path");

const binPath = path.join(__dirname, "..", "dist", "bin.js");
if (!fs.existsSync(binPath)) {
  console.warn("decern-gate: dist/bin.js not found, skip ensure-bin-executable");
  process.exit(0);
}

let content = fs.readFileSync(binPath, "utf8");
if (!content.startsWith("#!")) {
  content = "#!/usr/bin/env node\n" + content;
  fs.writeFileSync(binPath, content);
}
fs.chmodSync(binPath, 0o755);
