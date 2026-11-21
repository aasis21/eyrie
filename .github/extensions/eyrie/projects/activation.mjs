// activation.mjs — session-scoped project activation state + operations.

import { eyrieRoot, ensureProjectAvailable, getProject, listAll, listAutoActivate, findProjectByCwd } from "./registry.mjs";
import { pathKey, repositoryIdentity } from "./repository.mjs";
import { scanProject, ALL_KINDS, fuzzyFilter } from "../copilot-assets/catalog.mjs";
import { formatProjectCatalog, formatProjectNameIndex, formatRegistrySummary, formatSearchResults } from "../copilot-assets/catalog-output.mjs";
import { formatRepositoryStartup, formatRepositoryReminder, formatRepositoryActivation } from "./repository-mode-context.mjs";

/** Reserved alias for the HQ's own shared Copilot assets. */
export const HQ_ALIAS = "eyrie";

/**
 * @typedef {{ alias?: string, path: string }} Checkout
 * @typedef {{ kind: "hq" } |
 *   { kind: "repository", primary: Checkout }} SessionMode
 */

/** @param {SessionMode} mode */
function createState(mode) {
    return {
        mode,
        active: new Set(),
        catalogStats: new Map(),
        scopeReminderCounter: 0,
        scopeReminderDirty: false,
        pendingContext: [],
    };
}

function isInside(child, parent) {
    const c = pathKey(child);
    const p = pathKey(parent);
    return c === p || c.startsWith(`${p}/`) || c.startsWith(`${p}\\`);
}

/** @returns {SessionMode} */
function resolveSessionMode(cwd) {
    const checkout = repositoryIdentity(cwd);
    const hq = repositoryIdentity(eyrieRoot());
    if (checkout && hq && pathKey(checkout.commonDir) === pathKey(hq.commonDir)) {
        return { kind: "hq" };
    }
    // An HQ folder that is not a Git repository is identified by path alone.
    if (!hq && !checkout && isInside(cwd, eyrieRoot())) return { kind: "hq" };
    const project = findProjectByCwd(cwd);
    return { kind: "repository", primary: { alias: project?.alias, path: project?.path || checkout?.root || cwd } };
}

let state = createState({ kind: "hq" });

function sessionProject(alias) {
    if (alias === HQ_ALIAS) return { alias, path: eyrieRoot(), description: "Eyrie HQ routing and shared workflows." };
    const project = getProject(alias);
    const checkout = state.mode.kind === "repository" ? state.mode.primary : null;
    return project && { ...project, path: checkout?.alias === alias ? checkout.path : project.path };
}

// ---------------------------------------------------------------------------
// State inspection / mutation
// ---------------------------------------------------------------------------

export function activeAliases() {
    return Array.from(state.active);
}

export function sessionMode() {
    return state.mode.kind;
}

/** Registry alias of the opened checkout in repository mode; null in HQ or for unregistered checkouts. */
export function primaryAlias() {
    return state.mode.kind === "repository" ? state.mode.primary.alias || null : null;
}

export function isActive(alias) {
    return state.active.has(alias);
}

export function activeScopeContext() {
    const aliases = activeAliases();
    if (state.mode.kind === "repository") {
        return formatRepositoryReminder({ aliases });
    }
    if (!aliases.length) return "Eyrie active scope: no projects are active.";

    const lines = ["Eyrie active scope:"];
    for (const alias of aliases) {
        const project = sessionProject(alias);
        const stats = state.catalogStats.get(alias);
        const counts = stats
            ? `${stats.skill} skills, ${stats.prompt} prompts`
            : "Copilot asset counts unavailable";
        lines.push(`- ${alias}: ${project?.path || "(path unavailable)"}; ${counts}`);
    }
    return lines.join("\n");
}

export function nextActiveScopeContext({ interval = 5 } = {}) {
    if (state.scopeReminderDirty) {
        state.scopeReminderDirty = false;
        state.scopeReminderCounter = 0;
        return activeScopeContext();
    }
    if (state.mode.kind === "hq" && !state.active.size) return null;

    state.scopeReminderCounter += 1;
    if (state.scopeReminderCounter < interval) return null;
    state.scopeReminderCounter = 0;
    return activeScopeContext();
}

function markScopeChanged() {
    state.scopeReminderDirty = true;
    state.scopeReminderCounter = 0;
}

function rememberCatalogStats(alias, byKind) {
    state.catalogStats.set(alias, {
        skill: byKind.skill?.length || 0,
        prompt: byKind.prompt?.length || 0,
    });
}

// Emit (and clear) scope context or catalogs parked for the next turn, joined
// into a single block ready to hand back as the turn's additionalContext.
export function flushPendingContext() {
    if (!state.pendingContext.length) return null;
    const combined = state.pendingContext.join("\n\n---\n\n");
    state.pendingContext = [];
    return combined;
}

