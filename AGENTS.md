# {{HQ_NAME}} — my GitHub Copilot headquarters

This folder is my starting point for work across all my projects. I open
Copilot here (type `{{COMMAND}}` in any terminal) and work on any registered
project without opening Copilot inside it. Work here for HQ requests, such as
updating the registry or reviewing new Eyrie changes. Route project requests to
the owning checkout.

## How to work with me

These apply to every task and project. Edit them to match how you work.

**Talk**
- Answer the literal question first, briefly. Add detail only when needed.
- Explain designs, bugs and fixes through concrete user flows in plain language.
- Ask one major question at a time, with options and a recommendation. Decide
  small things yourself and report them.

**Ground**
- Base every claim on code, logs or data, and cite it (`file:line`, query, link).
- Look things up yourself before asking me.
- Statements from people, bots and reviewers are hypotheses until code or data
  confirms them.

**Scope**
- Make the smallest change that solves the problem; skip nonexistent or very
  rare edge cases.
- Change only what was asked; raise anything else as a question.
- Use clear names, even long ones. Add a file only for a stable responsibility.

## Route work to the owning project

1. `registry.json` is the source of truth for project aliases, paths, remotes,
   tags and descriptions. Match the request to a project; ask before editing
   only if the owner is genuinely ambiguous.
2. From the HQ, use `eyrie_activate` to bring a project into focus (it returns
   the project's skills, prompts, agents and instructions), `eyrie_peek` to
   browse one without activating, and `eyrie_search` with 1-4 short terms to
   find a workflow across projects. `/eyrie status` shows what is active.
3. Work in the project's registered checkout. Read its `AGENTS.md`, README and
   instructions before acting: the HQ routes work, the project's own
   instructions govern implementation, validation and delivery.
4. A registered project is not permission to clone or edit it. Activation
   clones a missing checkout only when the entry has a `remote` and I asked
   for that project. Never substitute another checkout for a missing one.
5. Inside a project with repo mode on (`{{COMMAND}} enable <alias>`), the
   opened checkout stays primary; HQ tools are for discovery only.

## Put files in their place

| Content | Location |
|---|---|
| Project code, tests and docs | The project's checkout or task worktree |
| Shared skills, prompts and agents | This HQ's `.github/` folders |
| Screenshots, logs, traces and other generated output | Outside any repo (for example a temp or local app-data folder) |
| One-off command inputs | The system temp folder; delete after use |

Never leave files loose in the HQ or a repository root.

## Run commands and wait

- Commands expected to finish within about a minute run synchronously.
- Builds, test suites, deployments, servers and watchers run in the background;
  rely on completion notifications rather than polling.

## Work with other sessions and agents

- Use `eyrie_session_list`, `eyrie_session_send` and `eyrie_session_inbox` only
  between independent Copilot sessions on this machine (see the
  `session-communication` skill). Subagents use native agent tools.
- Use `remote_agent` only with agents approved in `remote-agents.json`.

## Code words

- **roost / aloft:** under the `falconry` skill, plan only until I say "aloft".
- **preen:** a read-only code audit (`preen` skill); fixes wait for my go-ahead.

## Keep secrets out

Reference secrets as `${ENV_VAR}`. Never store credentials, tokens or private
keys in the HQ, generated files or MCP configuration. Don't edit global
assistant settings or change permissions on my behalf.
