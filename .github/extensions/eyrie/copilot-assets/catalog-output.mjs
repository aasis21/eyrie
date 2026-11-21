// catalog-output.mjs — render registry summaries and Copilot asset catalogs.

const KIND_HINTS = {
    skill: "Skills — discovery surface; `view` the SKILL.md to load the full procedure; relative asset refs resolve against the skill's folder",
    prompt: "Prompts — executable turns; `view` the file and follow its instructions as if the user had typed them",
    agent: "Agents — persona definitions; `view` to adopt the persona's role/constraints for this session (can't natively /agent into cross-repo agents)",
    instruction: "Instructions — conditional editing rules; apply when files match `applyTo` glob; `view` for full rules",
};

const KIND_PLURAL = { skill: "Skills", prompt: "Prompts", agent: "Agents", instruction: "Instructions" };

const DESC_MAX = 200;

// Truncate a description at a sentence boundary if possible; ellipsize otherwise.
function truncDesc(desc) {
    const one = (desc || "").split(/\r?\n/)[0].trim();
    if (one.length <= DESC_MAX) return one || "(no description)";
    const cut = one.slice(0, DESC_MAX);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("—"));
    if (lastStop > 60) return one.slice(0, lastStop + 1).trim() + " …";
    return cut.replace(/\s\S*$/, "") + " …";
}

function padRight(s, n) {
    s = String(s ?? "");
    return s.length >= n ? s + " " : s + " ".repeat(n - s.length);
}

// ---------------------------------------------------------------------------
// Always-on registry summary
// ---------------------------------------------------------------------------

export function formatRegistrySummary({ projects, activeAliases }) {
    const lines = [];
    lines.push("# Eyrie — cross-repo Copilot asset scope");
    lines.push("");
    lines.push("Registered projects (from the HQ registry.json):");
    if (!projects.length) lines.push("  (none yet — add entries under 'projects' in registry.json)");
    const aliasWidth = Math.min(24, Math.max(...projects.map((p) => p.alias.length), 8));
    const flagWidth = 8;
    for (const p of projects) {
        const flag = p.auto_activate ? "[auto]" : "";
        const desc = truncDesc(p.description);
        lines.push(`  ${padRight(p.alias, aliasWidth)} ${padRight(flag, flagWidth)} ${desc}  (${p.path || "?"})`);
    }
    lines.push("");
    lines.push(`Currently active: ${activeAliases.length ? activeAliases.join(", ") : "(none)"}`);
    lines.push("");
    lines.push("Tools:");
    lines.push("  eyrie_activate(project)                Add project to active scope; returns its Copilot asset catalog.");
    lines.push("  eyrie_deactivate(project)              Remove project from active scope.");
    lines.push("  eyrie_peek(project, kind?, query?)     Browse a known project's full or filtered catalog without activating.");
    lines.push("  eyrie_search(query, project?, kind?, deep?, top?)  Lexical fuzzy search using short keywords; not semantic search.");
    lines.push("");
    lines.push("Slash commands: /eyrie [status] | /eyrie activate <alias> | /eyrie deactivate <alias> | /eyrie peek <alias> [kind] [query] | /eyrie search [--project <alias>] [--kind <kind>] [--deep] [--top <1-500>] <query>");
    lines.push("");
    lines.push("When a project is active you'll see its catalog (name + description + absolute path per item). To load full content, `view` the absolute path.");
    lines.push('Shared HQ workflows use project="eyrie" with eyrie_peek or eyrie_search.');
    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Per-project activation catalog (or peek result)
// ---------------------------------------------------------------------------

export function formatProjectCatalog({ alias, path, byKind, kinds, heading = "Activated" }) {
    const lines = [];
    lines.push(`# ${heading}: \`${alias}\` (${path})`);
    lines.push("");
    let anything = false;
    for (const kind of kinds) {
        const entries = byKind[kind] || [];
        if (!entries.length) continue;
        anything = true;
        lines.push(`## ${KIND_PLURAL[kind]}`);
        lines.push(`_${KIND_HINTS[kind]}_`);
        lines.push("");
        for (const e of entries) {
            const applyTo = e.applyTo ? ` (applyTo: \`${e.applyTo}\`)` : "";
            lines.push(`- **${e.name}**${applyTo} — ${truncDesc(e.description)}`);
            lines.push(`  → \`${e.absolutePath}\``);
        }
        lines.push("");
    }
    if (!anything) {
        lines.push("_(No Copilot assets found under `.github/{skills,prompts,agents,instructions}` for this project.)_");
    }
    return lines.join("\n");
}

export function formatProjectNameIndex({ alias, byKind, kinds = ["skill", "prompt"] }) {
    const lines = [`# Available Copilot asset names: \`${alias}\``, ""];

    for (const kind of kinds) {
        const entries = byKind[kind] || [];
        if (!entries.length) continue;
        lines.push(`## ${KIND_PLURAL[kind]}`);
        for (const entry of entries) lines.push(`- ${entry.name}`);
        lines.push("");
    }

    return lines.join("\n").trimEnd();
}

// Search result: flat listing across projects/kinds.
export function formatSearchResults({ query, hits, totalHits = hits.length, project, deep = false }) {
    const lines = [];
    lines.push(`# eyrie_search results${query ? ` for "${query}"` : ""}`);
    lines.push("");
    if (!hits.length) {
        lines.push("_(No matches.)_");
    } else {
        lines.push(`_Showing ${hits.length} of ${totalHits} ranked match${totalHits === 1 ? "" : "es"}._`);
        lines.push("");
        for (const h of hits) {
            const applyTo = h.applyTo ? ` (applyTo: \`${h.applyTo}\`)` : "";
            lines.push(`- [${h.projectAlias}] **${h.name}** _(${h.kind})_${applyTo} — ${truncDesc(h.description)}`);
            lines.push(`  → \`${h.absolutePath}\``);
            if (h.matchSnippet) lines.push(`  _Body match:_ ${h.matchSnippet}`);
        }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(
        "_Search note: `eyrie_search` is lexical fuzzy token matching, not semantic intent search. " +
        "Use 1–4 short asset keywords or an exact identifier rather than a natural-language sentence._",
    );
    if (deep) {
        lines.push(
            "_`deep=true` searched complete Copilot asset bodies. Body-only matches can be noisy; " +
            "prefer `deep=false` first and use deep search only for terms likely to occur verbatim._",
        );
    } else {
        lines.push(
            "_Use `deep=true` only after metadata search misses and an exact term is likely inside a Copilot asset body._",
        );
    }
    lines.push(
        project
            ? `_To inspect the complete \`${project}\` catalog, call \`eyrie_peek(project="${project}")\` without a query; optionally restrict by \`kind\`._`
            : "_When you know the owning project and want to browse all of its Copilot assets, call `eyrie_peek(project)` without a query; optionally restrict by `kind`._",
    );
    return lines.join("\n");
}
