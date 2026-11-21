// lore.mjs — Lore, the HQ's working memory: inject the core at session start, remind
// the agent to learn from each user turn, and attach freshness to Lore reads.
//
// Lore is plain Markdown under <hq>/lore (optional; everything here is a no-op without it):
//   me.md                 how I work (always loaded)
//   *.md                  cross-project topics (listed)
//   <area>/overview.md    map for the session's project group (registry.json `area`)
//   <area>/*.md           topic files (listed by frontmatter description)
// Rules for saving live in AGENTS.md "Lore".

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const MAX_OVERVIEW_CHARS = 4000;
const MAX_ME_CHARS = 6000;
const MAX_LISTED_TOPICS = 40;
const READ_TOOLS = new Set(["view", "read_file", "ReadFile", "Read"]);
export const REMINDER =
    "Lore: if this message corrects you, repeats an earlier ask or reworks your output, " +
    "or you discover something costly, save it under lore/ now (AGENTS.md \"Lore\") and end your reply with `Learned: ...`.";

export function loreRoot(hqHome) {
    return join(hqHome, "lore");
}

/** Repository mode uses the primary project's area; HQ mode uses the registry's `defaultArea`, if any. */
export function resolveArea({ mode, primaryAlias, getProject, defaultArea }) {
    if (mode === "repository") {
        const project = primaryAlias ? getProject(primaryAlias) : null;
        return project?.area || null;
    }
    return defaultArea || null;
}

export function readDescription(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!match) return "";
    const line = match[1].split(/\r?\n/).find((l) => /^description:/.test(l));
    return line ? line.replace(/^description:\s*/, "").replace(/^["']|["']$/g, "").trim() : "";
}

function readText(path, maxChars) {
    if (!existsSync(path)) return "";
    const text = readFileSync(path, "utf8").trim();
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n…(truncated; read the file for the rest)` : text;
}

function topicEntries(root, area) {
    const entries = [];
    const listDir = (dir, skip) => {
        if (!dir || !existsSync(dir)) return;
        for (const name of readdirSync(dir).sort()) {
            if (!name.endsWith(".md") || skip.has(name)) continue;
            const path = join(dir, name);
            entries.push({ path, description: readDescription(readFileSync(path, "utf8")) });
        }
    };
    listDir(root, new Set(["me.md", "README.md"]));
    listDir(area ? join(root, area) : null, new Set(["overview.md"]));
    return entries.slice(0, MAX_LISTED_TOPICS);
}

export function formatStartupContext({ root, area }) {
    if (!existsSync(root)) return "";
    const parts = [
        "# Lore",
        `Working memory: \`${root}\`. Follow AGENTS.md "Lore": learn without being asked; check facts before relying on them.`,
    ];
    const me = readText(join(root, "me.md"), MAX_ME_CHARS);
    if (me) parts.push(`## me.md (how I work)\n\n${me}`);
    if (area) {
        const overview = readText(join(root, area, "overview.md"), MAX_OVERVIEW_CHARS);
        parts.push(overview ? `## Area: ${area} (overview.md)\n\n${overview}` : `## Area: ${area}\n\nNo overview yet.`);
    }
    const topics = topicEntries(root, area);
    if (topics.length) {
        parts.push(
            "## Topic files (read when relevant)\n\n" +
            topics.map((t) => `- \`${t.path}\`${t.description ? ` — ${t.description}` : ""}`).join("\n"),
        );
    }
    return parts.join("\n\n");
}

function isInside(root, path) {
    const rel = relative(resolve(root), resolve(path));
    return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Freshness note for a Lore file read through a file-read tool; empty for anything else. */
export function loreReadNote({ toolName, toolArgs }, root, now = Date.now()) {
    if (!READ_TOOLS.has(toolName)) return "";
    const path = toolArgs?.path || toolArgs?.filePath || toolArgs?.file_path;
    if (typeof path !== "string" || !path.endsWith(".md") || !isInside(root, path) || !existsSync(path)) return "";
    const days = Math.floor((now - statSync(path).mtimeMs) / 86_400_000);
    const age = days < 1 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
    return `[Lore: ${relative(root, path)} last edited ${age}. A fact is what was true then; check it before relying on it and fix it in place if wrong.]`;
}

export function createLore({ hqHome }) {
    const root = loreRoot(hqHome);
    return {
        root,
        startupContext({ mode, primaryAlias, getProject, defaultArea }) {
            const area = resolveArea({ mode, primaryAlias, getProject, defaultArea });
            return formatStartupContext({ root, area });
        },
        postToolUse(input) {
            const note = loreReadNote(input || {}, root);
            return note ? { additionalContext: note } : undefined;
        },
        reminder() {
            return existsSync(root) ? REMINDER : "";
        },
    };
}
