# Pull-request defaults

Defaults for every PR round (new PR, update or review fixes) once a push is
authorized. The project's own instructions may override any of them; say so
when they do.

## Each round

1. **Merge the latest default branch** before every push.
2. **Publish first.** Run only fast safety checks (no secrets, staged files
   in scope, pre-commit hooks), then commit and push so hosted CI starts.
   Create the PR with `gh pr create` (or the host's equivalent).
3. **Scoped local checks only.** Run tests, typecheck and lint for the touched
   code, in the background. Never run full suites locally unless asked; CI
   runs them.
4. **Follow CI to green on the latest head.** PR-ready means CI-ready, not
   approved. Read every check on the current head, not an older green run;
   queued or running is not done. Fix in-scope failures and push again;
   retry only with a stated transient reason. Report approvals and required
   reviewers separately, and never bypass them.
5. **Review comments are nudges.** See below.
6. **One PR per request**, only in repositories the user named, unless asked
   to split.
7. **Title and description** describe the change against the current default
   branch and the validation actually done; update them every round.
8. **Preen before ready.** Run the `preen` skill on the PR's own changes and
   report its fix list; apply fixes only when told.

## Review comments

Gather inline threads, review bodies, top-level comments and CI status for the
current head (`gh pr view <n> --comments`, `gh api repos/<o>/<r>/pulls/<n>/comments`).
A comment written on an older commit is stale until re-verified.

- **Verify on the current head.** Read the code and trace the real flow;
  trust neither the reviewer nor the existing code by default.
- **Fix realistic issues simply.** Skip nonexistent or very rare cases and
  behavior already on the default branch outside this diff.
- **Reply on every thread** with the outcome and evidence (`file:line`, a
  commit, a test). Resolve fixed and stale threads; leave won't-fix, deferred
  and unclear ones open for the reviewer.
- Security findings are never dismissed on your own judgment; ask.
- Never queue optional bot or AI reviews unless asked.

## Gotchas

- A merged PR can't take more commits: check `gh pr view <n> --json state`
  first; if merged, branch from a fresh default branch and open a new PR.
- A failed fetch leaves a stale `origin/<default>`; confirm the fetch printed
  new refs before branching from it.
- When the user asked for the PR first, publish before any long local build.

## Status block

End every PR turn with:

```text
PR        #<n> (<title>)  <link>   head <sha>
CI        ✅ | ❌ <failing check> | ⏳ running   (approvals: <state>)
Comments  <n> open, <n> fixed, <n> won't fix; all replied: yes|no
Next      no input needed | <one question>
```
