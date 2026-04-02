#!/usr/bin/env node
const fs = require("fs");
const p = process.argv[2];
if (!p) {
  console.error("Usage: node wrap-prompt-root.js <prompt.xml>");
  process.exit(1);
}
let s = fs.readFileSync(p, "utf8");
if (s.includes("<prompt-bundle>")) {
  console.log("Already wrapped");
  process.exit(0);
}
s =
  '<?xml version="1.0" encoding="UTF-8"?>\n<prompt-bundle>\n' +
  s.trimStart() +
  "\n</prompt-bundle>\n";
fs.writeFileSync(p, s, "utf8");
console.log("Wrapped in <prompt-bundle>");
