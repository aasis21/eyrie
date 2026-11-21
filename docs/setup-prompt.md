# Set up my HQ

Help me create my own project HQ using
https://github.com/aasis21/cortex-hq as a starting point. I want a local folder
that reflects how I work, not a clone of the upstream repository.

1. Read the upstream `README.md`, `AGENTS.md`, `registry.json`, and
   `.github/skills/workflow-discovery/SKILL.md` as reference material. Use one
   verified upstream commit for the templates, and remember its full SHA. If
   GitHub access isn't available, ask for a separate local Cortex checkout or
   for the reference files with their source commit. Don't invent contents or
   record an unverified revision as a baseline.
2. Ask me one question at a time about what you don't already know: which
   assistant(s) I use (Copilot CLI, Claude Code, or both), my HQ name and folder,
   which existing project folders to register, and what working preferences
   should go in the HQ instructions. Let me start with no projects or skip
   anything optional. Don't scan my home directory or clone projects for me.
3. Before writing, show the resolved destination, the project entries, the
   preferences you'll encode, and the files you'll create. Check for collisions
   first. If it's already an HQ, use the update prompt instead. If other files
   exist there, suggest a new folder. Report project paths that don't exist or
   are outside your access before asking for approval. Wait for my approval.
4. Create only the approved files. Use `AGENTS.md` for the shared, personalized
   routing rules and `registry.json` for project aliases, paths, and short
   descriptions. Replace `{{HQ_NAME}}` with my chosen name, use the `projects`
   object for real entries, and omit the `_example` entry. Resolve relative
   project paths from the HQ folder. For
   Copilot CLI, put the workflow-discovery skill under `.github/skills/`;
   for Claude Code, use `.claude/skills/` and create
   `CLAUDE.md` with `@AGENTS.md` to import the shared rules. Use both sets of
   client files only if I selected both. Add optional templates only if I
   chose them. Don't install extensions, edit shell profiles or global config,
   change permissions, or add MCP servers or credentials.
5. Include `.cortex-source.json` in the preview and create it with
   `upstream` set to `https://github.com/aasis21/cortex-hq`, `reviewedThrough`
   set to the full upstream commit SHA, and `decisions` set to an empty array.
   This records where the HQ started, not which template files I must keep.
6. Confirm the files were created, the registry parses, and the paths are
   either present or clearly marked by you as unavailable. If Python is
   already available, you can review and run the read-only
   `scripts/check_registry.py` from the pinned upstream revision against
   my registry; otherwise check it with your existing tools. Show me how to
   open the folder in my chosen assistant and give me one prompt to try, such
   as "Which projects are registered, and where would you route a task in
   `<alias>`?" If you can't write locally, give me the proposed files instead
   and don't claim they were installed.
