// catalog.mjs — scan a project's .github/{skills,prompts,agents,instructions}
// and return structured entries. Uses a dependency-free frontmatter parser for
// top-level scalar metadata and indented block-scalar text.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, basename, dirname, relative } from "node:path";

// Parse leading `---\n...\n---\n` block. Returns { data, body }.
// Supports simple scalar strings, quoted strings, and `>` / `|` block text.
// Lists and nested mappings are intentionally ignored.
function parseFrontmatter(text) {
    if (!text) return { data: {}, body: "" };
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { data: {}, body: text };
    const block = m[1];
    const body = text.slice(m[0].length);
    const data = {};
    let currentKey = null;
    let currentVal = null;
    for (const rawLine of block.split(/\r?\n/)) {
        const line = rawLine.replace(/\s+$/, "");
        if (!line.trim() || line.trim().startsWith("#")) continue;
        // Key: value  (top-level only — lines starting with whitespace are continuations of a folded string)
        const kv = line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
        if (kv && !line.startsWith(" ") && !line.startsWith("\t")) {
            if (currentKey && currentVal !== null) data[currentKey] = trimQuotes(currentVal);
            currentKey = kv[1];
            currentVal = kv[2] ?? "";
            if (/^[>|][+-]?$/.test(currentVal.trim())) currentVal = "";
        } else if (currentKey) {
            // continuation line (folded)
            currentVal = ((currentVal || "") + " " + line.trim()).trim();
        }
    }
    if (currentKey && currentVal !== null) data[currentKey] = trimQuotes(currentVal);
    return { data, body };
}

function trimQuotes(v) {
    if (typeof v !== "string") return v;
    const t = v.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1);
    }
    return t;
}

function readSafe(path) {
    try { return readFileSync(path, "utf8"); } catch { return null; }
}

function statSafe(path) {
    try { return statSync(path); } catch { return null; }
}

function listDirs(dir) {
    if (!existsSync(dir)) return [];
    try { return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return []; }
}

// Walk `dir` looking for files matching `filenamePattern` (RegExp).
// Only follows directories; skips node_modules / .git.
function walk(dir, filenamePattern, out = []) {
    if (!existsSync(dir)) return out;
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full, filenamePattern, out);
        else if (e.isFile() && filenamePattern.test(e.name)) out.push(full);
    }
    return out;
}

// ---------------------------------------------------------------------------
// Per-kind scanners. Each returns entries: {kind, name, description, applyTo?, absolutePath, relPath}
// ---------------------------------------------------------------------------

function scanSkills(githubDir, { includeBody = false } = {}) {
    const skillsRoot = join(githubDir, "skills");
    const out = [];
    for (const d of listDirs(skillsRoot)) {
        const skillMd = join(skillsRoot, d.name, "SKILL.md");
        if (!statSafe(skillMd)) continue;
        const text = readSafe(skillMd);
        if (!text) continue;
        const { data, body } = parseFrontmatter(text);
        out.push({
            kind: "skill",
            name: (data.name || d.name).trim(),
            description: (data.description || "").trim(),
            absolutePath: skillMd,
            relPath: relative(githubDir, skillMd),
            ...(includeBody ? { body } : {}),
        });
    }
    return out;
}

function scanPrompts(githubDir, { includeBody = false } = {}) {
    // Repositories may nest prompts under .github/prompts/** AND .github/skills/*/prompts/**.
    const roots = [join(githubDir, "prompts"), join(githubDir, "skills")];
    const out = [];
    for (const root of roots) {
        for (const file of walk(root, /\.prompt\.md$/)) {
            const text = readSafe(file);
            if (!text) continue;
            const { data, body } = parseFrontmatter(text);
            const name = (data.name || basename(file).replace(/\.prompt\.md$/, "")).trim();
            out.push({
                kind: "prompt",
                name,
                description: (data.description || "").trim(),
                absolutePath: file,
                relPath: relative(githubDir, file),
                ...(includeBody ? { body } : {}),
            });
        }
    }
    // Dedupe by absolutePath (a prompt is unique per file).
    const seen = new Set();
    return out.filter((e) => (seen.has(e.absolutePath) ? false : (seen.add(e.absolutePath), true)));
}

