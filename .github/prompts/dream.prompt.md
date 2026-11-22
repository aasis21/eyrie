---
description: "Dream: learn from recent Copilot CLI sessions into Lore — distill corrections, repeated asks, rework and decisions, promote repeated learnings, and leave a short undoable digest in lore/.dreams/latest.md."
---

# Dream

Learn how I work from my recent Copilot CLI sessions so I never have to repeat
myself. Run from the HQ folder, by hand ("dream") or on a schedule.

## Rules

- **Read-only outside the HQ.** Session history, project checkouts and
  everything else are read, never written. Inside the HQ, write only `lore/`,
  `AGENTS.md` "How to work with me", and skills under `.github/skills/`.
  Never edit `registry.json`, scripts, extension code, `relay/` or `corpus/`.
- **Never delete my content silently.** Rewrite a wrong or stale fact in
  place; any removal is listed in the digest.
- **Never save** secrets, credentials, raw logs, personal data about others,
  opinions about people, or what a skill, `AGENTS.md` or a repository's
  instructions already say.

## 1. Initialize missing core files

If `lore/` exists but `lore/me.md` is missing, or a `lore/<area>/overview.md`
is missing for an `area` used in `registry.json`, create only those files from
what the sessions and the registered projects' `AGENTS.md`/README show. Never
overwrite or rename an existing file. If `lore/` itself is missing, stop:
Lore is turned off for this HQ.

## 2. Find the sessions

Locate the local Copilot CLI session history in Copilot's config folder
(usually `~/.copilot`): a session-store database (SQLite, open it read-only)
and/or per-session folders under `session-state/` holding event logs. Use a
session-history query tool instead if Copilot provides one. Don't assume an
OS-specific path; check what exists.

Read sessions since the last dream (the modification time of
`lore/.dreams/latest.md`), or the last day if there is none. Skip earlier
dream runs. Read all of the window, in chunks if large; prefer what I said
over what the agent replied.

## 3. Distill into Lore

Follow `AGENTS.md` "Lore (memory)". Look for corrections, frustration, asks I
repeated, my rework of agent output (names, wording, structure), decisions,
and discoveries that cost real effort. Ignore one-off task details.

- Merge into existing files; tag facts `[verified <date>]` or
  `[stated <date>]` with their source; keep files short.
- How I work → `lore/me.md`; project-group facts → `lore/<area>/<topic>.md`
  with a `description` line in frontmatter.

## 4. Promote what repeats

- A correction seen in two or more sessions → `lore/me.md`.
- A rule that holds for every task → `AGENTS.md` "How to work with me".
- A procedure repeated three times, or a skill I keep correcting → a small,
  surgical edit to that skill.

Change as little text as possible.

## 5. Record and report

If the HQ is a git repository, commit each change on its own with a message
starting `dream:`, staging only the files you changed, so any item can be
reverted alone. Without git, note the previous text of each change in the
digest so it can be restored.

Last, write `lore/.dreams/latest.md`: at most 8 bullets,
`- <file>: <what changed>` (prefix removals with "removed"). If nothing was
worth learning, write `- Nothing new.` Eyrie shows this digest once at the
next session start, and I can say "undo <item>" to revert any bullet.
