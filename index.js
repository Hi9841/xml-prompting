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

/**
 * Pinned groups: first existing path in each group wins (root vs src/, README casing).
 * Lockfiles omitted by default — they are huge and low-signal when the agent has the repo.
 */
const PINNED_GROUPS_BASE = [
  ['package.json'],
  ['src/package.json'],
  ['README.md', 'README.MD', 'readme.md', 'Readme.md', 'README.mdx'],
  ['tsconfig.json', 'src/tsconfig.json'],
  ['next.config.ts', 'src/next.config.ts'],
  ['next.config.js', 'src/next.config.js'],
  ['next.config.mjs'],
  ['vite.config.ts', 'vite.config.js'],
  // Remix
  ['remix.config.js', 'remix.config.ts'],
  // Astro
  ['astro.config.mjs', 'astro.config.ts'],
  // SvelteKit
  ['svelte.config.js'],
  // Nuxt
  ['nuxt.config.ts', 'nuxt.config.js'],
  // Testing
  ['jest.config.ts', 'jest.config.js', 'jest.config.mjs'],
  ['vitest.config.ts', 'vitest.config.js'],
  // Env example (never .env itself)
  ['.env.example']
];

const PINNED_GROUPS_LOCKFILES = [['package-lock.json'], ['pnpm-lock.yaml'], ['yarn.lock']];

const PINNED_GROUPS_PYTHON = [['settings.py'], ['pyproject.toml'], ['requirements.txt']];

const MAX_PINNED_CHARS = 24 * 1024;
const MAX_PINNED_README_CHARS = 16 * 1024;
const MAX_PINNED_LOCKFILE_CHARS = 12 * 1024;
const MAX_PINNED_PYTHON_CHARS = 8 * 1024;

function getRoleAnnotation(relPath) {
  const lower = relPath.toLowerCase();
  const base = path.basename(lower);
  if (lower.includes('/api/') && (base.startsWith('route.'))) return ' [route]';
  if (lower.includes('/components/')) return ' [component]';
  if (lower.includes('/hooks/')) return ' [hook]';
  if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/helpers/')) return ' [util]';
  if (/\.config\./.test(base)) return ' [config]';
  if (/\.(test|spec)\./.test(base)) return ' [test]';
  if (lower.includes('/types/') || base.endsWith('.d.ts')) return ' [types]';
  if (lower.includes('/scripts/')) return ' [script]';
  if (lower.includes('/migrations/')) return ' [migration]';
  return '';
}

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

function isLockfileRel(rel) {
  const base = path.basename(rel).toLowerCase();
  return (
    base === 'package-lock.json' ||
    base === 'pnpm-lock.yaml' ||
    base === 'yarn.lock' ||
    base === 'npm-shrinkwrap.json'
  );
}

function isPythonRel(rel) {
  const base = path.basename(rel).toLowerCase();
  return base === 'settings.py' || base === 'pyproject.toml' || base === 'requirements.txt';
}

function readPinnedFiles(baseDir, ig, includeLockfiles) {
  const groups = includeLockfiles
    ? [...PINNED_GROUPS_BASE, ...PINNED_GROUPS_LOCKFILES, ...PINNED_GROUPS_PYTHON]
    : [...PINNED_GROUPS_BASE, ...PINNED_GROUPS_PYTHON];
  const out = [];
  const seenRel = new Set();

  for (const candidates of groups) {
    for (const rel of candidates) {
      if (seenRel.has(rel)) continue;

      const full = path.join(baseDir, rel);
      if (!fs.existsSync(full)) continue;
      if (!fs.statSync(full).isFile()) continue;
      if (ig.ignores(rel)) continue;

      try {
        let text = fs.readFileSync(full, 'utf8');
        if (!text.trim()) continue;

        let max = MAX_PINNED_CHARS;
        if (/readme/i.test(path.basename(rel))) {
          max = MAX_PINNED_README_CHARS;
        } else if (isLockfileRel(rel)) {
          max = MAX_PINNED_LOCKFILE_CHARS;
        } else if (isPythonRel(rel)) {
          max = MAX_PINNED_PYTHON_CHARS;
        }

        if (text.length > max) {
          const originalKB = (text.length / 1024).toFixed(1);
          const capKB = (max / 1024).toFixed(1);
          text = text.slice(0, max) + `\n\n<!-- [TRUNCATED: original file is ${originalKB} KB, capped at ${capKB} KB] -->\n`;
        }
        out.push({ rel: normalizeRel(rel), text: escapeCdataBody(text) });
        seenRel.add(rel);
        break;
      } catch {
        console.log(pc.yellow(`Skipping pinned file: ${rel}`));
      }
    }
  }

  return out;
}

