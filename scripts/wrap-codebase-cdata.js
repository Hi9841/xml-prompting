#!/usr/bin/env node
/**
 * Wraps the first <codebase-context>...</codebase-context> inner text in CDATA
 * so TSX/HTML/code with "<" does not break XML parsers.
 * Usage: node scripts/wrap-codebase-cdata.js <file.xml>
 */
const fs = require("fs");
const p = process.argv[2];
if (!p) {
  console.error("Usage: node wrap-codebase-cdata.js <path-to-prompt.xml>");
  process.exit(1);
}
const s = fs.readFileSync(p, "utf8");
const open = "<codebase-context>";
const close = "</codebase-context>";
const i = s.indexOf(open);
const j = s.indexOf(close);
if (i === -1 || j === -1) {
  console.error("Missing <codebase-context> or </codebase-context>");
  process.exit(1);
}
const before = s.slice(0, i + open.length);
const middle = s.slice(i + open.length, j);
const after = s.slice(j);
if (middle.includes("<![CDATA[")) {
  console.log("Codebase section already contains CDATA; no change");
  process.exit(0);
}
const safe = middle.replace(/]]>/g, "]]]]><![CDATA[>");
const out = before + "\n<![CDATA[" + safe + "]]>\n" + after;
fs.writeFileSync(p, out, "utf8");
console.log("Wrapped codebase-context in CDATA");
