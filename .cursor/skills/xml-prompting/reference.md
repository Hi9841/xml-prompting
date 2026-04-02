# xml-prompting skill — reference

## Generated file shape

```
<system-instructions> ... meta_prompt.xml ... </system-instructions>

<codebase-context mode="ide|full">
  <!-- ide: agent-environment, file-inventory, optional pinned-config-snippets -->
  <!-- full: --- FILE: rel/path --- bodies -->
</codebase-context>

<user-objective>...</user-objective>
```

## Spec XML the model should output (schema summary)

| Block | Purpose |
|--------|---------|
| `<objective>` | What to achieve |
| `<platform>` / stack | Tech context |
| `<current-state>` | What exists |
| `<files><modify|create|delete>` | Paths + `purpose` on `<file>` |
| `<feature-inventory>` | Features to touch |
| `<flow-design>` | Principles + steps |
| `<technical-requirements>` | State, data-flow, security, edge cases |
| `<implementation-instructions><order>` | Ordered tasks |
| `<do-not>` | Hard boundaries |

## IDE inventory response rules

- Resolve paths against workspace or `<repository-root>`.
- Read files before claiming behavior; never hallucinate files not in inventory or unread.
