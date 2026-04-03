#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node scripts/validate-prompt.js <prompt.xml>');
  process.exit(0);
}

let content;
try {
  content = fs.readFileSync(filePath, 'utf-8');
} catch (err) {
  console.log(`FAIL: Cannot read file: ${filePath} — ${err.message}`);
  process.exit(1);
}

let failCount = 0;
let warnCount = 0;
let passCount = 0;

function pass(code, msg) { console.log(`PASS ${code}: ${msg}`); passCount++; }
function warn(code, msg) { console.log(`WARN ${code}: ${msg}`); warnCount++; }
function fail(code, msg) { console.log(`FAIL ${code}: ${msg}`); failCount++; }

// F1: Root element exists
const rootMatch = content.match(/<([a-zA-Z][a-zA-Z0-9-_]*)\b[^>]*>/);
if (!rootMatch) {
  fail('F1', 'Root element missing — file appears to have no XML elements');
} else {
  pass('F1', `Root element found: <${rootMatch[1]}>`);
}

// F2: <objective> present and non-empty
if (!/<objective\b[^>]*>/.test(content)) {
  fail('F2', '<objective> element missing');
} else if (/<objective\b[^>]*>\s*<\/objective>/.test(content)) {
  fail('F2', '<objective> element is empty');
} else {
  pass('F2', '<objective> present and non-empty');
}

// F3: <files> present
if (!/<files\b[^>]*>/.test(content)) {
  fail('F3', '<files> element missing');
} else {
  pass('F3', '<files> element present');
}

// F4: every <modify> and <create> has a path attribute
const modifyMatches = [...content.matchAll(/<modify\b([^>]*)>/g)];
const createMatches = [...content.matchAll(/<create\b([^>]*)>/g)];
let f4Fail = false;
let f4Occurrence = 0;
for (const m of [...modifyMatches, ...createMatches]) {
  if (!/\bpath\s*=\s*["']/.test(m[1])) {
    f4Occurrence++;
    fail('F4', `<${m[0].startsWith('<modify') ? 'modify' : 'create'}> element missing path attribute (occurrence ${f4Occurrence})`);
    f4Fail = true;
  }
}
if (!f4Fail) pass('F4', 'All <modify> and <create> elements have path attributes');

// F5: <implementation-instructions> present
if (!/<implementation-instructions\b[^>]*>/.test(content)) {
  fail('F5', '<implementation-instructions> element missing');
} else {
  pass('F5', '<implementation-instructions> element present');
}

// F6: no path appears in both <modify> and <delete>
const modifyPaths = new Set();
for (const m of modifyMatches) {
  const pathMatch = m[1].match(/\bpath\s*=\s*["']([^"']+)["']/);
  if (pathMatch) modifyPaths.add(pathMatch[1]);
}
const deleteMatches = [...content.matchAll(/<delete\b([^>]*)>/g)];
let f6Fail = false;
for (const d of deleteMatches) {
  const pathMatch = d[1].match(/\bpath\s*=\s*["']([^"']+)["']/);
  if (pathMatch && modifyPaths.has(pathMatch[1])) {
    fail('F6', `Path appears in both <modify> and <delete>: ${pathMatch[1]}`);
    f6Fail = true;
  }
}
if (!f6Fail) pass('F6', 'No path appears in both <modify> and <delete>');

// F7: all depends-on references on <step> elements point to existing step numbers
// (only checks <step> elements inside implementation-instructions, not file elements)
const stepNumbers = new Set();
for (const m of content.matchAll(/<step\b[^>]*\bnumber\s*=\s*["'](\d+)["']/g)) {
  stepNumbers.add(m[1]);
}
let f7Fail = false;
// Match only <step ...depends-on="..."> tags, not <modify>/<create> depends-on
for (const m of content.matchAll(/<step\b[^>]*\bdepends-on\s*=\s*["']([^"']+)["']/g)) {
  const refs = m[1].split(',').map(s => s.trim());
  for (const ref of refs) {
    if (ref && !stepNumbers.has(ref)) {
      fail('F7', `depends-on references non-existent step number: ${ref}`);
      f7Fail = true;
    }
  }
}
if (!f7Fail) pass('F7', 'All depends-on references point to existing step numbers');

// W1: <provided-code> — optional
if (!/<provided-code\b[^>]*>/.test(content)) {
  warn('W1', '<provided-code> section absent — acceptable if no integration code supplied');
} else {
  pass('W1', '<provided-code> section present');
}

// W2: <do-not> — recommended
if (!/<do-not\b[^>]*>/.test(content)) {
  warn('W2', '<do-not> section absent — consider adding scope constraints');
} else {
  pass('W2', '<do-not> section present');
}

// W3: <acceptance-criteria> — recommended
if (!/<acceptance-criteria\b[^>]*>/.test(content)) {
  warn('W3', '<acceptance-criteria> section absent — consider adding testable checks');
} else {
  pass('W3', '<acceptance-criteria> section present');
}

// Summary
console.log('---');
const total = failCount + warnCount + passCount;
if (failCount === 0) {
  console.log(`RESULT: ${failCount} FAIL, ${warnCount} WARN, ${passCount} PASS — validation passed`);
  process.exit(0);
} else {
  console.log(`RESULT: ${failCount} FAIL, ${warnCount} WARN, ${passCount} PASS — validation failed`);
  process.exit(1);
}
