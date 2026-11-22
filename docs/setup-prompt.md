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
   - Skills and extras. Skills, all on by default: `falconry`, `preen`,
     `tick-me`, `session-communication`, `workflow-discovery`,
     `dev-workflow`, `relay`, `corpus`, `web-capture` and `product-video`.
     Lore memory with dreaming (on by default). Two opt-ins, off by default:
     an overnight dream schedule (needs Lore), and the Clueso MCP server
     (only if `product-video` is kept).
   Use defaults for anything I skip. If I mention how I like to work, fold it
   into "How to work with me" in `AGENTS.md` and, with Lore kept, into
   `lore/me.md`.
4. **Preview once.** Show the folder, every file you'll create, the registry
   entries (path, description, `remote` from `git remote get-url origin` when
   present), the `UPSTREAM.md` adoption summary, the shell profile line, and
   any opt-ins I chose (the schedule's exact command and time, the MCP entry).
   Say plainly that `<name>` is only my
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
   and `.github/prompts/dream.prompt.md`, and seed `lore/me.md` with any
   working preferences I mentioned; with Lore skipped, omit both, and remove
   the "Lore (memory)" section and the "dream" code word from `AGENTS.md`.
   With `relay` kept, copy `relay/` (its `ready/` and `completed/` folders);
   with `corpus` kept, copy `corpus/index.md`. Remove rows and mentions in
   `AGENTS.md` for anything I skipped.
   Don't copy `docs/` or `README.md`.
   Then run, from my HQ:
   `node scripts/install-shell.mjs --home "<hq>" --command "<name>"`.
   It adds one marked block to my shell profile and nothing under
   `~/.copilot`; show me its output. Don't add credentials or remote agents,
   don't change Copilot permissions, and add MCP servers only as below.
   - **Clueso (opt-in):** create or extend `<hq>/mcp-config.json` (the HQ's
     overlay; my command loads it) with
     `{"mcpServers": {"clueso": {"type": "http", "url": "https://connect.clueso.io/mcp"}}}`.
     I sign in on first use; store no token.
   - **Overnight dream (opt-in):** schedule a daily run (default 03:00 local)
     that starts in my HQ folder and runs
     `copilot -p "Follow .github/prompts/dream.prompt.md" --no-ask-user --allow-tool=write --allow-tool="shell(git:*)" --deny-tool="shell(git push)" --add-dir "<copilot config folder>"`,
     using the absolute path to `copilot`. Keep allow flags to that minimum,
     adding only a read-only tool for the session database if needed (such as
     `shell(sqlite3:*)`). Per OS:
     - Windows: `schtasks /Create /SC DAILY /ST 03:00 /TN "<name>-dream" /TR "<shell> -NoProfile -Command \"Set-Location '<hq>'; <copilot command>\""`;
       remove with `schtasks /Delete /TN "<name>-dream" /F`.
     - Linux: one `crontab` line, `0 3 * * * cd "<hq>" && <copilot command> >/dev/null 2>&1`;
       remove that line with `crontab -e`.
     - macOS: a LaunchAgent `~/Library/LaunchAgents/<name>.dream.plist` with
       `StartCalendarInterval` hour 3 and `ProgramArguments` running
       `/bin/zsh -lc 'cd "<hq>" && <copilot command>'`, loaded with
       `launchctl bootstrap gui/$(id -u) <plist>`; remove with
       `launchctl bootout gui/$(id -u) <plist>` and delete the file.
6. **Record what I chose.** Create `UPSTREAM.md` in my HQ root, even if Lore
   is off. It is one adoption log, not a JSON file plus a separate summary.
   Use YAML frontmatter for `description`, `upstream`
   `https://github.com/aasis21/eyrie`, and `reviewedThrough` (the verified full
   SHA). Below it, add a dated setup entry with that full revision and each
   meaningful choice: stable source-relative `change`, `action` (`adopt`,
   `adapt`, or `skip`), local destination or result, and why. Include optional
   pieces I declined; only call something adopted once it was actually built.
   Start with this shape, replacing the date and SHA placeholders:

   ```markdown
   ---
   description: Upstream source and adoption history for {{HQ_NAME}}.
   upstream: https://github.com/aasis21/eyrie
   reviewedThrough: "{{UPSTREAM_SHA}}"
   ---
   # Upstream adoption log

   ## {{DATE}} - Setup
   Revision: `{{UPSTREAM_SHA}}`

   | Change | Action | Local destination / result | Reason |
   |---|---|---|---|
   | `.github/extensions/eyrie` | adopt | `.github/extensions/eyrie` | Selected for project discovery. |
   ```

   Keep source state only in frontmatter and decisions only in the history;
   don't duplicate them in a `decisions` array. Preserve any intentional local
   name mapping as optional `localRename` metadata. `AGENTS.md` points to this
   record; if I have a Lore overview for this HQ, add a pointer there too, not
   another copy of the history. This is provenance, not a requirement to keep
   the HQ identical to Eyrie. Offer to `git init` the HQ and commit "Make it
   mine" as my own repository, with no upstream remote.
7. **Finish.** Delete the temporary folder. Check that `registry.json`
   parses and report unavailable paths. Then tell me: open a new terminal,
   type `<name>`, run `/eyrie status`, and try "Which projects are registered,
   and where would you route a task in `<alias>`?". Mention
   `<name> enable <alias>` to use the HQ tools inside a project (the first
   enable installs a small loader under `~/.copilot/extensions/eyrie`), and
   `node scripts/install-shell.mjs --uninstall` to remove the profile block.
   With Lore kept, mention saying "dream" to learn from recent sessions, and
   how to remove the dream schedule if I added one.
   If you couldn't write something, say so plainly and never claim it was
   installed.