function queueForNextTurn(text) {
    if (text) state.pendingContext.push(text);
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

// Activate a project. Returns { ok, alias, catalog, message }.
// `injectOnNextTurn` = true will also queue scope context for onUserPromptSubmitted
// injection so slash-command users see the model pick it up on their next turn.
export function activateProject(alias, { injectOnNextTurn = false } = {}) {
    const p = sessionProject(alias);
    if (!p) return { ok: false, alias, message: `Unknown project alias: '${alias}'. Try one of: ${listAll().map((x) => x.alias).join(", ") || "(none registered)"}` };
    const availability = ensureProjectAvailable(p);
    if (!availability.ok) return { ok: false, alias, message: availability.message };

    const isPrimary = state.mode.kind === "repository" && alias === state.mode.primary.alias;
    let result;
    if (state.mode.kind === "repository") {
        result = {
            catalog: formatRepositoryActivation({ project: p, primary: state.mode.primary }),
            message: isPrimary ? `'${alias}' is the primary project.` : `Activated '${alias}' for discovery.`,
        };
    } else {
        const byKind = scanProject(p.path, ALL_KINDS);
        rememberCatalogStats(alias, byKind);
        result = {
            catalog: formatProjectCatalog({ alias, path: p.path, byKind, kinds: ALL_KINDS, heading: "Activated" }),
            byKind,
            message: `Activated '${alias}'.`,
        };
    }
    if (!isPrimary && !state.active.has(alias)) {
        state.active.add(alias);
        markScopeChanged();
    }
    if (injectOnNextTurn) queueForNextTurn(result.catalog);
    const message = availability.cloned ? `${availability.message} ${result.message}` : result.message;
    return { ok: true, alias, ...result, cloned: availability.cloned, message };
}

export function deactivateProject(alias) {
    if (state.mode.kind === "repository" && alias === state.mode.primary.alias) {
        return { ok: false, alias, message: `'${alias}' is the primary checkout, not an additional Eyrie scope.` };
    }
    if (!state.active.has(alias)) return { ok: false, alias, message: `Project '${alias}' is not active.` };
    state.active.delete(alias);
    markScopeChanged();
    return { ok: true, alias, message: `Deactivated '${alias}'. Active now: ${activeAliases().join(", ") || "(none)"}` };
}

export function peekProject(alias, { kind, query, injectOnNextTurn = false } = {}) {
    const p = sessionProject(alias);
    if (!p || !p.path) return { ok: false, alias, message: `Unknown or path-less project: '${alias}'.` };
    const availability = ensureProjectAvailable(p);
    if (!availability.ok) return { ok: false, alias, message: availability.message };
    const kinds = kind ? [kind] : ALL_KINDS;
    const byKind = scanProject(p.path, kinds);
    if (query) {
        for (const k of kinds) byKind[k] = fuzzyFilter(byKind[k] || [], query);
    }
    const catalog = formatProjectCatalog({ alias, path: p.path, byKind, kinds, heading: `Peek${query ? ` (query: "${query}")` : ""}` });
    if (injectOnNextTurn) queueForNextTurn(catalog);
    return {
        ok: true,
        alias,
        catalog,
        byKind,
        cloned: availability.cloned,
        message: availability.cloned ? availability.message : undefined,
    };
}

export function searchCopilotAssets({ query, project, kind, deep = false, top = 30 } = {}) {
    if (!query || !String(query).trim()) return { ok: false, message: "search: query is required" };
    if (!Number.isInteger(top) || top < 1 || top > 500) {
        return { ok: false, message: "search: top must be an integer from 1 to 500" };
    }
    const targets = project
        ? [sessionProject(project)].filter(Boolean)
        : [sessionProject(HQ_ALIAS), ...listAll().map((p) => sessionProject(p.alias))];
    if (!targets.length) return { ok: false, hits: [], message: `Unknown project: ${project}` };
    const kinds = kind ? [kind] : ALL_KINDS;
    const hits = [];
    const notices = [];
    const skipped = [];
    let searchedTargets = 0;
    for (const p of targets) {
        // A broad registry search must not unexpectedly clone every missing
        // checkout. Explicit project searches retain lazy-clone behavior.
        const availability = ensureProjectAvailable(p, { cloneIfMissing: Boolean(project) });
        if (!availability.ok) {
            if (project) return { ok: false, hits: [], message: availability.message };
            skipped.push(p.alias);
            continue;
        }
        if (availability.cloned) notices.push(availability.message);
        searchedTargets += 1;
        const byKind = scanProject(p.path, kinds, { includeBody: deep });
        for (const k of kinds) {
            for (const entry of fuzzyFilter(byKind[k] || [], query, { deep })) {
                const { body, ...e } = entry;
                const searchScore = state.active.has(p.alias)
                    ? (e.searchScore || 0) * 1.08
                    : (e.searchScore || 0);
                hits.push({
                    ...e,
                    searchScore,
                    projectAlias: p.alias,
                    activeProject: state.active.has(p.alias),
                });
            }
        }
    }
    if (skipped.length) {
        notices.push(
            `Skipped unavailable projects: ${skipped.join(", ")}. ` +
            "Search one explicitly (or activate it) to clone it when a remote is configured, or to receive the checkout error directly.",
        );
    }
    if (!searchedTargets) {
        return { ok: false, hits: [], message: notices.join("\n") };
    }
    hits.sort((left, right) =>
        (right.searchScore || 0) - (left.searchScore || 0) ||
        String(left.projectAlias || "").localeCompare(String(right.projectAlias || "")) ||
        String(left.name || "").localeCompare(String(right.name || "")),
    );
    const totalHits = hits.length;
    const limitedHits = hits.slice(0, top);
    const results = formatSearchResults({
        query,
        hits: limitedHits,
        totalHits,
        project,
        deep,
    });
    const rendered = notices.length ? `${notices.join("\n")}\n\n${results}` : results;
    return { ok: true, hits: limitedHits, totalHits, top, rendered, notices };
}

// ---------------------------------------------------------------------------
// Session-start bootstrap
// ---------------------------------------------------------------------------

export function bootstrap({ cwd = process.cwd() } = {}) {
    state = createState(resolveSessionMode(cwd));
    if (state.mode.kind === "repository") {
        return formatRepositoryStartup({ primary: state.mode.primary, eyrieHome: eyrieRoot() });
    }
    return bootstrapHq();
}

function bootstrapHq() {
    for (const p of listAutoActivate()) state.active.add(p.alias);

    // Build always-on registry summary.
    const projects = listAll();
    const summary = formatRegistrySummary({ projects, activeAliases: activeAliases() });

    // Keep Copilot asset names discoverable without injecting descriptions or paths.
    const parts = [summary];
    for (const alias of activeAliases()) {
        const p = sessionProject(alias);
        if (!p || !p.path) continue;
        const availability = ensureProjectAvailable(p, { cloneIfMissing: false });
        if (!availability.ok) {
            const nextStep = p.remote
                ? `Run \`/eyrie activate ${alias}\` (or call \`eyrie_activate\`) when needed; Eyrie will clone the configured remote into that exact path.`
                : `The project has no configured remote, so create the checkout at that path before activating it.`;
            parts.push(
                `# Auto-activation pending: \`${alias}\`\n\n` +
                `The registered path does not exist: \`${p.path}\`.\n\n` +
                nextStep,
            );
            continue;
        }
        const byKind = scanProject(p.path, ALL_KINDS);
        rememberCatalogStats(alias, byKind);
        parts.push(formatProjectNameIndex({ alias, byKind }));
    }
    if (activeAliases().length) parts.push(activeScopeContext());
    return parts.join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Human-readable status (for /eyrie status)
// ---------------------------------------------------------------------------

export function statusText() {
    const active = activeAliases();
    const projects = listAll();
    const lines = [`Mode: ${state.mode.kind === "hq" ? "HQ" : "Repository"}`];
    if (state.mode.kind === "repository") {
        lines.push(`Primary project: ${state.mode.primary.alias || "(unregistered)"}`);
        lines.push(`Primary checkout: ${state.mode.primary.path}`);
        lines.push(`Additional active projects: ${active.length ? active.join(", ") : "(none)"}`);
    } else {
        lines.push(`Active projects: ${active.length ? active.join(", ") : "(none)"}`);
    }
    lines.push("");
    lines.push("All registered projects:");
    if (!projects.length) lines.push("  (none — add entries under 'projects' in registry.json)");
    for (const p of projects) {
        const isPrimary = state.mode.kind === "repository" && state.mode.primary.alias === p.alias;
        const marker = state.active.has(p.alias) || isPrimary ? "→" : " ";
        const tag = state.mode.kind === "hq" && p.auto_activate ? " [auto]" : "";
        lines.push(`  ${marker} ${p.alias}${tag} — ${(p.description || "").split(/\r?\n/)[0]}`);
    }
    lines.push("");
    lines.push("Usage:");
    lines.push("  /eyrie activate <alias>          Add a project to active scope.");
    lines.push("  /eyrie deactivate <alias>        Remove from scope.");
    lines.push("  /eyrie peek <alias> [kind] [q]   One-shot look at a project's Copilot assets.");
    lines.push("  /eyrie search [-p alias] [-k kind] [-d] [-t n] <query>");
    lines.push("");
    lines.push(`HQ: ${eyrieRoot()}`);
    lines.push(`Shared HQ workflows: /eyrie peek ${HQ_ALIAS} or /eyrie search --project ${HQ_ALIAS} <query>`);
    return lines.join("\n");
}
