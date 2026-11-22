# Task worktrees

A worktree gives a task its own folder and branch, so parallel tasks and a
dirty or busy checkout don't collide. Create it **before the first edit**.

## Where

Use the project's `worktrees` path from `registry.json` if set; otherwise a
sibling folder named `<checkout>-worktrees`. Name the folder after the task.

## Create or reuse

Run from the base checkout (works in any shell):

```text
git fetch origin
git worktree list                                  # reuse an existing one for this task
git worktree add -b <branch> <worktrees>/<task> origin/<default-branch>
git worktree add <worktrees>/<task> <branch>       # the branch already exists
```

Find the default branch with `git symbolic-ref --short refs/remotes/origin/HEAD`
(falls back to `main` or `master`). Use the user's branch name if given;
otherwise a short `<task>` name in the repository's branch style. Push the new
branch with `git push -u origin <branch>` when publishing.

Then work only inside the worktree path and report the branch, base and path.

## Clean up

Only when asked, or after the PR merges:

```text
git worktree remove <worktrees>/<task>
git branch -d <branch>
git worktree prune                                 # forget folders deleted by hand
```