function scanAgents(githubDir, { includeBody = false } = {}) {
    const agentsDir = join(githubDir, "agents");
    const out = [];
    for (const file of walk(agentsDir, /\.agent\.md$/)) {
        const text = readSafe(file);
        if (!text) continue;
        const { data, body } = parseFrontmatter(text);
        const name = (data.name || basename(file).replace(/\.agent\.md$/, "")).trim();
        out.push({
            kind: "agent",
            name,
            description: (data.description || "").trim(),
            absolutePath: file,
            relPath: relative(githubDir, file),
            ...(includeBody ? { body } : {}),
        });
    }
    return out;
}

function scanInstructions(githubDir, { includeBody = false } = {}) {
    const insDir = join(githubDir, "instructions");
    const out = [];
    for (const file of walk(insDir, /\.instructions\.md$/)) {
        const text = readSafe(file);
        if (!text) continue;
        const { data, body } = parseFrontmatter(text);
        const name = (data.name || basename(file).replace(/\.instructions\.md$/, "")).trim();
        out.push({
            kind: "instruction",
            name,
            description: (data.description || "").trim(),
            applyTo: (data.applyTo || "").trim() || undefined,
            absolutePath: file,
            relPath: relative(githubDir, file),
            ...(includeBody ? { body } : {}),
        });
    }
    return out;
}

const SCANNERS = {
    skill: scanSkills,
    prompt: scanPrompts,
    agent: scanAgents,
    instruction: scanInstructions,
};

export const ALL_KINDS = ["skill", "prompt", "agent", "instruction"];

// Scan a project. `projectPath` is the repo root. Returns {kind → entries[]}.
// `kinds` optional filter.
export function scanProject(projectPath, kinds = ALL_KINDS, { includeBody = false } = {}) {
    const githubDir = join(projectPath, ".github");
    const result = {};
    for (const kind of kinds) {
        result[kind] = existsSync(githubDir) ? SCANNERS[kind](githubDir, { includeBody }) : [];
    }
    return result;
}

function normalizeSearchText(value) {
    return String(value || "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function typoDistanceFor(token) {
    if (token.length < 4) return 0;
    if (token.length < 8) return 1;
    return 2;
}

function levenshteinDistance(left, right) {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
        const current = [i];
        for (let j = 1; j <= right.length; j += 1) {
            const substitution = previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1);
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                substitution,
            );
        }
        previous = current;
    }
    return previous[right.length];
}

function tokenSimilarity(queryToken, candidate) {
    if (queryToken === candidate) return 1;
    if (
        Math.min(queryToken.length, candidate.length) >= 3 &&
        (candidate.startsWith(queryToken) || queryToken.startsWith(candidate))
    ) return 0.9;
    if (queryToken.length >= 3 && candidate.includes(queryToken)) return 0.82;

    const allowedDistance = typoDistanceFor(queryToken);
    if (!allowedDistance || Math.abs(queryToken.length - candidate.length) > allowedDistance) return 0;
    const distance = levenshteinDistance(queryToken, candidate);
    if (distance > allowedDistance) return 0;
    return distance === 1 ? 0.76 : 0.68;
}

function scoreField(value, normalizedQuery, queryTokens, weight) {
    const field = normalizeSearchText(value);
    if (!field) return 0;
    if (field === normalizedQuery) return 100 * weight;
    if (field.startsWith(normalizedQuery)) return 80 * weight;
    if (field.includes(normalizedQuery)) return 65 * weight;

    const fieldTokens = field.split(" ");
    let similarity = 0;
    for (const queryToken of queryTokens) {
        let best = 0;
        for (const fieldToken of fieldTokens) {
            best = Math.max(best, tokenSimilarity(queryToken, fieldToken));
            if (best === 1) break;
        }
        if (!best) return 0;
        similarity += best;
    }
    return 40 * weight * (similarity / queryTokens.length);
}

