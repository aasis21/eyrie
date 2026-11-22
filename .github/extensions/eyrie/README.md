# Eyrie extension

A GitHub Copilot CLI extension that turns this folder into your HQ: it knows your
projects from `registry.json`, makes their Copilot skills, prompts, agents and
instructions discoverable from any session, lets independent sessions message each
other, and delegates to approved remote agents. It joins the session through
`@github/copilot-sdk/extension` (`joinSession`); the CLI provides the SDK, so there
is nothing to install.

## Tools

| Tool | Purpose |
|---|---|
| `eyrie_activate` | Put a project in scope and inject its asset catalog on the next turn. |
| `eyrie_deactivate` | Remove a project from scope. |
| `eyrie_peek` | List a project's assets without activating it (optional `kind`, `query`). |
| `eyrie_search` | Lexical fuzzy search over asset names and descriptions across HQ and all projects (`project`, `kind`, `top` 1-500, default 30). `deep=true` also searches file bodies. |
| `eyrie_session_list` | List independent Copilot sessions on this machine. |
| `eyrie_session_send` | Send a message to another session (`enqueue`, `steer`, `interrupt`, `notify`, `context`). |
| `eyrie_session_inbox` | Read messages delivered to this session. |
| `remote_agent` | Delegate to an approved A2A agent. See [remote-agent/README.md](remote-agent/README.md). |

Use `project="eyrie"` to peek at or search the HQ's own `.github` assets.

## Command

```
/eyrie [status]
/eyrie activate <alias>
/eyrie deactivate <alias>
/eyrie peek <alias> [kind] [query]
/eyrie search [-p|--project <alias>] [-k|--kind <kind>] [-d|--deep] [-t|--top <n>] <query>
```

Kinds: `skill`, `prompt`, `agent`, `instruction`.

## Modes

The mode is set at session start from Git identity (`git rev-parse --git-common-dir`),
so worktrees count as their repository.

- **HQ mode**: the session runs in the HQ (or a subfolder). Startup injects a registry
  summary and activates every project with `auto_activate: true`.
- **Repository mode**: the session runs anywhere else. The opened checkout stays
  primary and its own instructions apply; nothing is auto-activated. Other projects
  can still be searched, peeked at or activated.

Hooks:

- Session start: mode, registry summary and auto-activated catalogs (HQ) or a short
  repository-mode context.
- After a scope change, and then every 5 prompts: an active-scope reminder.
- Next prompt after `/eyrie activate`: the pending catalog.
- Every prompt: messages queued for this session with mode `context`.

## Lore

Optional working memory: Markdown under `<hq>/lore`. Without that folder every Lore
hook does nothing. The rules for what to save live in `AGENTS.md` "Lore (memory)".

- Session start: injects `lore/me.md`, the overview `lore/<area>/overview.md` (capped
  at about 4 KB) and a list of topic files with their frontmatter `description`. The
  area is the primary project's `area` in repository mode, and the registry's
  top-level `defaultArea` (if set) in HQ mode. If `lore/.dreams/latest.md` (the
  digest from the last "dream" run) changed since it was last shown, it is included
  once under "Dreamed since your last session"; `lore/.dreams/last-shown.txt`
  records its modification time.
- Every prompt: a one-line reminder to save corrections, repeated asks, rework and
  costly discoveries, and to end the reply with `Learned: ...`.
- After a file-read tool opens a Lore file: how long ago it was edited, and a
  reminder to check it before relying on it.

## Repository mode outside the HQ

Copilot CLI loads this extension only in sessions started in the HQ. To use it inside
a project, run `<cmd> enable <alias>` (`<cmd> disable <alias>` to stop). That sets the
project's `enabled` flag in `registry.json` and installs a small loader at
`~/.copilot/extensions/eyrie/extension.mjs`. The loader starts Eyrie only when the
session's Git repository matches an `enabled: true` project, and otherwise does
nothing.

## Lazy clone

If a project's `path` is missing and the entry has a `remote`, Eyrie runs `git clone`
into that path on an explicit `eyrie_activate`, `eyrie_peek` or project-scoped
`eyrie_search`. It never clones at startup or during a search across all projects,
and never overwrites an existing path.

## Registry fields

`registry.json` at the HQ root has a `projects` object keyed by alias. Keys starting
with `_` are ignored. An optional top-level `defaultArea` names the Lore area loaded
in HQ mode.

| Field | Meaning |
|---|---|
| `path` | Checkout path: absolute, `~/...`, or relative to the HQ. |
| `description` | One line shown in summaries. |
| `remote` | Git URL used for lazy clone. |
| `area` | Optional grouping label; selects the Lore overview (`lore/<area>/overview.md`) loaded in repository mode. |
| `tags` | Optional list of labels. |
| `status` | Optional label, for example `active` or `archived`. |
| `auto_activate` | Activate at HQ session start. |
| `enabled` | Load Eyrie in repository mode for this project. |
| `worktrees` | Optional folder where task worktrees for this project go. |

## Sessions

Each session registers in `%LOCALAPPDATA%\eyrie\sessions` (Windows) or
`~/.eyrie/sessions` (elsewhere). Messaging is only for independent sessions; subagents
use the CLI's own agent tools.

## Files

```
extension.mjs            # tools, /eyrie command, hooks
projects/                # registry, mode and scope, lazy clone, repository-mode matching
copilot-assets/          # catalog scan, search and rendering
sessions/                # cross-session messaging and metadata
lore/                    # Lore memory hooks (startup context, reminder, read freshness)
remote-agent/            # A2A client for remote_agent
```

`EYRIE_HOME` overrides the HQ location; otherwise it is the nearest parent folder of
this extension that contains `registry.json`.

## Validation

From the HQ root:

```sh
node --test ".github/extensions/eyrie/**/*.test.mjs" "scripts/*.test.mjs"
```
