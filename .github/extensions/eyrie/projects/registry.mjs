// registry.mjs — read <hq>/registry.json and resolve project aliases.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, normalize, sep, isAbsolute } from "node:path";
import { findRepositoryProject } from "./repository.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLONE_TIMEOUT_MS = 15 * 60 * 1000;

let cached = null;
let cachedPath = null;

// Walk up from this file to the first folder that holds registry.json.
function discoverRoot() {
    let dir = HERE;
    for (;;) {
        if (existsSync(join(dir, "registry.json"))) return dir;
        const parent = dirname(dir);
        if (parent === dir) return resolve(HERE, "..", "..", "..", "..");
        dir = parent;
    }
}

const DISCOVERED_ROOT = discoverRoot();

export function eyrieRoot() {
    return process.env.EYRIE_HOME ? resolve(process.env.EYRIE_HOME) : DISCOVERED_ROOT;
}

export function registryPath() {
    return join(eyrieRoot(), "registry.json");
}

// Registry paths may be absolute, home-relative (~/...), or relative to the HQ folder.
export function resolveProjectPath(path, root = eyrieRoot()) {
    if (typeof path !== "string" || !path) return path;
    if (path === "~") return homedir();
    if (path.startsWith("~/") || path.startsWith("~\\")) return join(homedir(), path.slice(2));
    return isAbsolute(path) ? path : resolve(root, path);
}

function cloneFailureDetail(result, remote) {
    const raw = [result?.stderr, result?.stdout]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join("\n");
    if (!raw) return "";
    const redacted = remote ? raw.split(remote).join("<remote>") : raw;
    return redacted.slice(-1500);
}

function load() {
    const path = registryPath();
    if (cached && cachedPath === path) return cached;
    cachedPath = path;
    if (!existsSync(path)) {
        cached = { version: 0, projects: {} };
        return cached;
    }
    try {
        cached = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
        if (!cached.projects || typeof cached.projects !== "object") cached.projects = {};
    } catch (err) {
        cached = { version: 0, projects: {}, _error: err?.message || String(err) };
    }
    return cached;
}

export function reload() {
    cached = null;
    return load();
}

function toProject(alias, entry) {
    return { ...entry, alias, path: resolveProjectPath(entry?.path) };
}

// Keys starting with "_" are documentation or examples, never projects.
export function listAll() {
    const reg = load();
    return Object.entries(reg.projects)
        .filter(([alias, entry]) => !alias.startsWith("_") && entry && typeof entry === "object")
        .map(([alias, entry]) => toProject(alias, entry));
}

export function getProject(alias) {
    const reg = load();
    if (!alias || alias.startsWith("_") || !reg.projects[alias]) return null;
    return toProject(alias, reg.projects[alias]);
}

// Ensure a registered project has a local checkout. Existing paths are never
// modified. Missing paths are cloned lazily from the configured remote.
export function ensureProjectAvailable(
    project,
    { cloneIfMissing = true, timeoutMs = DEFAULT_CLONE_TIMEOUT_MS } = {},
) {
    const alias = project?.alias || "(unknown)";
    const projectPath = project?.path;
    if (!projectPath) {
        return { ok: false, cloned: false, reason: "missing-path", message: `Project '${alias}' has no 'path' in registry.json.` };
    }
    if (existsSync(projectPath)) {
        return { ok: true, cloned: false, project, path: projectPath };
    }
    if (!cloneIfMissing) {
        return { ok: false, cloned: false, reason: "not-cloned", message: `Project '${alias}' is not available at '${projectPath}'.` };
    }
    if (!project.remote) {
        return {
            ok: false,
            cloned: false,
            reason: "missing-remote",
            message: `Project '${alias}' is missing at '${projectPath}' and has no 'remote' in registry.json.`,
        };
    }

    try {
        mkdirSync(dirname(projectPath), { recursive: true });
    } catch (err) {
        return {
            ok: false,
            cloned: false,
            reason: "parent-create-failed",
            message: `Could not create the parent directory for '${alias}': ${err?.message || err}`,
        };
    }

    const clone = spawnSync(
        "git",
        ["-c", "core.longpaths=true", "clone", "--quiet", "--", project.remote, projectPath],
        {
            encoding: "utf8",
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
            maxBuffer: 16 * 1024 * 1024,
            timeout: timeoutMs,
            windowsHide: true,
        },
    );

    if (clone.error || clone.status !== 0) {
        const detail = clone.error?.message || cloneFailureDetail(clone, project.remote) || `git exited with status ${clone.status}`;
        return {
            ok: false,
            cloned: false,
            reason: "clone-failed",
            message: `Could not clone '${alias}' into '${projectPath}': ${detail}`,
        };
    }

    const checkout = spawnSync("git", ["-C", projectPath, "rev-parse", "--git-dir"], {
        encoding: "utf8",
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        timeout: 30_000,
        windowsHide: true,
    });
    if (checkout.error || checkout.status !== 0) {
        return {
            ok: false,
            cloned: false,
            reason: "invalid-checkout",
            message: `Git reported success cloning '${alias}', but '${projectPath}' is not a valid checkout.`,
        };
    }

    return {
        ok: true,
        cloned: true,
        project,
        path: projectPath,
        message: `Cloned '${alias}' into '${projectPath}'.`,
    };
}

// Projects that should be auto-activated (context injected) on session start.
// Driven by an explicit `auto_activate: true` flag in registry.json.
export function listAutoActivate() {
    return listAll().filter((p) => p.auto_activate === true);
}

// Return the project whose `path` is an ancestor of (or equal to) `cwd`.
// Longest-path match wins so nested project layouts resolve correctly.
export function findProjectByCwd(cwd) {
    if (!cwd) return null;
    const normCwd = normalize(cwd).toLowerCase().replace(/[\\/]+$/, "");
    let best = null;
    for (const p of listAll()) {
        if (!p.path) continue;
        const normProj = normalize(p.path).toLowerCase().replace(/[\\/]+$/, "");
        if (normCwd === normProj || normCwd.startsWith(normProj + sep.toLowerCase()) || normCwd.startsWith(normProj + "/")) {
            if (!best || normProj.length > normalize(best.path).length) best = p;
        }
    }
    // Linked worktrees can live anywhere.
    const repository = findRepositoryProject(cwd, best ? [best] : listAll().filter((p) => p.path && existsSync(p.path)));
    return repository || best;
}
