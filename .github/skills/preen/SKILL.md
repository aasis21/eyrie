---
name: preen
description: The "preen" code audit for any project - a read-only review of a PR's changes or named code (summary, flow, files, names, readability, tests, complexity) with a fix list. Runs on the code word "preen" at any stage and before a PR is called ready.
---

# Preen: code audit

**Preen** (a falcon tidying its feathers) is a read-only audit of a PR's changes, or of code the
user names. Run it when the user says "preen" at any stage: design, mid-implementation, before
ready, or while reviewing someone else's PR. Also run it on your own PR's changes before calling
the PR ready.

## Rules

- **Read-only.** Fixes wait for the user's go-ahead ("aloft" under Falconry, or "do"); then they
  are batched, not made mid-pass.
- **Against the base.** Read the actual base branch and the changed files
  (`git diff --name-status --stat origin/<base>...HEAD`), not the description's claims. Report
  pre-existing code only where the change touches it, and check that a file or name is new before
  proposing to rename or move it.
- **Evidence.** Ground each finding in the repository's existing pattern (`file:line`) and say
  whether the fix changes the API contract or behavior.
- **One table per pass**; skip passes that find nothing. When reviewing together, go one pass at
  a time and record each decision.
- **Dictation.** Treat `prene`, `preene` and `pre-en` as "preen" when an audit is plausible.

## Passes

1. **Summary.** In 5-10 lines: what changes for the user or caller, the main mechanism, and what
   is out of scope. Flag description claims the diff does not support.
2. **Flow.** Trace each user journey the change touches end to end (create, view, act, delete)
   as numbered steps; each names the actor, the component and `file:line`, what is read or
   written and where, and which check runs (authorization, validation, limits, trust boundary).
   - Map every changed file to a step. A file on no step is a removal candidate; a layer that
     only forwards a call is a merge candidate.
   - Note repeated work on one step (the same read twice, the same check in two places).
   - Compare with the nearest existing feature's flow and name each deviation.
   - Show every proposed removal, merge or rename as the flow before and after, plus what does
     not change and what it costs.
3. **Files.** Every touched file grouped by concern (API, core logic, storage, UI, tests, docs),
   marked added, edited, deleted or renamed, with line counts and totals. Each new file owns a
   stable responsibility and sits where the repository puts that kind of code. Merge tiny files,
   single-use helpers and split test files; keep a split only for a real boundary (project, host,
   process, shared fixture). No numeric target.
4. **Names.** Every new file, type, method, parameter, variable, constant, setting, route and
   user-facing string:
   - states its intent without reading the body;
   - describes the generic behavior, not one caller or scenario;
   - uses the repository's word for the concept, one word per concept;
   - reads clearly even when long (never trade clarity for brevity);
   - is not left stale by a behavior change (for example an error message naming the old action).

   Report `current -> proposed, why` only where a better name exists.
5. **Readability.** Methods read top-down and show their intent; long conditions become named
   checks; no duplicated blocks or helpers; boolean parameters and hidden side effects are named
   or removed; logic sits in the layer the repository uses for it.
6. **Tests.** A few tests through the real entry point (controller, service, pipeline) over many
   helper tests. Flag test explosion: near-duplicates, tests that restate the implementation, test
   constants, defaults, trivial accessors or framework behavior, and one file per helper or review
   comment. Check the promised guarantee is asserted, including failure and limit cases. Propose
   consolidation into the owning suite without losing a real assertion.
7. **Complexity.** For every new abstraction, interface, option, flag, cache, retry or extension
   point ask: **what observable requirement breaks if it is removed?** Flag one-caller
   frameworks, configurability nobody asked for, speculative extension points, duplicated state,
   parallel paths and back-compat for unreleased behavior. Where the project has production data
   (usage, telemetry), check the claim against it.

## Report

The pass tables, then one fix list tagged **Fix**, **Simplify**, **Rename**, **Keep** or
**Defer**, each with location, smallest fix and contract or behavior impact. **Keep** items carry
the evidence for keeping them.
