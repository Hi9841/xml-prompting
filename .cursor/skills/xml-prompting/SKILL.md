---
name: xml-prompting
description: Builds Anthropic-style XML planning prompts using the xml-prompting CLI (ide or full mode), interprets generated XML for implementation, and authors structured spec XML. Use when the user mentions xml-prompting, XML prompts, architecture specs, meta_prompt.xml, Claude Code or Cursor XML planning, npx xml-prompting, or wants a single pasteable XML prompt from a repo.
---

# xml-prompting (Cursor / Claude Code skill)

## What this is

The **`xml-prompting`** package generates one file containing:

1. **`templates/meta_prompt.xml`** — role, directives, and **expected output schema** (the model must reply with its own XML spec).
2. **`<codebase-context>`** — either a **file inventory** (IDE agents) or **inlined sources** (full mode).
3. **`<user-objective>`** — the task, **last** in the file.

Agents in **Claude Code, Cursor, Antigravity**, etc. should default to **IDE mode**: the repo is already on disk; do not rely on pasting 65k lines of code.

## Run the CLI

From the **target project root** (or pass `--dir`):

```bash
npx xml-prompting@latest --dir . --objective "YOUR TASK IN PLAIN ENGLISH" -f prompt.txt
```

- **`--mode ide` (default)** — path list + small pinned files (`package.json`, README, tsconfig, …). **Use this in IDEs.**
- **`--mode full`** — every text file inlined. Only for chat UIs **without** workspace access.

Global install: `npm i -g xml-prompting` then `xml-prompting --dir . --objective "..."`.

## After the user pastes the generated prompt

1. **Read `<user-objective>`** — that is the real ask.
2. If **`codebase-context mode="ide"`** — use **file tools** to explore; **`<path>`** entries are relative to **`<repository-root>`** (or the open workspace). Do not invent paths.
3. If **`mode="full"`** — treat inlined `--- FILE: ... ---` sections as ground truth for paths and snippets.
4. **Reply** with **only** the XML spec the meta template demands (single root, e.g. `<feature-rework>`), no markdown fences unless the user asked otherwise.

## When the user wants a spec *without* running the CLI

Author **one** root element, semantic nested tags (`<objective>`, `<files>`, `<technical-requirements>`, `<implementation-instructions>`, `<do-not>`). Match patterns in [reference.md](reference.md).

## Repo utilities (strict XML on full dumps)

If **`--mode full`** must be valid XML (code contains `<`), run from this repo clone:

- `node scripts/wrap-codebase-cdata.js <file>`
- `node scripts/wrap-prompt-root.js <file>` — optional single root wrapper

IDE-mode output is usually parser-safe (paths escaped; pins in CDATA).

## Anthropic alignment (short)

- Separate **instructions** vs **context** vs **task** with XML tags.
- Prefer **positive** output constraints over only “do not.”
- **3–5** few-shot examples in **`<examples>` / `<example>`** when teaching output shape.

Official overview: [Prompt engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview).
