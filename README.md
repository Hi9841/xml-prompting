# xml-prompting

based on [Anthropic XML Prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags)

A small **Node.js CLI** that emits a structured **XML prompt**: the meta template in `templates/meta_prompt.xml`, a `<codebase-context>` block, and your `<user-objective>`.

**Cursor skill:** `.cursor/skills/xml-prompting/` — tells the agent how to run the CLI, use **ide** vs **full** mode, and interpret pasted output (committed so clones and contributors get it).

## Why two modes?

**IDE agents** (Claude Code, Cursor, Antigravity, etc.) **already have the project on disk**. Pasting the entire repo (tens of thousands of lines) is redundant and wastes context.

| Mode | Use when | `<codebase-context>` contains |
|------|-----------|------------------------------|
| **`ide` (default)** | Agent runs in the repo with file tools | Path inventory + optional small “pinned” files (`package.json`, `README.md`, `tsconfig.json`, …) |
| **`full`** | Chat UI with **no** repo access | Every text file’s contents (can be **very** large) |

## Requirements

- [Node.js](https://nodejs.org/) **18+**

## `npx` (recommended)

**IDE / agent (default):**

```bash
npx xml-prompting --dir path/to/your-project --objective "Plan session-based auth refactor"
```

**Full inline dump** (legacy / web-only workflows):

```bash
npx xml-prompting --dir path/to/your-project --objective "..." --mode full
```

Optional output path:

```bash
npx xml-prompting --dir . --objective "Add dark mode" -f prompt.txt
```

## Install globally

```bash
npm install -g xml-prompting
xml-prompting --dir . --objective "Your objective here"
```

## Output layout

1. `<system-instructions>` from `templates/meta_prompt.xml` (role, output schema).
2. `<codebase-context mode="ide"|"full">` — inventory (+ pins) or full file bodies.
3. `<user-objective>` last.

For **`--mode full`**, raw source may contain `<` and break strict XML; in this repo you can run `node scripts/wrap-codebase-cdata.js path/to/output.txt` to wrap the codebase section in CDATA.

## Options

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | **Required.** Project root. |
| `-o, --objective <text>` | **Required.** What to plan. |
| `-m, --mode ide\|full` | **`ide`** default; **`full`** inlines all files. |
| `-f, --file <name>` | Output path (default: `ai_architect_prompt.txt`). |

## License

**Proprietary — all rights reserved.** Commercial use, redistribution for sale, or incorporation into paid products is **not** allowed without written permission from the author. See [LICENSE](LICENSE). (`package.json` uses `UNLICENSED` to reflect that this is not open source.)

For permission requests, open a discussion or contact the repo owner on GitHub.