/**
 * Inventory + optional config snippets — for Claude Code, Cursor, Antigravity, etc.
 * The agent already has the workspace; do not paste every file.
 */
function scanCodebaseIde(baseDir, includeLockfiles) {
  const ig = loadGitignore(baseDir);
  const paths = [];
  collectInventoryPaths(baseDir, ig, paths);
  paths.sort((a, b) => a.localeCompare(b));

  const root = path.resolve(baseDir);
  const pinned = readPinnedFiles(baseDir, ig, includeLockfiles);

  console.log(pc.cyan(`\nScanning codebase at: ${root} (mode: ide — ${paths.length} paths, ${pinned.length} pinned snippets)`));

  let xml = `  <agent-environment>
    <note><![CDATA[You are running in an IDE or agent harness with the repository on disk (Claude Code, Cursor, Antigravity, etc.). Use your file tools to read and change sources. This block is a path inventory, not a full code dump. In the system-instructions section, tag names may appear with XML escapes (e.g. &lt;codebase-context&gt;); that still means the codebase-context and user-objective elements.]]></note>
    <repository-root>${escapeXml(root)}</repository-root>
    <scanned-file-count>${paths.length}</scanned-file-count>
  </agent-environment>
  <file-inventory>
`;

  for (const p of paths) {
    xml += `    <path>${escapeXml(p)}${getRoleAnnotation(p)}</path>\n`;
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
  .option('-o, --objective <text>', 'What you want the AI to plan or architect')
  .option('--objective-file <path>', 'Read objective text from a file instead of --objective (supports multi-line, max 64 KB)')
  .addOption(
    new Option('-m, --mode <mode>', 'ide = file list + config pins for IDE agents (default); full = inline every file (huge)')
      .choices(['ide', 'full'])
      .default('ide')
  )
  .option('-f, --file <name>', 'Output file name', 'ai_architect_prompt.txt')
  .option(
    '--pin-lockfiles',
    'IDE mode: include lockfiles in pinned snippets (large; default off)'
  );

program.parse();
const options = program.opts();

try {
  // Resolve objective from --objective or --objective-file
  let resolvedObjective = options.objective || '';
  if (options.objectiveFile) {
    const MAX_OBJ_FILE = 64 * 1024;
    const raw = fs.readFileSync(options.objectiveFile, 'utf-8').replace(/\r\n/g, '\n');
    if (raw.length > MAX_OBJ_FILE) {
      console.error(pc.red(`Error: --objective-file exceeds 64 KB limit.`));
      process.exitCode = 1;
      process.exit();
    }
    // If the file starts with <objective>, use verbatim; otherwise wrap it
    resolvedObjective = raw.trimStart().startsWith('<objective>') ? raw : `<objective>\n${raw.trim()}\n</objective>`;
  }
  if (!resolvedObjective) {
    console.error(pc.red('Error: either --objective or --objective-file is required.'));
    process.exitCode = 1;
    process.exit();
  }

  const codebaseText =
    options.mode === 'full'
      ? scanCodebaseFull(options.dir)
      : scanCodebaseIde(options.dir, Boolean(options.pinLockfiles));

  const finalPrompt = generatePrompt(resolvedObjective, codebaseText, options.mode);

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
