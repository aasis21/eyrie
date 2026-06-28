# Daily Standup Prompt

Target project alias: `<alias>` or `all`

Read `~\cortex\projects\registry.json` and resolve project paths.
For each target, inspect today's commits using local git history.
Also review `~\cortex\inbox.md` for open items.

Summarize:
- Yesterday/today: commits and meaningful changes.
- Today: likely next actions from `work\board.md`, registry status, and inbox.
- Blockers: dirty repos, missing remotes, failing commands, or unresolved inbox items.

Keep it concise and group output by project alias.
Do not edit files unless the user explicitly asks to update the board or inbox.
