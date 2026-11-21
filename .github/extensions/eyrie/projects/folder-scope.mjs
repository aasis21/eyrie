import { existsSync } from "node:fs";

import { listAll, registryPath, reload } from "./registry.mjs";
import { findRepositoryProject } from "./repository.mjs";

export function enabledFolderProject(cwd, projects) {
    if (projects === undefined) {
        const registry = reload();
        if (registry._error || registry.version === 0) {
            throw new Error(`Cannot read Eyrie registry '${registryPath()}': ${registry._error || "registry is missing"}`);
        }
        projects = listAll();
    }
    for (const project of projects) {
        if (project.enabled !== undefined && typeof project.enabled !== "boolean") {
            throw new Error(`Project '${project.alias}' must use a boolean enabled flag in registry.json.`);
        }
        if (project.enabled === true && (typeof project.path !== "string" || !project.path)) {
            throw new Error(`Enabled Eyrie project '${project.alias}' has no path in registry.json.`);
        }
    }
    const enabled = projects.filter((project) => project.enabled === true && existsSync(project.path));
    return enabled.length ? findRepositoryProject(cwd, enabled) : null;
}
