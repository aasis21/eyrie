---
name: workflow-discovery
description: Find the right project or HQ skill, prompt, or agent without loading every workflow. Use when a task needs a reusable workflow or the user asks what workflows are available.
---

# Discover workflows

1. Resolve the owning project via the HQ's `registry.json`. Check its
   repository instructions for workflow locations. Use the open checkout
   rather than switching just to discover workflows.
2. Look at the owning project's configured workflow directories first, then
   this HQ's shared workflows. Common places are `.github/skills/`,
   `.github/prompts/`, `.github/agents/` and `.github/instructions/`. Use
   filenames and frontmatter names and descriptions before searching file
   bodies. When the Eyrie extension is loaded, prefer `eyrie_search` with 1-4
   short terms (add `project` to scope it, `deep` only after a miss) and
   `eyrie_peek` to browse one project's catalog.
3. For a catalog request, return names, descriptions, and paths. For a task,
   pick the best match and then read only that workflow and its required
   references. If nothing fits, follow the project's regular instructions.

Don't clone repos, activate unrelated projects, or change settings just to
search (`eyrie_peek` and project-scoped `eyrie_search` may clone a missing
checkout that has a `remote`, so use them only for the project in question).
Report unavailable checkouts separately from a search with no match.
