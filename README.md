# xml-prompting

based on https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags

A small **Node.js CLI** that scans a project directory (respecting `.gitignore`), wraps the result in **`templates/meta_prompt.xml`**, and writes a single text file you can paste into any AI to get back a structured **XML implementation spec**.

## Requirements

- [Node.js](https://nodejs.org/) **18+**

## Use without installing (`npx`)

From any directory:

```bash
npx xml-prompting --dir path/to/your-project --objective "Describe what you want the AI to plan"
```

Example using the current folder:

```bash
npx xml-prompting --dir . --objective "Add dark mode to the settings page"
```

Optional: write to a specific file (default: `ai_architect_prompt.txt`):

```bash
npx xml-prompting --dir . --objective "Refactor auth to sessions" -f prompt.txt
```

## Install globally

```bash
npm install -g xml-prompting
xml-prompting --dir . --objective "Your objective here"
```

## Use from a clone (contributors)

```bash
git clone https://github.com/Hi9841/xml-prompting.git
cd xml-prompting
npm install
node index.js --dir ../my-app --objective "Plan feature X"
# or
npm start -- --dir ../my-app --objective "Plan feature X"
```

## What gets generated

The output file contains:

1. The **meta prompt** from `templates/meta_prompt.xml` (role, directives, expected output schema; aligned with [Anthropic prompt engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) ideas like XML structure and clear constraints).
2. A **`<codebase-context>`** block with file paths and contents (binaries and large media types are skipped).
3. Your **`<user-objective>`** text **last** (long context before the specific ask, per Anthropic long-context guidance).

Feed that file to your model of choice.

## Options

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | **Required.** Project root to scan. |
| `-o, --objective <text>` | **Required.** What you want planned or specified. |
| `-f, --file <name>` | Output filename (default: `ai_architect_prompt.txt`). |

## License

MIT
