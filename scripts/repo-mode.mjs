#!/usr/bin/env node
// Toggle a project's `enabled` flag in registry.json and install the repository-mode
// loader into ~/.copilot/extensions/eyrie. Shared by profile.ps1 and profile.sh.
//
// Usage:
//   node scripts/repo-mode.mjs enable <alias> [--home <hq>]
//   node scripts/repo-mode.mjs disable <alias> [--home <hq>]
//   node scripts/repo-mode.mjs install [--home <hq>]

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveProjectPath } from "../.github/extensions/eyrie/projects/registry.mjs";

const DEFAULT_HOME = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const LOADER_MARKER = "// Installed under ~/.copilot/extensions/eyrie;";

export function loaderPath() {
    return join(homedir(), ".copilot", "extensions", "eyrie", "extension.mjs");
}

export function installLoader(home) {
    const target = loaderPath();
    if (existsSync(target) && !readFileSync(target, "utf8").startsWith(LOADER_MARKER)) {
        throw new Error(`An unrelated extension exists at '${target}'; refusing to overwrite it.`);
    }
    const template = readFileSync(join(home, "scripts", "repo-mode-loader.mjs"), "utf8");
    const source = template.replace('"__EYRIE_HOME__"', JSON.stringify(home));
    const previous = existsSync(target) ? readFileSync(target, "utf8") : null;
    if (previous === source) return { path: target, changed: false };
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
    return { path: target, changed: true };
}

// Minimal JSON scanner that records value spans so edits keep the user's formatting.
function scanJson(text) {
    let i = 0;
    const skip = () => { while (/\s/.test(text[i] || "")) i += 1; };
    const string = () => {
        const start = i;
        i += 1;
        while (text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
        i += 1;
        return JSON.parse(text.slice(start, i));
    };
    const value = () => {
        skip();
        const start = i;
        if (text[i] === "{" || text[i] === "[") {
            const object = text[i] === "{";
            const close = object ? "}" : "]";
            const members = {};
            i += 1;
            skip();
            while (text[i] !== close) {
                if (object) {
                    const key = string();
                    skip();
                    i += 1;
                    members[key] = value();
                } else {
                    value();
                }
                skip();
                if (text[i] === ",") { i += 1; skip(); }
            }
            i += 1;
            return { start, end: i, members };
        }
        if (text[i] === '"') { string(); return { start, end: i }; }
        while (i < text.length && !/[\s,\]}]/.test(text[i])) i += 1;
        return { start, end: i };
    };
    return value();
}

export function setProjectEnabled(home, alias, enabled) {
    const registryFile = join(home, "registry.json");
    const original = readFileSync(registryFile, "utf8");
    const text = original.replace(/^\uFEFF/, "");
    const registry = JSON.parse(text);
    const project = alias.startsWith("_") ? undefined : registry.projects?.[alias];
    if (!project || typeof project !== "object") {
        throw new Error(`Unknown Eyrie project '${alias}'. Check ${registryFile}.`);
    }
    if (project.enabled !== undefined && typeof project.enabled !== "boolean") {
        throw new Error(`Project '${alias}' must use a boolean enabled flag.`);
    }
    if (enabled) {
        const path = resolveProjectPath(project.path, home);
        if (!path || !existsSync(path) || !statSync(path).isDirectory()) {
            throw new Error(`Project '${alias}' is unavailable at '${path}'. Clone or activate it before enabling repository mode.`);
        }
        const identity = spawnSync("git", ["-C", path, "rev-parse", "--git-common-dir"], { encoding: "utf8" });
        if (identity.status !== 0) {
            throw new Error(`Project '${alias}' is not a usable Git repository: ${(identity.stderr || identity.error?.message || "").trim()}`);
        }
    }
    if (project.enabled === enabled) return { path: registryFile, changed: false };

    const span = scanJson(text).members.projects.members[alias];
    const literal = String(enabled);
    let updated;
    if (span.members.enabled) {
        const flag = span.members.enabled;
        updated = text.slice(0, flag.start) + literal + text.slice(flag.end);
    } else {
        const body = text.slice(span.start, span.end);
        const newline = text.includes("\r\n") ? "\r\n" : "\n";
        const indent = /^([ \t]+)"/m.exec(body)?.[1];
        const insertion = Object.keys(span.members).length === 0
            ? `"enabled": ${literal}`
            : indent ? `${newline}${indent}"enabled": ${literal},` : `"enabled": ${literal}, `;
        updated = text.slice(0, span.start + 1) + insertion + text.slice(span.start + 1);
    }
    if (original.startsWith("\uFEFF")) updated = `\uFEFF${updated}`;
    if (readFileSync(registryFile, "utf8") !== original) {
        throw new Error("registry.json changed during the update; retry instead of overwriting concurrent changes.");
    }
    writeFileSync(registryFile, updated);
    return { path: registryFile, changed: true };
}

function parseArgs(argv) {
    const args = { home: process.env.EYRIE_HOME || DEFAULT_HOME, positional: [] };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === "--home") args.home = argv[++i];
        else args.positional.push(argv[i]);
    }
    args.home = resolve(args.home);
    return args;
}

export function main(argv) {
    const { home, positional: [action, alias] } = parseArgs(argv);
    if (action === "install" && !alias) {
        const loader = installLoader(home);
        console.log(`${loader.changed ? "Installed" : "Up to date"}: repository-mode loader at ${loader.path}`);
        return;
    }
    if (!["enable", "disable"].includes(action) || !alias) {
        throw new Error("Usage: repo-mode.mjs enable|disable <alias> | install [--home <hq>]");
    }
    const enabled = action === "enable";
    const registry = setProjectEnabled(home, alias, enabled);
    const loader = installLoader(home);
    console.log(`Repository mode ${enabled ? "enabled" : "disabled"} for '${alias}'${registry.changed ? "" : " (unchanged)"} in ${registry.path}`);
    if (loader.changed) console.log(`Installed repository-mode loader at ${loader.path}`);
    console.log("Applies to new Copilot CLI sessions in this repository and its worktrees. No project files changed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        main(process.argv.slice(2));
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    }
}
