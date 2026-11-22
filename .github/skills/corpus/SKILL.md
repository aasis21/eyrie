---
name: corpus
description: "Save, update or organize full documents (designs, research, decisions, explainers) in the HQ's corpus/ folder, only when the user asks (\"save this design\"). Markdown by default; keeps corpus/index.md current. Corpus is read on demand, never auto-loaded."
argument-hint: "<save | update | organize> <document or topic>"
---

# Corpus

`corpus/` holds durable documents worth keeping whole: designs, research,
decisions and explainers. Lore keeps short facts; Corpus keeps the documents
they point to.

## When

Only on an explicit ask: "save this design", "put this research in the
corpus", "update the corpus doc on X". Never save on your own; at most offer.

## Save or update

1. Place it at `corpus/<project-or-topic>/<doc>.md` (kebab-case names). Use a
   registered project alias when the document belongs to one project.
2. Start with frontmatter:

   ```markdown
   ---
   description: One line saying what this document answers.
   ---
   ```

3. Write Markdown unless the user asks for another format. Keep it
   self-contained: context, conclusion first, evidence with links
   (`file:line`, URLs, commands), open questions. Update an existing document
   in place rather than creating a near-duplicate.
4. Add or update its line in `corpus/index.md`:
   `- [<title>](<project-or-topic>/<doc>.md) — <description>`.
5. If a Lore fact relies on it, link the document from that fact.

## Rules

- Corpus is never auto-loaded. Read a document when the task needs it;
  `corpus/index.md` is the map.
- Never store secrets, credentials, raw logs or personal data about others.
- Repositories stay authoritative for their own code and docs; link to them
  instead of copying.
