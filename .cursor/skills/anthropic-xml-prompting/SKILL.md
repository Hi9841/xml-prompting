---
name: anthropic-xml-prompting
description: Authors, refines, and executes highly structured XML prompts (single root, semantic sections, constraints) aligned with Anthropic Claude prompt-engineering guidance. Use when the user provides or requests XML-tagged prompts, wants a full XML prompt for a feature, asks for structured prompting, Claude/Opus/Sonnet/Haiku best practices, or works in the xml-prompting repo with templates/meta_prompt.xml.
---

# Anthropic-style XML prompting

## Role of the agent

When the user supplies XML structured like `<project-task>` or similar:

1. **Treat the XML as the source of truth** for scope, order, constraints, and file targets.
2. **Implement in dependency order** using `<implementation-instructions><order>` when present.
3. **Honor `<do-not>` and `<technical-requirements>`** as hard constraints unless the user explicitly overrides them.
4. **Do not invent paths**: Prefer `<files><modify>` / `<files><create>` lists; if a path is missing from the codebase, say so instead of guessing.

When the user **asks you to write** such a prompt (without XML yet), produce **one well-formed XML document** with a single root element whose name reflects the task (e.g. `<onboarding-rework>`). No markdown fences or preamble unless the user asked for explanation outside the XML.

## Alignment with Anthropic / Claude (summary)

Official depth: [Prompt engineering overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) and related pages (XML tags, long context, tools, thinking, agents).

| Topic | Practice |
|--------|-----------|
| Clarity | Specific outputs, constraints, and step order (numbered steps when sequence matters). |
| Context | Brief **why** for unusual rules (e.g. TTS, compliance) so the model generalizes. |
| Examples | Few-shot: **3–5** diverse, on-task examples; wrap in **`<examples>`** / **`<example>`** so they are not confused with instructions. |
| XML | Separate **instructions**, **context**, and **variable input** with consistent, descriptive tag names; nest when hierarchy is natural. |
| Long inputs | Put **large** material (codebase, documents) **before** the narrow **question or objective** at the end of the user payload when assembling a single prompt. This repo’s CLI emits **`<codebase-context>`** then **`<user-objective>`**. |
| Role | Set role in **system** (or a dedicated `<role>` block) for tone and expertise—one sentence already helps. |
| Format control | Prefer positive instructions (“respond in X format”) over only negatives; match prompt style to desired output style when steerability is hard. |
| Grounding | For long sources, ask for **quotes** (e.g. in `<quotes>`) before synthesis to reduce noise. |

**Claude 4.6+ notes (high level):** Last-turn **prefill** is not supported—use **structured outputs**, tools, or explicit “no preamble” instructions. **Adaptive thinking** + **effort** replace many older extended-thinking `budget_tokens` patterns; dial back “you MUST use tools” language if tools **overtrigger**. See the [migration guide](https://docs.anthropic.com/en/docs/about-claude/models/migration-guide).

## Design principles (spec XML)

| Principle | Practice |
|-----------|----------|
| One root | Exactly one top-level element wrapping everything. |
| Semantic tags | Tag names describe meaning (`<objective>`, `<technical-requirements>`), not generic wrappers like `<section1>`. |
| Progressive depth | Broad buckets first (`<platform>`, `<current-state>`), then drills (`<problems>`, `<feature>`). |
| Repeated siblings | Lists use repeated elements (`<problem>`, `<step>`, `<file>`, `<feature>`), not comma blobs. |
| Metadata on nodes | Use attributes when the same shape repeats (`<feature id="..." tier="basic">`). |
| Human navigation | XML comments between major blocks are fine; the model still parses the tags. |
| Executable constraints | Put non-negotiables in `<do-not><rule>` and `<technical-requirements>`. |

## Recommended section map (feature / rework specs)

Use what fits; omit empty sections rather than padding.

- **`<objective>`** — Outcome in plain language.
- **`<platform>`** (or **`<context>`**) — Product name, stack, theme, libraries already in use.
- **`<current-...>`** — What exists today, paths, mechanism, **`<problems>`** as repeated **`<problem>`**.
- **`<files>`** — **`<modify>`** / **`<create>`** / **`<delete>`** with **`<file purpose="...">path</file>`**.
- **`<features-to-explain>`** or **`<feature-inventory>`** — Repeated **`<feature>`** with **`<name>`**, **`<location>`**, **`<explain>`**, optional **`<tier-required>`**.
- **`<new-...-flow>`** or **`<flow-design>`** — **`<design-principles>`**, then steps as **`<step number="N" id="...">`** with **`<content>`**, **`<user-action>`**, **`<data-saved>`** if relevant.
- **`<technical-requirements>`** — Grouped requirements (state, a11y, responsive, data-flow, recovery).
- **`<implementation-instructions>`** — **`<order>`** of **`<step>`** tasks, **`<style-guidelines>`**, **`<do-not>`**.
- **`<copy-guidelines>`** (optional) — Tone, voice, length, examples **`<good>`** / **`<bad>`**.

## Quality checks before handing off XML

- [ ] Root element name matches the initiative (kebab-case).
- [ ] Every **`<file>`** has a **purpose** attribute or child explanation.
- [ ] Steps in **`<implementation-instructions><order>`** are sequenced by dependency (schema → API → hooks → UI → integration).
- [ ] **`<do-not>`** lists scope boundaries (deps, routes, layout changes).
- [ ] No contradictory requirements between **`<objective>`** and **`<do-not>`**.
- [ ] Optional: **`<examples>`** for output shape or tone, not mixed into prose instructions.

## Repo integration (xml-prompting)

This workspace includes a CLI that prepends **`templates/meta_prompt.xml`**, then **`<codebase-context>`**, then **`<user-objective>`** (long context before the ask):

```bash
npx xml-prompting --dir /path/to/project --objective "Your short objective here" -f out.txt
```

Use **`templates/meta_prompt.xml`** as the machine-facing schema when generating *architecture XML from code*. Use the richer manual sections above when the user is *authoring a full spec* without the CLI.

## Additional reference

For multi-document XML patterns, quote-grounding, and skeletons, see [reference.md](reference.md).
