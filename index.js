#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program, Option } = require('commander');
const ignore = require('ignore');
const pc = require('picocolors');

const IGNORE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.mp4', '.webm',
  '.zip', '.tar', '.gz', '.pdf', '.woff', '.woff2', '.ttf', '.eot',
  '.exe', '.dll', '.so', '.dylib', '.class'
]);

/** Config files to inline (small); IDE agents still have full repo on disk. */
const PINNED_RELATIVE = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'README.md',
  'README.mdx',
  'tsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.ts',
  'vite.config.js'
];

const MAX_PINNED_CHARS = 24 * 1024;

function loadGitignore(baseDir) {
  const ig = ignore();
  ig.add(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '.turbo', 'out']);

  const gitignorePath = path.join(baseDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf-8'));
  }
  return ig;
}

function normalizeRel(relPath) {
  return relPath.split(path.sep).join('/');
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCdataBody(text) {
  return text.replace(/]]>/g, ']]]]><![CDATA[>');
}

function scanCodebaseFull(baseDir) {
  const ig = loadGitignore(baseDir);
  let codebaseContent = '';

  console.log(pc.cyan(`\nScanning codebase at: ${path.resolve(baseDir)} (mode: full — all text files inlined)`));

  function walkDir(currentPath) {
    for (const item of fs.readdirSync(currentPath)) {
      const fullPath = path.join(currentPath, item);
      const relPath = path.relative(baseDir, fullPath);

      if (ig.ignores(relPath)) continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        const ext = path.extname(item).toLowerCase();
        if (IGNORE_EXTENSIONS.has(ext)) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          codebaseContent += `\n\n--- FILE: ${normalizeRel(relPath)} ---\n\n`;
          codebaseContent += content;
        } catch (err) {
          console.log(pc.yellow(`Skipping unreadable file: ${relPath}`));
        }
      }
    }
  }

  walkDir(baseDir);
  return codebaseContent;
}

function collectInventoryPaths(baseDir, ig, acc) {
  function walkDir(currentPath) {
    for (const item of fs.readdirSync(currentPath)) {
      const fullPath = path.join(currentPath, item);
      const relPath = path.relative(baseDir, fullPath);

      if (ig.ignores(relPath)) continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        const ext = path.extname(item).toLowerCase();
        if (IGNORE_EXTENSIONS.has(ext)) continue;
        acc.push(normalizeRel(relPath));
      }
    }
  }

  walkDir(baseDir);
}

function readPinnedFiles(baseDir, ig) {
  const out = [];
  const seen = new Set();

  for (const rel of PINNED_RELATIVE) {
    if (seen.has(rel)) continue;
    seen.add(rel);

    const full = path.join(baseDir, rel);
    if (!fs.existsSync(full)) continue;
    if (!fs.statSync(full).isFile()) continue;
    if (ig.ignores(rel)) continue;

    try {
      let text = fs.readFileSync(full, 'utf8');
      if (text.length > MAX_PINNED_CHARS) {
        text = text.slice(0, MAX_PINNED_CHARS) + '\n\n... [truncated by xml-prompting] ...\n';
      }
      out.push({ rel, text: escapeCdataBody(text) });
    } catch {
      console.log(pc.yellow(`Skipping pinned file: ${rel}`));
    }
  }

  return out;
}

/**
 * Inventory + optional config snippets — for Claude Code, Cursor, Antigravity, etc.
 * The agent already has the workspace; do not paste every file.
 */
function scanCodebaseIde(baseDir) {
  const ig = loadGitignore(baseDir);
  const paths = [];
  collectInventoryPaths(baseDir, ig, paths);
  paths.sort((a, b) => a.localeCompare(b));

  const root = path.resolve(baseDir);
  const pinned = readPinnedFiles(baseDir, ig);

  console.log(pc.cyan(`\nScanning codebase at: ${root} (mode: ide — ${paths.length} paths, ${pinned.length} pinned snippets)`));

  let xml = `  <agent-environment>
    <note>You are running in an IDE or agent harness with the repository on disk (Claude Code, Cursor, Antigravity, etc.). Use your file tools to read and change sources. This block is a path inventory, not a full code dump.</note>
    <repository-root>${escapeXml(root)}</repository-root>
    <scanned-file-count>${paths.length}</scanned-file-count>
  </agent-environment>
  <file-inventory>
`;

  for (const p of paths) {
    xml += `    <path>${escapeXml(p)}</path>\n`;
  }

  xml += '  </file-inventory>\n';

  if (pinned.length) {
    xml += '  <pinned-config-snippets>\n';
    for (const { rel, text } of pinned) {
      xml += `    <file path="${escapeXml(rel)}"><![CDATA[${text}]]></file>\n`;
    }
    xml += '  </pinned-config-snippets>\n';
  }

  return xml;
}

function generatePrompt(objective, codebaseText, mode) {
  const templatePath = path.join(__dirname, 'templates', 'meta_prompt.xml');

  let metaPrompt = '';
  try {
    metaPrompt = fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    console.error(pc.red(`Error: Could not find templates/meta_prompt.xml at ${templatePath}`));
    process.exit(1);
  }

  const modeAttr = mode === 'ide' ? 'ide' : 'full';

  return `${metaPrompt}

<codebase-context mode="${modeAttr}">
${codebaseText}
</codebase-context>

<user-objective>
${objective}
</user-objective>
`;
}

const pkgPath = path.join(__dirname, 'package.json');
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;

program
  .name('xml-prompting')
  .description('Build an XML-structured prompt for AI (IDE agents or full repo paste)')
  .version(pkgVersion)
  .requiredOption('-d, --dir <path>', 'Path to the target project directory')
  .requiredOption('-o, --objective <text>', 'What you want the AI to plan or architect')
  .addOption(
    new Option('-m, --mode <mode>', 'ide = file list + config pins for IDE agents (default); full = inline every file (huge)')
      .choices(['ide', 'full'])
      .default('ide')
  )
  .option('-f, --file <name>', 'Output file name', 'ai_architect_prompt.txt');

program.parse();
const options = program.opts();

try {
  const codebaseText =
    options.mode === 'full' ? scanCodebaseFull(options.dir) : scanCodebaseIde(options.dir);

  const finalPrompt = generatePrompt(options.objective, codebaseText, options.mode);

  fs.writeFileSync(options.file, finalPrompt, 'utf-8');

  const stats = fs.statSync(options.file);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);

  console.log(pc.green(`\n✅ Successfully generated AI prompt: ${options.file}`));
  console.log(pc.dim(`File size: ${fileSizeInKB} KB`));
  if (options.mode === 'full') {
    console.log(
      pc.bold(
        `\nFull mode: if you need strict XML, wrap <codebase-context> in CDATA (see repo scripts/wrap-codebase-cdata.js).\n`
      )
    );
  } else {
    console.log(pc.bold(`\nIDE mode: paste into your agent; use file tools to read the repo on disk.\n`));
  }
} catch (error) {
  console.error(pc.red(`\nAn error occurred: ${error.message}`));
  process.exitCode = 1;
}
