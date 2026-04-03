---
name: xml-prompt-generator
description: Use when the user wants to generate a structured XML prompt, create a Claude prompt template, build a prompt following Anthropic best practices, or produce an AI prompt spec from scratch. Triggers on phrases like "generate a prompt", "create an XML prompt", "make a prompt for", "write a prompt that", or "build a Claude prompt".
---

# XML Prompt Generator

## Overview

Interactively gather requirements, then emit one complete Anthropic-aligned XML prompt — ready to paste into Claude or any LLM. Follows official Claude prompt-engineering guidance: semantic XML tags, role, few-shot examples, context-before-objective ordering, and executable constraints.

## Process

### Step 1 — Gather the essentials (ask all at once, one message)

Ask the user:

1. **Objective** — What should the AI accomplish? (one plain-language sentence)
2. **Role** — What expert persona should the AI adopt? (e.g. "senior TypeScript engineer", "medical summarizer", "customer support agent")
3. **Runtime input** — What variable content will be injected at call time? (e.g. `{{CODE}}`, `{{USER_MESSAGE}}`, `{{DOCUMENT}}` — or "none")

### Step 2 — Gather depth (ask all at once, one message)

Ask:

4. **Output format** — What should the response look like? (JSON, prose, code, XML, markdown table, etc.)
5. **Constraints** — Anything the AI must NOT do? (scope limits, style rules, prohibited formats)
6. **Examples** — Do you have 1–3 examples of ideal output? (paste them or say "none")

### Step 3 — Generate the XML prompt

Emit **one well-formed XML document**. Single root element in kebab-case matching the objective (e.g. `<code-review-spec>`, `<email-drafter>`, `<sql-query-builder>`).

**Always include:**

```xml
<root-name>
  <role>You are a [persona]. [One sentence establishing expertise and tone.]</role>

  <instructions>
    <!-- Numbered steps if sequence matters; bullets for simple tasks -->
    <step>1. ...</step>
    <step>2. ...</step>
  </instructions>

  <output-format>
    <!-- Positive description: "Your response must be X containing Y." Not just "don't do Z." -->
  </output-format>

  <constraints>
    <rule>Do not ...</rule>
  </constraints>

  <!-- Variable runtime input goes LAST — long context before narrow question -->
  <input>{{PLACEHOLDER}}</input>
</root-name>
```

**Include when applicable:**

| Tag | When to use |
|-----|-------------|
| `<context>` | Background, domain knowledge, or project state the model needs |
| `<examples>` + `<example>` | 3–5 diverse few-shot examples (never mixed into instructions) |
| `<documents><document index="N">` | Multi-document long-context tasks |
| `<thinking-note>` | When you want the model to reason before answering (chain-of-thought hint) |

**Long context rule:** large documents or codebase dumps go **before** the narrow question. The `<input>` / `<user-objective>` always goes last.

### Step 4 — Quality checklist (verify before outputting)

- [ ] Single root element, kebab-case name reflecting the task
- [ ] `<role>` present and specific (not generic "helpful assistant")
- [ ] Instructions use numbered steps when order matters
- [ ] Output format described positively and precisely
- [ ] Few-shot examples wrapped in `<examples><example>` — not inline with instructions
- [ ] Runtime variable inputs at the bottom
- [ ] No contradiction between `<instructions>` and `<constraints>`
- [ ] `<context>` or `<documents>` placed before `<instructions>` if long

## Output rule

Output **only the XML document** — no markdown fences, no preamble. If the user asks for explanation, add it *after* the XML block.

## Quick reference — Anthropic best practices baked in

| Concern | Applied practice |
|---------|-----------------|
| Clarity | Specific output description + numbered steps when sequence matters |
| Context | Brief "why" for unusual rules so the model generalizes correctly |
| Examples | 3–5 examples in `<examples><example>` — diverse, relevant |
| Long inputs | Large docs/code BEFORE the narrow question/objective |
| Role | One sentence in `<role>` focuses behavior and tone |
| Format control | Positive instructions ("respond as X") not only negatives |
| Grounding | For long docs: instruct model to extract `<quotes>` before synthesis |
| Constraints | Hard limits in `<constraints><rule>` or `<do-not><rule>` |
| Thinking | Add `<thinking-note>` to guide chain-of-thought before final answer |

## Example generated output

```xml
<customer-email-drafter>
  <role>You are a senior customer-success specialist. Write warm, concise, solution-focused emails that resolve issues and build trust.</role>

  <context>Our product is a B2B SaaS project-management tool. Customers contact us via in-app support tickets. Response time target is 4 hours.</context>

  <instructions>
    <step>1. Read the customer's issue in &lt;ticket&gt;.</step>
    <step>2. Identify the root concern (bug, confusion, or feature request).</step>
    <step>3. Draft a reply that acknowledges the pain, gives a clear resolution or next step, and closes with an offer to follow up.</step>
    <step>4. Keep the email under 150 words.</step>
  </instructions>

  <output-format>Return only the email body — no subject line, no markdown. Plain text, 3–4 short paragraphs.</output-format>

  <constraints>
    <rule>Do not promise delivery dates you cannot verify.</rule>
    <rule>Do not use corporate jargon or hedging phrases like "as per my last email".</rule>
    <rule>Do not reveal internal system names or error codes to the customer.</rule>
  </constraints>

  <examples>
    <example>
      <ticket>I can't export my project to CSV anymore — it worked last week.</ticket>
      <reply>Hi Sarah, thanks for reaching out — I'm sorry you're hitting this. We pushed an update on Tuesday that temporarily broke the CSV export for projects over 500 tasks; our team shipped a fix this morning. Could you try again and let me know if it's working? If not, I'll escalate straight to engineering. Happy to help!</reply>
    </example>
  </examples>

  <ticket>{{CUSTOMER_TICKET}}</ticket>
</customer-email-drafter>
```

## See also

- `templates/meta_prompt.xml` — machine-facing schema for codebase-to-spec generation (CLI mode)
- `.cursor/skills/anthropic-xml-prompting/reference.md` — detailed tag reference and multi-document patterns
- [Anthropic prompt engineering docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
