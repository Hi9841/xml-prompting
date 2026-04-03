# XML prompting — reference

Sources: Anthropic’s **prompt engineering** docs (clarity, examples, XML structure, long context, tools, thinking, agentic workflows). Canonical entry: [Prompt engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview). Model and migration details: [Models](https://docs.anthropic.com/en/docs/about-claude/models/overview), [Migration guide](https://docs.anthropic.com/en/docs/about-claude/models/migration-guide).

## Root and naming

- Root: **one** element, name reflects the work unit, typically **kebab-case** (e.g. `<socratica-onboarding-rework>`).
- Children: **lower-kebab-case** or **lowerCamelCase** consistently; this repo’s template uses **kebab-case** (`<flow-design>`, `<technical-requirements>`).

## Claude-oriented prompt structure

### Separate concerns with tags

Mixing instructions, data, and user input in one blob invites misreads. Use stable names such as:

- **`<instructions>`** / **`<directives>`** — What to do.
- **`<context>`** / **`<documents>`** — Background and sources.
- **`<input>`** / **`<user-objective>`** — The specific ask.

Nest when it mirrors structure (e.g. each doc in its own `<document>`).

### Long context: order

For large pasted prompts (this CLI’s output, RAG bundles, etc.):

1. Put **long sources** (codebase, documents) **early**.
2. Put the **narrow task or question last** (e.g. **`<user-objective>`** after **`<codebase-context>`**).

Multi-document pattern from Anthropic:

```xml
<documents>
  <document index="1">
    <source>annual_report_2023.pdf</source>
    <document_content>
      <!-- body or placeholder -->
    </document_content>
  </document>
  <document index="2">
    <source>competitor_analysis_q2.xlsx</source>
    <document_content>
      <!-- body or placeholder -->
    </document_content>
  </document>
</documents>

<!-- Task after documents: analyze, compare, etc. -->
```

### Quote-first grounding

For long sources, ask the model to **extract supporting quotes** into a dedicated tag (e.g. `<quotes>`) **before** the main answer (e.g. `<info>` or `<analysis>`) to anchor reasoning.

### Few-shot examples

- Use **3–5** examples when possible; vary edge cases so the model does not overfit one pattern.
- Wrap sets in **`<examples>`** and each instance in **`<example>`** so examples are not mistaken for live instructions.

### Format and tone control

- Prefer **positive** format instructions (“Your response must be valid XML with root `<report>`”) over only “don’t use markdown.”
- **Match** your own prompt’s formatting to the output style you want when steerability is weak.
- For math: Claude may default to LaTeX; if you need plain text, state that explicitly (no `$`, `\frac`, etc.).

### System role

Even one sentence in the **system** prompt (“You are a senior TypeScript engineer…”) focuses behavior. Keep product-specific identity strings there if needed (e.g. model name for apps that expose it).

## Tool use and agents (prompt snippets)

- **Action vs suggestion:** “Change this function…” / “Make these edits…” outperforms “Can you suggest changes?” if you want edits applied.
- **Parallel tools:** Independent reads/searches can be requested in parallel; dependent steps stay sequential—no placeholder args.
- **Overtriggering (4.5/4.6):** Soften old “CRITICAL / MUST use tool” wording to normal guidance unless you still see underuse.
- **Autonomy vs safety:** Explicitly require confirmation for destructive or irreversible actions (force-push, `rm -rf`, production posts).
- **Subagents:** Prefer delegation when work is parallel and isolated; prefer direct tools for simple, single-file work if subagents overfire.

## Thinking (API-level)

- **Adaptive thinking** + **effort** are the modern knobs for Opus/Sonnet 4.6-style models; extended thinking with `budget_tokens` is legacy/deprecated for migration.
- In **plain prompts** (no thinking API): you can still use **`<thinking>`** / **`<answer>`** in examples or ask for a short self-check before final output.

## Common child elements (spec XML)

| Tag | Typical use |
|-----|-------------|
| `<objective>` | Single coherent goal paragraph or short list. |
| `<platform>` | `<name>`, `<tagline>`, `<stack>`, theme, mascots, key libs. |
| `<current-onboarding>` / `<current-state>` | Files, mechanism, pain points. |
| `<files><modify|create|delete>` | Actionable path lists with `purpose` on `<file>`. |
| `<features-to-explain>` | Many `<feature>` nodes; optional attrs `id`, `tier`. |
| `<new-onboarding-flow>` / `<flow-design>` | Principles + numbered steps. |
| `<technical-requirements>` | Subsections by concern (state, a11y, data-flow). |
| `<implementation-instructions>` | `<order>`, `<style-guidelines>`, `<do-not>`. |
| `<copy-guidelines>` | Tone, voice, length, `<examples>` with `<good>` / `<bad>`. |

## Step shape (flows)

```xml
<step number="1" id="welcome">
  <name>Welcome</name>
  <type>full-screen overlay</type>
  <content>...</content>
  <user-action>...</user-action>
</step>
```

## Anti-patterns

- Multiple top-level elements (invalid as a single document).
- Giant unstructured CDATA instead of nested tags for things that should be lists.
- Vague `<file>src/...</file>` without purpose — implementers cannot prioritize.
- **`<order>`** steps that assume files or APIs that were never listed under `<files>` or `<technical-requirements>`.
- Examples embedded inline without **`<example>`** tags when they must not be treated as live data.
- Putting the **main question** above **huge** context in a single user message when Claude is used with that combined blob (prefer context → question).

## Minimal skeleton (authoring aid)

```xml
<my-feature>
  <objective>...</objective>
  <platform>
    <name>...</name>
    <stack>...</stack>
  </platform>
  <current-state>
    <summary>...</summary>
    <problems>
      <problem>...</problem>
    </problems>
  </current-state>
  <files>
    <modify>
      <file purpose="...">path/to/file</file>
    </modify>
    <create>
      <file purpose="...">path/to/new</file>
    </create>
  </files>
  <technical-requirements>
    <requirement>...</requirement>
  </technical-requirements>
  <implementation-instructions>
    <order>
      <step>1. ...</step>
    </order>
    <do-not>
      <rule>...</rule>
    </do-not>
  </implementation-instructions>
</my-feature>
```

## Relation to `templates/meta_prompt.xml`

The template is optimized for **“given codebase + objective → emit spec XML”** with a prescribed **`<expected-output-schema>`**. Hand-authored mega-prompts may use **more sections** than the minimal schema; that is intentional — the template is a floor, not a ceiling. Small **`<anthropic-prompting-alignment>`** notes in the template remind the model about XML consistency and positive format guidance.
