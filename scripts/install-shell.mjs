#!/usr/bin/env node
// Add, replace or remove the Eyrie block in shell profiles, and install the
// repository-mode loader. Touches nothing outside the marked block.
//
// Usage:
//   node scripts/install-shell.mjs --home <hq> --command <name>
//        [--shell pwsh|bash|zsh|all-detected] [--profile-file <path>] [--uninstall] [--dry-run]

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { installLoader, loaderPath } from "./repo-mode.mjs";

export const START_MARKER = "# >>> eyrie >>>";
export const END_MARKER = "# <<< eyrie <<<";
const SHELLS = ["pwsh", "bash", "zsh"];

export function parseArgs(argv) {
    const args = { shell: "all-detected", uninstall: false, dryRun: false, command: "eyrie" };
    const value = (i) => {
        if (argv[i + 1] === undefined) throw new Error(`Missing value for ${argv[i]}.`);
        return argv[i + 1];
    };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        if (flag === "--home") args.home = value(i++);
        else if (flag === "--command") args.command = value(i++);
        else if (flag === "--shell") args.shell = value(i++);
        else if (flag === "--profile-file") args.profileFile = value(i++);
        else if (flag === "--uninstall") args.uninstall = true;
        else if (flag === "--dry-run") args.dryRun = true;
        else throw new Error(`Unknown option '${flag}'.`);
    }
    if (!args.uninstall && !args.home) throw new Error("--home <path> is required.");
    if (args.home) args.home = resolve(args.home);
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(args.command)) {
        throw new Error(`Invalid command name '${args.command}'. Use letters, digits, '_' or '-'.`);
    }
    if (![...SHELLS, "all-detected"].includes(args.shell)) {
        throw new Error(`Unknown shell '${args.shell}'. Use pwsh, bash, zsh or all-detected.`);
    }
    if (args.profileFile && args.shell === "all-detected") {
        args.shell = extname(args.profileFile).toLowerCase() === ".ps1" ? "pwsh" : "bash";
    }
    return args;
}

function onPath(name) {
    const extensions = process.platform === "win32" ? (process.env.PATHEXT || ".EXE").split(";") : [""];
    return (process.env.PATH || "").split(delimiter).filter(Boolean)
        .some((dir) => extensions.some((ext) => existsSync(join(dir, name + ext))));
}

function detectShells() {
    if (process.platform === "win32") {
        return onPath("pwsh") || onPath("powershell") ? ["pwsh"] : [];
    }
    return SHELLS.filter(onPath);
}

function powershellProfile() {
    for (const exe of ["pwsh", "powershell"]) {
        const result = spawnSync(exe, ["-NoProfile", "-Command", "$PROFILE.CurrentUserCurrentHost"], { encoding: "utf8" });
        const path = result.status === 0 ? result.stdout.trim() : "";
        if (path) return path;
    }
    throw new Error("Cannot resolve the PowerShell profile path: neither pwsh nor powershell ran.");
}

function profileFor(shell) {
    if (shell === "pwsh") return powershellProfile();
    return join(homedir(), shell === "zsh" ? ".zshrc" : ".bashrc");
}

export function renderBlock(shell, home, command, newline = "\n") {
    let lines;
    if (shell === "pwsh") {
        const quote = (text) => `'${text.replaceAll("'", "''")}'`;
        lines = [
            `$env:EYRIE_HOME = ${quote(home)}`,
            `$env:EYRIE_COMMAND = ${quote(command)}`,
            ". (Join-Path $env:EYRIE_HOME 'profile.ps1')",
        ];
    } else {
        const quote = (text) => `'${text.replaceAll("'", `'\\''`)}'`;
        const shellHome = process.platform === "win32" ? home.replaceAll("\\", "/") : home;
        lines = [
            `export EYRIE_HOME=${quote(shellHome)}`,
            `export EYRIE_COMMAND=${quote(command)}`,
            '. "$EYRIE_HOME/profile.sh"',
        ];
    }
    return [START_MARKER, ...lines, END_MARKER].join(newline);
}

// Returns the new profile text and what happened to the block.
export function updateProfileText(text, block, { uninstall = false } = {}) {
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    block = block.replaceAll(/\r?\n/g, newline);
    const start = text.indexOf(START_MARKER);
    const end = start === -1 ? -1 : text.indexOf(END_MARKER, start);
    if (start !== -1 && end === -1) {
        throw new Error(`Found '${START_MARKER}' without '${END_MARKER}'; fix the profile by hand.`);
    }
    if (start === -1 && text.includes(END_MARKER)) {
        throw new Error(`Found '${END_MARKER}' without '${START_MARKER}'; fix the profile by hand.`);
    }
    if (start !== -1 && text.indexOf(START_MARKER, end) !== -1) {
        throw new Error("Found more than one Eyrie block; fix the profile by hand.");
    }
    if (start === -1) {
        if (uninstall) return { text, action: "none" };
        const separator = text && !text.endsWith("\n") ? newline : "";
        return { text: `${text}${separator}${block}${newline}`, action: "added" };
    }
    let blockEnd = end + END_MARKER.length;
    if (uninstall) {
        if (text.startsWith("\r\n", blockEnd)) blockEnd += 2;
        else if (text[blockEnd] === "\n") blockEnd += 1;
        return { text: text.slice(0, start) + text.slice(blockEnd), action: "removed" };
    }
    if (text.slice(start, blockEnd) === block) return { text, action: "none" };
    return { text: text.slice(0, start) + block + text.slice(blockEnd), action: "replaced" };
}

export function run(argv, log = console.log) {
    const args = parseArgs(argv);
    const shells = args.shell === "all-detected" ? detectShells() : [args.shell];
    if (!shells.length) throw new Error("No supported shell detected. Pass --shell pwsh|bash|zsh.");
    const prefix = args.dryRun ? "[dry-run] " : "";
    for (const shell of shells) {
        const file = args.profileFile ? resolve(args.profileFile) : profileFor(shell);
        const before = existsSync(file) ? readFileSync(file, "utf8") : "";
        const block = renderBlock(shell, args.home || "", args.command);
        const { text, action } = updateProfileText(before, block, { uninstall: args.uninstall });
        if (action === "none") {
            log(`${prefix}${shell}: ${file} unchanged.`);
            continue;
        }
        if (!args.dryRun) {
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, text);
        }
        log(`${prefix}${shell}: ${action} Eyrie block in ${file}`);
        if (action !== "removed") log(block.split("\n").map((line) => `    ${line}`).join("\n"));
    }
    if (args.uninstall) {
        log(`Left the repository-mode loader at ${loaderPath()}; delete it by hand if no longer needed.`);
    } else if (args.dryRun) {
        log(`${prefix}Would install the repository-mode loader at ${loaderPath()}`);
    } else {
        const loader = installLoader(args.home);
        log(`${loader.changed ? "Installed" : "Unchanged"}: repository-mode loader at ${loader.path}`);
    }
    if (!args.dryRun) log("Open a new terminal (or reload your profile) to use the command.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        run(process.argv.slice(2));
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    }
}
