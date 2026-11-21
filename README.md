# Eyrie

**My personal GitHub Copilot headquarters. Make it yours.**

An eyrie is a falcon's nest, built high so it can see everything below. Eyrie
gives you the same for your projects: type one command in any terminal and
GitHub Copilot CLI opens in your HQ, where it can find, read and work on every
project you've registered. You no longer open Copilot inside each repository
or re-explain how you work.

```text
$ jarvis
> which of my projects owns the login page, and what skills does it have?
> activate website and fix the flaky signup test
```

Eyrie is a reference, not something you clone. Copilot reads it and builds
your own HQ with your name, your projects and your rules.

## Make it yours

Open `copilot` anywhere and paste:

> Set up my HQ using https://github.com/aasis21/eyrie. Read
> `docs/setup-prompt.md` in that repo and follow it.

Copilot asks at most four questions, each with a default (name, folder,
projects, skills), shows one preview, and builds only after you approve. It
adds a single marked block to your shell profile so your name becomes a
command. Then open a new terminal, type your command and run `/eyrie status`.

## Get new things

Open your HQ and paste:

> Review my HQ for updates from https://github.com/aasis21/eyrie. Read
> `docs/update-prompt.md` in that repo and follow it. Don't edit anything
> until I approve.

Copilot compares what changed in Eyrie since your last review with your tuned
HQ and recommends, change by change, whether to **adopt**, **adapt** or
**skip** it. Your name, projects, rules and custom workflows stay yours.

## What you get

| Piece | What it does |
|---|---|
| Your command | `<name>` opens Copilot in your HQ from any terminal. `<name> enable <alias>` lets Copilot use HQ tools inside that project too. |
| `registry.json` | Your projects: path, description, `remote`, tags, `auto_activate`, `enabled`, `worktrees`. |
| `AGENTS.md` | How you like Copilot to work (talk, ground claims, scope), plus routing rules. |
| [Eyrie extension](.github/extensions/eyrie/README.md) | `eyrie_activate`, `eyrie_deactivate`, `eyrie_peek` and `eyrie_search` bring any project's skills, prompts, agents and instructions into your HQ session. `/eyrie status` shows what's active. |
| Session messaging | `eyrie_session_list`, `eyrie_session_send` and `eyrie_session_inbox` let separate Copilot sessions on your machine coordinate. |
| `remote_agent` | Delegates to remote agents you approve in `remote-agents.json`, over A2A. Tokens come from an environment variable or a local command, never from the file. |

### Skills

| Skill | Use it for |
|---|---|
| [falconry](.github/skills/falconry/SKILL.md) | Plan first. Copilot only researches and plans until you say **aloft**; **roost** returns to planning. |
| [preen](.github/skills/preen/SKILL.md) | A read-only code audit of a PR or named code: flow, files, names, readability, tests, complexity. |
| [tick-me](.github/skills/tick-me/SKILL.md) | Recurring nudges that keep Copilot working on the current task until it's done. |
| [session-communication](.github/skills/session-communication/SKILL.md) | How to coordinate safely between independent Copilot sessions. |
| [workflow-discovery](.github/skills/workflow-discovery/SKILL.md) | Find the right skill, prompt or agent without loading all of them. |

## How it stays safe

- Nothing is installed without one explicit approval, and the profile block
  is removed with `node scripts/install-shell.mjs --uninstall`.
- Repo mode is off for every project until you run `<name> enable <alias>`.
- A missing project is cloned only when you ask for it and it has a `remote`.
- No credentials are stored. Copilot permissions and models are left alone.

## Requirements

GitHub Copilot CLI, git and Node.js. Works with PowerShell, bash and zsh on
Windows, macOS and Linux.

## Develop Eyrie

```text
node --test (all *.test.mjs files under .github/extensions/eyrie and scripts)
```

See the [extension README](.github/extensions/eyrie/README.md) for the exact
command and module layout.
