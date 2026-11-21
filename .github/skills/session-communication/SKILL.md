---
name: session-communication
description: "Coordinate fully separate Copilot sessions or independent terminals running Eyrie. Discover live sessions, send work/status/context, and inspect cross-session delivery. Never use for parent-child or sibling subagents; use native agent tools instead."
---

# Session Communication

Use this only for fully independent live Copilot sessions on the same machine,
such as sessions started in separate terminals. For another machine or a future session, write a handoff note instead.

**Never use Eyrie messaging between a parent and its subagents, between sibling
subagents, or to send back to the calling session.** Use native `write_agent` for
subagent messages and `read_agent`/completion notifications for results. A child
that cannot address its parent returns its handoff or question and ends its turn;
it must not substitute Eyrie messaging or another child as a relay.

Use `eyrie_session_list` to discover independent sessions and their IDs. A subagent
`agent_id` is not an Eyrie recipient session ID, even when both are UUIDs.

Send messages with `eyrie_session_send` using an explicit mode that matches the intent:

- **Prefer `steer` for urgent or time-sensitive coordination**, including
  ownership handoffs, overlapping-write warnings and information needed before
  the recipient's next action. It guides the active turn without aborting it.
- `enqueue` for non-urgent work that can wait until the recipient's next turn.
  Do not leave an urgent handoff queued behind ongoing work.
- `interrupt` only when stopping and replacing active work is explicitly
  intended; urgency alone is not a reason to abort the recipient's work.
- `notify` for human-visible status that requires no agent action.
- `context` to attach information to the recipient's next user prompt.

## Preserve the recipient's ongoing work

Messages do not replace the recipient's current task unless they explicitly say
to pause or stop, or reveal a blocker. State any required action and include a
continuation note such as:

> Coordination message only: incorporate this into your current work, reply if
> requested, then continue. Pause or change direction only if explicitly
> requested or the information makes continuing unsafe.

## Verify delivery when it matters

Use `eyrie_session_inbox` to inspect received messages and delivery status. Reply
to the sender's session ID and set `in_reply_to` to the received message ID.

`status: published` confirms publication, not that the recipient read or
incorporated the message. For a critical handoff, set `reply_requested: true`
and require an explicit acknowledgment before claiming it was received.
If an urgent message was queued, send one coherent replacement with `steer`
and identify which earlier messages it supersedes. Avoid repeated resends and
acknowledgment-only loops.

Request a reply only when coordination requires one.