# XML Prompting 🏗️

A Python CLI tool that transforms your entire codebase into a highly structured, XML-formatted prompt. It analyzes your project's context, files, and dependencies to generate comprehensive guidelines, rules, and implementation steps for any new feature.

## Features
- **Smart Scanning**: Traverses your codebase while respecting `.gitignore` to avoid bloating the context with `node_modules`, `venv`, or build files.
- **XML Meta-Prompting**: Instructs the AI to output a strict XML architecture document (like `<feature-rework>`).
- **Universal Compatibility**: Generates a `.txt` file that you can paste into *any* AI (Gemini, Claude, ChatGPT) or use via API.

## Installation
```bash
pip install -r requirements.txt
