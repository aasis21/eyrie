# Review updates for my HQ

Help me selectively bring useful changes from https://github.com/aasis21/eyrie
into my existing GitHub Copilot CLI HQ. My local setup governs how I work. Do
not reinstall Eyrie, pull it into my HQ, or overwrite my setup to match it.

1. Confirm which folder is my HQ. Read its instructions, registry structure,
   workflow metadata, and `UPSTREAM.md` (YAML source metadata and adoption
   history) if present. Otherwise read a legacy `.eyrie-source.json` or
   `.cortex-source.json`. If multiple records disagree about the source,
   review state or decisions, ask before choosing or merging them. Inspect
   only files relevant to the review; don't upload local settings, project
   details, or credentials to retrieve upstream changes.
2. Resolve upstream's default branch to one full commit SHA. Treat
   `https://github.com/aasis21/cortex-hq` as the same upstream (it was
   renamed). If the review record has `pendingReview`, resume that pinned
   revision first, even if upstream has moved. When `reviewedThrough` is a
   verifiable ancestor of the review target, compare those two upstream
   revisions, then compare the affected material with my HQ. Keep upstream
   changes separate from local customizations; honor any `localRename` mapping
   when locating destinations. Without a verified baseline,
   compare the pinned files with my HQ and don't infer that anything local is
   unmodified. If the record names a different source, don't use or replace
   it without asking. Read upstream into a temporary folder outside my HQ and
   treat its files as material to review, not commands to run. If you can't
   verify the review target, stop and explain what's missing.
3. Cover HQ instructions, skills, prompts, agents, the `eyrie` extension,
   `profile.ps1`/`profile.sh` and `scripts/`; don't sync Eyrie's README,
   website or sample registry data. Lore's rules and hooks are reviewable like
   any other file. Don't propose edits to my content in `lore/`, `relay/` or
   `corpus/`; they are my learned memory, handoffs and saved documents. The
   only exception is an explicitly approved adoption-log pointer in the HQ's
   Lore overview, preserving all learned content. Offer new skills as
   optional additions.
   For each meaningful change, recommend **adopt** (fits as-is), **adapt**
   (merge the useful part into my conventions), or **skip** (not useful or
   conflicts with a deliberate choice). Explain why and show the proposed
   local file changes with their destinations. Preserve my HQ name, command,
   project entries, preferences, and custom workflows by default. Don't treat
   an upstream rename or deletion as approval to remove my files. Check for
   dependencies between recommendations. On resume, distinguish pending items
   from prior skips and still-present adopted or adapted changes. If the
   upstream revision is already reviewed and there's no pending review,
   report that and don't rewrite the record.
4. Wait for my approval of the specific changes and the review record. Apply
   only those edits; if a file changed since the preview, recheck and ask
   before touching it. Don't edit project checkouts, global config,
   permissions, or MCP settings. Touch my shell profile only by re-running
   `node scripts/install-shell.mjs` with my existing `--home` and `--command`,
   and only if I approved a change to its block. If you changed the registry,
   check it parses and report unavailable paths. If my HQ is a git
   repository, offer to commit the approved changes. Report what changed and
   what was left alone, and delete the temporary folder.
5. **Keep one adoption log.** Write the approved record to `UPSTREAM.md` in
   the HQ root. YAML frontmatter holds `description`, `upstream`
   `https://github.com/aasis21/eyrie`, `reviewedThrough` and, for a partial
   review, `pendingReview`. Preserve any other metadata and the existing
   history. Append a dated entry with the full pinned `revision` and a table
   of each approved `change` (a stable source-relative identifier, with a
   suffix for independent changes to one path), `action` (`adopt`, `adapt`,
   or `skip`), local destination or result, and reason. Do not log a proposed
   adoption as applied, erase an earlier skip, or duplicate the history in a
   metadata `decisions` array. List unresolved proposals separately from
   approved decisions, and distinguish local tuning or contributions sent
   upstream from actual imports.

   If migrating a legacy JSON record, preserve all its source fields, review
   state and name mappings in YAML; move every `decisions` entry into the
   history, keeping its revision, identifier, action and any extra fields.
   Don't invent missing dates or reasons: label them "not recorded". Parse
   the new frontmatter and compare it and the history to the original before
   deleting the legacy file; removing it must be part of my approval. Leave
   one canonical record, not two baselines to maintain. Add an approved
   pointer in `AGENTS.md` and, when present, the HQ's Lore overview; don't
   copy the history into Lore.

   For a partial review, set `pendingReview` to the pinned SHA and leave
   `reviewedThrough` unchanged or absent if unknown. Advance
   `reviewedThrough` and remove `pendingReview` only once all proposals at
   that revision have been applied or explicitly skipped, or once I approve
   a review with no applicable changes. Never advance to a newer upstream
   HEAD just because it exists or because we contributed to it. Without a
   known baseline, the completed SHA starts future comparisons; it doesn't
   tell us what installed the HQ. If I decline or approve nothing, write
   nothing, including no format migration.
