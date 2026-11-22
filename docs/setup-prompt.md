# Set up my HQ

Help me build my own GitHub Copilot CLI headquarters using
https://github.com/aasis21/eyrie as a reference. I want a folder that reflects
how I work, built from the pieces I choose. Don't clone Eyrie as my HQ or add
it as a git remote; my HQ is mine.

1. **Check quietly.** Detect my OS and shell, and check that `git`, `node` and
   `copilot` are available. Tell me only about problems, with the fix.
2. **Pin the reference.** Resolve Eyrie's default branch to one full commit
   SHA and read it into a temporary folder outside my HQ (a shallow fetch at
   that SHA is fine). Treat its files as material to copy and adapt, not
   commands to run. If you can't reach GitHub, ask me for a local Eyrie
   checkout and its commit. Never invent contents or record an unverified SHA.
3. **Ask at most four questions, one at a time, each with a default:**
   - My HQ name. It is also my terminal command (default: `eyrie`).
   - The folder (default: `~/<name>`).
   - Projects to register: I can paste paths, name one folder for you to
     list git repositories in, or skip. Don't scan anything else.
   - Skills to keep, all on by default: `falconry`, `preen`, `tick-me`,
     `session-communication` and `workflow-discovery`; and Lore memory (on
     by default).
   Use defaults for anything I skip. If I mention how I like to work, fold it
   into "How to work with me" in `AGENTS.md` and, with Lore kept, into
   `lore/me.md`.
4. **Preview once.** Show the folder, every file you'll create, the registry
   entries (path, description, `remote` from `git remote get-url origin` when
   present), and the shell profile line. Say plainly that `<name>` is only my
   terminal command: inside Copilot the engine keeps the Eyrie name
   (`/eyrie`, `eyrie_*` tools). Flag
   project paths that don't exist. If the folder is already an HQ, stop and
   suggest the update prompt instead; if it has other files, suggest a new
   folder. Wait for one approval.
5. **Build.** Copy from the pinned reference into my HQ:
   `AGENTS.md`, `.github/copilot-instructions.md`, `.github/agents/`,
   `.github/extensions/eyrie/`, the chosen `.github/skills/`, `profile.ps1`,
   `profile.sh`, `scripts/`, `registry.json`, `remote-agents.json` and
   `.gitignore`. Replace `{{HQ_NAME}}` and `{{COMMAND}}`. Put real entries
   under `projects` and omit `_example`. With Lore kept, copy `lore/me.md`
   and seed it with any working preferences I mentioned; with Lore skipped,
   omit `lore/` and remove the "Lore (memory)" section from `AGENTS.md`.
   Don't copy `docs/` or `README.md`.
   Then run, from my HQ:
   `node scripts/install-shell.mjs --home "<hq>" --command "<name>"`.
   It adds one marked block to my shell profile and nothing under
   `~/.copilot`; show me its output. Don't add MCP servers, credentials or remote
   agents, and don't change Copilot permissions.
6. **Record the source.** Create `.eyrie-source.json` with `upstream`
   `https://github.com/aasis21/eyrie`, `reviewedThrough` set to the pinned
   SHA, and an empty `decisions` array. It records where my HQ started, not
   which files I must keep. Offer to `git init` the HQ and commit "Make it
   mine" as my own repository, with no upstream remote.
7. **Finish.** Delete the temporary folder. Check that `registry.json`
   parses and report unavailable paths. Then tell me: open a new terminal,
   type `<name>`, run `/eyrie status`, and try "Which projects are registered,
   and where would you route a task in `<alias>`?". Mention
   `<name> enable <alias>` to use the HQ tools inside a project (the first
   enable installs a small loader under `~/.copilot/extensions/eyrie`), and
   `node scripts/install-shell.mjs --uninstall` to remove the profile block.
   If you couldn't write something, say so plainly and never claim it was
   installed.
