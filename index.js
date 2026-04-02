#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const ignore = require('ignore');
const pc = require('picocolors');

// Common binary and large media extensions to ignore
const IGNORE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.mp4', '.webm', 
  '.zip', '.tar', '.gz', '.pdf', '.woff', '.woff2', '.ttf', '.eot',
  '.exe', '.dll', '.so', '.dylib', '.class'
]);

function loadGitignore(baseDir) {
  const ig = ignore();
  // Default ignores
  ig.add(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage']);
  
  const gitignorePath = path.join(baseDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const fileContents = fs.readFileSync(gitignorePath, 'utf-8');
    ig.add(fileContents);
  }
  return ig;
}

function scanCodebase(baseDir) {
  const ig = loadGitignore(baseDir);
  let codebaseContent = "";

  console.log(pc.cyan(`\nScanning codebase at: ${path.resolve(baseDir)}`));

  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const relPath = path.relative(baseDir, fullPath);

      // Skip if ignored by .gitignore
      if (ig.ignores(relPath)) continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        const ext = path.extname(item).toLowerCase();
        if (IGNORE_EXTENSIONS.has(ext)) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          codebaseContent += `\n\n--- FILE: ${relPath} ---\n\n`;
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

function generatePrompt(objective, codebaseText) {
  // Resolve template path relative to where the CLI script lives
  const templatePath = path.join(__dirname, 'templates', 'meta_prompt.xml');
  
  let metaPrompt = "";
  try {
    metaPrompt = fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    console.error(pc.red(`Error: Could not find templates/meta_prompt.xml at ${templatePath}`));
    process.exit(1);
  }

  // Long context first, specific ask last — matches Anthropic long-context guidance
  // (see .cursor/skills/anthropic-xml-prompting/reference.md).
  return `${metaPrompt}

<codebase-context>
${codebaseText}
</codebase-context>

<user-objective>
${objective}
</user-objective>
`;
}

program
  .name('xml-prompting')
  .description('Turn your codebase into a structured XML prompt for AI')
  .version('1.0.1')
  .requiredOption('-d, --dir <path>', 'Path to the target project directory')
  .requiredOption('-o, --objective <text>', 'What do you want the AI to plan/architect?')
  .option('-f, --file <name>', 'Output file name', 'ai_architect_prompt.txt');

program.parse();
const options = program.opts();

try {
  const codebaseText = scanCodebase(options.dir);
  const finalPrompt = generatePrompt(options.objective, codebaseText);

  fs.writeFileSync(options.file, finalPrompt, 'utf-8');

  const stats = fs.statSync(options.file);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);

  console.log(pc.green(`\n✅ Successfully generated AI prompt: ${options.file}`));
  console.log(pc.dim(`File size: ${fileSizeInKB} KB`));
  console.log(pc.bold(`\nFeed this file to your AI of choice to get your XML spec!\n`));
} catch (error) {
  console.error(pc.red(`\nAn error occurred: ${error.message}`));
}