import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { normalize } from "node:path";

export function pathKey(path) {
    const normalized = normalize(path).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function repositoryIdentity(cwd) {
    const result = spawnSync("git", [
        "-C", cwd, "rev-parse", "--show-toplevel", "--path-format=absolute", "--git-common-dir",
    ], { encoding: "utf8", timeout: 10_000, windowsHide: true });
    if (result.error) throw new Error(`Cannot inspect repository '${cwd}': ${result.error.message}`);
    if (result.status !== 0) {
        if (/not a git repository|cannot change to .*No such file or directory/i.test(result.stderr || "")) return null;
        throw new Error(`Cannot inspect repository '${cwd}': ${(result.stderr || "").trim()}`);
    }
    const [root, commonDir] = result.stdout.trim().split(/\r?\n/);
    if (!root || !commonDir) throw new Error(`Git returned an incomplete repository identity for '${cwd}'.`);
    return { root: realpathSync(root), commonDir: realpathSync(commonDir) };
}

export function findRepositoryProject(cwd, projects) {
    const identity = repositoryIdentity(cwd);
    if (!identity) return null;
    for (const project of projects) {
        const registered = repositoryIdentity(project.path);
        if (registered && pathKey(identity.commonDir) === pathKey(registered.commonDir)) {
            return { ...project, path: identity.root };
        }
    }
    return null;
}
