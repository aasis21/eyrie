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
   `.github/prompts/`, and `.github/agents/`. Use filenames and frontmatter
   names and descriptions before searching file bodies.
3. For a catalog request, return names, descriptions, and paths. For a task,
   pick the best match and then read only that workflow and its required
   references. If nothing fits, follow the project's regular instructions.

Don't clone repos, activate unrelated projects, or change settings just to
search. Report unavailable checkouts separately from a search with no match.
