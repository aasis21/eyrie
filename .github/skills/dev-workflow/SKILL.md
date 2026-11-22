---
name: dev-workflow
description: "Build, commit, push and pull-request work in any registered project: resolve the owning checkout, choose how to ship (commit to main, branch + PR, or worktree + PR) from the user's words, Lore or the repository's rules, and follow the PR defaults (push early, scoped local checks, CI green on the latest head, review comments as nudges, preen before ready, closing status block)."
argument-hint: "<project-or-intent>"
---

# Development workflow

The HQ routes the work; the project's own `AGENTS.md`, README and instructions
govern implementation, validation and delivery and override these defaults.

## Resolve the project

1. Match the request to a project in `registry.json` (alias, description,
   tags, current checkout). Ask only if the owner is genuinely ambiguous and
   the choice changes where work happens.
2. Work in its registered checkout. Read its `AGENTS.md`, README,
   CONTRIBUTING and `.github` instructions, and follow the closest
   project-owned skill or prompt (`workflow-discovery`).
3. Keep read-only work (reviews, investigation, monitoring) in the base
   checkout; it needs no branch.

## Choose how to ship

Decide once per task, using the first source that answers:

1. **The user's words for this task:** "make a PR", "just push to main".
2. **Lore:** a fact for this project, such as
   `- myblog: commit straight to main [stated <date>]` in `lore/me.md` or
   `lore/<area>/<topic>.md`.
3. **The repository's rules:** its `AGENTS.md` or CONTRIBUTING.
4. **Infer, then ask once.** A protected default branch, a fork or a
   team-owned repository means a PR; a personal, unprotected repository likely
   means main. Ask with your recommendation, and with Lore enabled save the
   answer as a project fact so you don't ask again.

| Way | When | Do |
|---|---|---|
| Commit to main | Personal repo, or the user said so | Commit, push, report the SHA. No PR. |
| Branch + PR | The default for shared repos | Branch in the checkout, then follow [PR defaults](modules/pr.md). |
| Worktree + PR | Parallel tasks, or the checkout is dirty or busy | Create a [worktree](modules/worktree.md) before the first edit, then follow [PR defaults](modules/pr.md). |

Delivery mode is a learned habit, not configuration: keep it in Lore, never
in `registry.json`.

## Rules

- Make the smallest complete change; follow the repository's formatting,
  build, test and docs conventions.
- Preserve unrelated dirty files. Stage only files this task changed, by
  path; never `git add -A` in a shared checkout.
- Use the verified remote host: `gh` for GitHub (set `GH_HOST` for an
  enterprise host); the host's own CLI or web UI elsewhere. With no remote,
  commit locally and never claim a PR exists.
- Queueing a build or deployment is not validation; read its final result.

## Finish

For PR work, end with the [status block](modules/pr.md#status-block). For a
commit to main, report the project, files changed, checks run and the pushed
SHA.
