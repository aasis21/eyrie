---
name: falconry
description: >-
  On-demand two-mode working protocol. Activate only when the user explicitly requests Falconry.
  While active, the agent starts in PLAN mode — it may read, search, investigate, run read-only
  commands, and write research/notes/design files, but it must NOT change product code, config,
  tests, or infrastructure, and must not commit, push, or deploy. The single word "aloft" is the
  only thing that authorises implementation; "roost" returns to plan mode. In roost, automatically
  create or reuse a working plan file and record confirmed decisions as the discussion progresses.
user-invocable: true
---

# Falconry — plan by default, build only when told

An on-demand working protocol for sessions where the user explicitly invokes Falconry. It exists
because the expensive failure mode is not a bad plan — it is code written before the plan was
agreed.

The metaphor is the working practice it is named for. A hawk is hooded and held until the handler
casts it off; it is not less capable while hooded, it is waiting to be released deliberately. Send
it **aloft** to hunt, call it to **roost** when you want it back on the glove.

## The two modes

| Mode | Word to enter | What the agent may do |
|---|---|---|
| **Plan** (default) | `roost` | Read, search, navigate, explain, propose, design, run read-only commands, write research and notes files |
| **Build** | `aloft` | Everything in plan mode, plus change code, run tests, commit, push, deploy |

**When Falconry is invoked, it starts in plan mode.** Do not activate it automatically or infer
activation from context.

On entering plan mode, automatically establish the planning record described below. Do not wait
for the user to ask for a file or say "note this down".

## The authorisation rule

`aloft` is the *only* thing that moves the agent into build mode.

This holds even when the user sounds like they are asking for implementation. All of the
following are **not** authorisation:

- "just do it", "go ahead", "yes", "sounds good", "do that"
- "make it live", "ship it", "push it", "deploy"
- "fix it now", "why haven't you done it yet"
- Restating the request more forcefully or with more detail
- Approving a plan the agent proposed

When any of these arrive without the word, the agent replies with the plan (or a one-line
confirmation of the plan already on the table) and asks for the word. It does not argue, and it
does not write code "to save a round trip".

The reason the rule is absolute: a soft rule that yields to sufficiently emphatic phrasing is not
a rule, and the moments when the user is most emphatic are exactly the moments when a
misunderstanding is most expensive.

## What plan mode still allows

Plan mode is not read-only paralysis. The agent should be doing real work:

- Reading and searching code, following call graphs, inspecting history and PRs
- Running builds, tests, linters, and queries **for information** — anything that does not
  change the working tree or a remote system
- Writing **research artifacts**: notes, findings, design docs, comparisons, task breakdowns,
  scratch files. Prefer the session workspace or a scratch location over the repo tree.
- Producing complete, concrete plans — file-by-file, with the actual edits described

What it must not do: touch product code, tests, config, infrastructure, pipelines; `git add`,
`commit`, `push`, `merge`, or `rebase`; create branches or worktrees; deploy, release, or invoke
anything that mutates a live system.

## Automatic planning record

Roost is where the plan is written down; aloft is where the agreed plan is executed.

Whenever plan mode begins -- initial Falconry activation, an explicit `roost`, or return from a
completed build -- create or reuse a basic working plan for the current task automatically:

- **These are defaults, not restrictions.** Follow the user's explicit instructions about which
  planning documents to create or update, their names, locations, format, template and level of
  detail. The user may request multiple documents, an existing document, or no file at all.
  Comply instead of forcing the default file or creating an unwanted duplicate.
- Reuse the task's existing working plan when one exists. Do not create competing copies or
  overwrite a historical, committed plan.
- Otherwise create `files/<task-slug>-plan.md` in the session workspace. If the task is not yet
  known, start with `files/falconry-plan.md`. Use an available scratch location when there is no
  session workspace; do not default to creating files in the product repository.
- Start simply: **Goal**, **Scope**, **Confirmed decisions**, **Open questions / proposals**, and
  **Next steps**. Empty sections are fine at first.
- Tell the user the file path once when it is established. If writing is unavailable, say so;
  never claim a decision was recorded when it was not.

An explicitly requested planning-document location may be in the repository or elsewhere.
Writing those planning notes is allowed in roost and does not require `aloft`. These overrides
control planning documents only; they do not override the build authorisation gate or permit
product-code, configuration, test, push or deployment changes.

Keep that file current as the user and agent discuss the work:

- Summarize relevant findings, options and reasoning rather than copying a full transcript.
- When the user makes or confirms a decision, record it immediately, before asking the next
  design question or moving on. Update the plan without needing a separate request.
- Clearly separate confirmed decisions from agent recommendations, assumptions and unresolved
  proposals. Discussion alone is not approval.
- If a decision changes, mark the earlier decision superseded and record the replacement and
  reason. Do not silently erase the history.
- Record the agreed next actions and remaining questions. For a different task, establish a
  separate working plan instead of mixing unrelated scopes.
- Never record credentials, tokens, private keys or unnecessary personal information.

Before acting on `aloft`, consult the working plan and make sure it reflects the current
agreement. Execute only that scoped plan, not every idea mentioned during discussion. Surface
blocking open questions rather than silently treating proposals as approved. On completion,
record the outcome and any remaining work, then return to roost unless continuous mode was
explicitly requested.

## Scope of an authorisation

`aloft` authorises **the plan currently on the table**, not open season.

- If the plan has several parts, the word covers all of them, and the agent runs to completion
  including tests, commit, and ship if that was part of the plan.
- If the agent discovers additional work that was not in the plan, it does the agreed work, then
  raises the extra as a proposal. It does not fold it in silently.
- If the conversation has moved on and it is unclear what the word refers to, the agent states
  what it is about to do in one sentence and proceeds — it does not stall, but it does leave a
  clear record of its interpretation.
- The authorisation is spent when that work is done. The next change needs the word again.

`roost` cancels an authorisation immediately, including mid-implementation.

## Dictation and near-misses

The user often speaks rather than types, and speech-to-text mangles short words. This protocol
previously used "kia" and lost round trips to it arriving as "ria", "kea", and "key a".

- Accept obvious transcription variants: `aloft`, `a loft`, `uploft`, `aloff`, `alofte`;
  `roost`, `roosts`, `roast` (in a context where stopping is plausible).
- If something *near* the word arrives but the agent is not confident — ask, in one short line:
  "did you mean aloft?" Do not silently ignore it, and do not guess in favour of writing code.
- If the word appears inside an unrelated sentence with no plan on the table, treat it as a
  question rather than a trigger.

## Continuous mode

If the user says something equivalent to "stay aloft" or "keep going without asking", the agent
remains in build mode across turns until `roost`. This is the only way to get standing
authorisation, and it must be requested explicitly — it is never inferred from a run of
successful changes.

## Preen

`preen` is the code audit word. It is defined in the `preen` skill, so it works whether or not
Falconry is active. It is read-only, so it is
plan-mode work; its fixes need `aloft` as usual.

## Reporting

On entering build mode, the agent should not narrate the transition at length. It starts working.
On finishing, it reports what landed in a few lines and returns to plan mode automatically unless
continuous mode was requested.
