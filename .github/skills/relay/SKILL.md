---
name: relay
description: "Save and resume work across machines, future sessions or interruptions with short Markdown relay records in the HQ's relay/ folder. Use to hand off, pick up, update or complete unfinished work."
argument-hint: "[create | resume | update | complete] [relay-file-or-topic]"
---

# Relay

A relay record keeps only the context another session needs to continue
safely. Use it for asynchronous or cross-machine work, not as a journal or a
source of truth. For live sessions on the same machine, use
`session-communication` instead.

Records live in the HQ: `relay/ready/` while open, `relay/completed/` when
done. They travel however the HQ syncs (git, or a synced folder such as
Dropbox or OneDrive); if this HQ syncs relays differently, a Lore line says
so.

## Create

1. Create `relay/ready/YYYY-MM-DD-<project>-<topic>.md`.
2. Record the goal, work done, decisions, authoritative paths and URLs
   (branches, PRs, docs), remaining steps, validation, blockers and any exact
   wording that matters.
3. Prefer links and paths over copied repository content.
4. If the HQ syncs through git, offer to commit and push the record.

## Resume and update

1. Read the record, resolve its project and confirm referenced artifacts
   still exist.
2. Refresh repository and external state, then continue from the first
   incomplete step.
3. Update decisions, blockers and remaining steps; replace obsolete text
   instead of appending a transcript.

## Complete

1. Record final identifiers (PRs, commits, links) and move the file to
   `relay/completed/`.
2. Offer to save durable conclusions (a design, research, a decision) to
   `corpus/` with the `corpus` skill, and costly-to-rediscover facts to Lore.

## Rules

- Repositories and source systems stay authoritative; reconcile conflicts in
  the record.
- Never include secrets, credentials, logs, caches or machine-local state.
- Pickup line for another session:
  `Use the relay skill to resume relay/ready/<file>.md.`