function scoreBody(value, normalizedQuery, queryTokens) {
    const body = normalizeSearchText(value);
    if (!body) return 0;
    if (
        (queryTokens.length > 1 || normalizedQuery.length >= 4) &&
        body.includes(normalizedQuery)
    ) return 35;

    const bodyTokens = Array.from(new Set(body.split(" ")));
    let similarity = 0;
    for (const queryToken of queryTokens) {
        let best = 0;
        for (const bodyToken of bodyTokens) {
            best = Math.max(best, tokenSimilarity(queryToken, bodyToken));
            if (best === 1) break;
        }
        if (!best) return 0;
        similarity += best;
    }
    return 20 * (similarity / queryTokens.length);
}

function findBodySnippet(value, normalizedQuery, queryTokens) {
    let bestLine = "";
    let bestScore = 0;
    let fallbackLine = "";
    for (const rawLine of String(value || "").split(/\r?\n/)) {
        const line = rawLine.trim().replace(/\s+/g, " ");
        if (!line) continue;
        if (!fallbackLine) {
            const lineTokens = normalizeSearchText(line).split(" ");
            if (queryTokens.some((queryToken) =>
                lineTokens.some((lineToken) => tokenSimilarity(queryToken, lineToken) > 0)
            )) fallbackLine = line;
        }
        const score = scoreField(line, normalizedQuery, queryTokens, 1);
        if (score > bestScore) {
            bestLine = line;
            bestScore = score;
        }
    }
    if (!bestLine) bestLine = fallbackLine;
    if (!bestLine) return undefined;
    return bestLine.length > 240 ? `${bestLine.slice(0, 237).trimEnd()} …` : bestLine;
}

function fuzzyScore(entry, normalizedQuery, queryTokens, { deep = false } = {}) {
    const filePath = entry.absolutePath || entry.relPath || "";
    const fileName = basename(filePath);
    let fileStem = fileName
        .replace(/\.(prompt|agent|instructions)\.md$/i, "")
        .replace(/\.md$/i, "");
    if (/^skill$/i.test(fileStem)) fileStem = basename(dirname(filePath));

    const metadataScore = (
        scoreField(entry.name, normalizedQuery, queryTokens, 4) +
        scoreField(fileStem, normalizedQuery, queryTokens, 3.5) +
        scoreField(entry.description, normalizedQuery, queryTokens, 1.5) +
        scoreField(`${entry.name || ""} ${fileStem} ${entry.description || ""}`, normalizedQuery, queryTokens, 1)
    );
    const bodyScore = deep ? scoreBody(entry.body, normalizedQuery, queryTokens) : 0;
    return {
        score: metadataScore + bodyScore,
        matchSnippet: bodyScore > 0 && metadataScore === 0
            ? findBodySnippet(entry.body, normalizedQuery, queryTokens)
            : undefined,
    };
}

// Ranked, case-insensitive fuzzy match over file name and discovery metadata;
// `deep` additionally includes the already-scanned Copilot asset body.
export function fuzzyFilter(entries, query, { deep = false } = {}) {
    if (!query) return entries;
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return entries;
    const queryTokens = normalizedQuery.split(" ");
    return entries
        .map((entry) => {
            const match = fuzzyScore(entry, normalizedQuery, queryTokens, { deep });
            return {
                ...entry,
                searchScore: match.score,
                ...(match.matchSnippet ? { matchSnippet: match.matchSnippet } : {}),
            };
        })
        .filter((entry) => entry.searchScore > 0)
        .sort((left, right) =>
            right.searchScore - left.searchScore ||
            String(left.name || "").localeCompare(String(right.name || "")),
        );
}
