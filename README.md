# xml-prompting

## What's New in 1.5.0

Eight improvements to the generated prompt quality and CLI usability:

1. **Expanded output schema** — generated prompts now include `<provided-code>`, `<do-not>`, and `<acceptance-criteria>` sections, plus `id` attributes on design principles and `depends-on` on implementation steps.
2. **Extended framework detection** — pinned config files now include Remix, Astro, SvelteKit, Nuxt, Jest, Vitest, and `.env.example`, plus Python project files (`settings.py`, `pyproject.toml`, `requirements.txt`).
3. **Role annotations in IDE mode** — file paths in the inventory now show a role tag (`[route]`, `[component]`, `[hook]`, `[util]`, `[config]`, `[test]`, `[types]`, `[script]`, `[migration]`) based on path pattern matching.
4. **Truncation markers** — when a pinned file is cut at its size cap, a `<!-- [TRUNCATED: original file is X KB, capped at Y KB] -->` comment is appended so the agent knows the file is incomplete.
5. **`--objective-file` flag** — read long or multi-line objectives from a file instead of passing them on the command line. Accepts plain text or an `<objective>...</objective>` XML fragment.
6. **`validate-prompt.js`** — new validation script that checks generated XML prompts for structural completeness (PASS/WARN/FAIL per check, exit code 1 on any FAIL).
7. **Reference example** — `templates/examples/whisper-integration.xml` demonstrates every new schema section with realistic content.
8. **`<do-not>` and `<acceptance-criteria>` are now required** in generated prompts — either user-authored or AI-inferred from the current-state analysis.

based on [Anthropic XML Prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#structure-prompts-with-xml-tags)

A small **Node.js CLI** that emits a structured **XML prompt**: the meta template in `templates/meta_prompt.xml`, a `<codebase-context>` block, and your `<user-objective>`.

**Cursor skill:** `.cursor/skills/xml-prompting/` — tells the agent how to run the CLI, use **ide** vs **full** mode, and interpret pasted output (committed so clones and contributors get it).

## Why two modes?

**IDE agents** (Claude Code, Cursor, Antigravity, etc.) **already have the project on disk**. Pasting the entire repo (tens of thousands of lines) is redundant and wastes context.

| Mode | Use when | `<codebase-context>` contains |
|------|-----------|------------------------------|
| **`ide` (default)** | Agent runs in the repo with file tools | Path inventory + small **pinned** configs (root + `src/package.json` when present, README with case variants, tsconfig, Next/Vite config). **Lockfiles are not pinned** unless you pass `--pin-lockfiles`. |
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

**Expanded output schema (v1.5.0):** The AI is now instructed to produce `<provided-code>` (optional, for user-supplied snippets), `<do-not>` (required scope constraints), `<acceptance-criteria>` (required testable checks), design `<principles>` with `id` attributes, and `<step>` elements with `depends-on` attributes in `<implementation-instructions>`. Run `node scripts/validate-prompt.js <output.xml>` to verify structural completeness.

For **`--mode full`**, raw source may contain `<` and break strict XML; in this repo you can run `node scripts/wrap-codebase-cdata.js path/to/output.txt` to wrap the codebase section in CDATA.

## Options

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | **Required.** Project root. |
| `-o, --objective <text>` | **Required.** What to plan. |
| `-m, --mode ide\|full` | **`ide`** default; **`full`** inlines all files. |
| `-f, --file <name>` | Output path (default: `ai_architect_prompt.txt`). |
| `--pin-lockfiles` | **IDE only:** include lockfiles in pinned snippets (large; **off** by default). |

## Validation

Check that a generated prompt is structurally complete:

```bash
node scripts/validate-prompt.js ai_architect_prompt.txt
```

Or via npm:

```bash
npm run validate ai_architect_prompt.txt
```

Prints PASS / WARN / FAIL per check. Exits with code 1 if any FAIL. Warns (non-blocking) when optional sections like `<provided-code>` are absent.

## License

**Proprietary — all rights reserved.** Commercial use, redistribution for sale, or incorporation into paid products is **not** allowed without written permission from the author. See [LICENSE](LICENSE). (`package.json` uses `UNLICENSED` to reflect that this is not open source.)

For permission requests, open a discussion or contact the repo owner on GitHub.
