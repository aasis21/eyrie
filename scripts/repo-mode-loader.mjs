// Installed under ~/.copilot/extensions/eyrie; only explicitly enabled repositories load the HQ extension.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { joinSession } from "@github/copilot-sdk/extension";

// The installer substitutes only the HQ path; opt-ins stay in registry.json.
const eyrieHome = "__EYRIE_HOME__";
const extensionRoot = join(eyrieHome, ".github", "extensions", "eyrie");
const { enabledFolderProject } = await import(
    pathToFileURL(join(extensionRoot, "projects", "folder-scope.mjs")).href
);
const project = enabledFolderProject(process.cwd());
if (project) {
    await import(pathToFileURL(join(extensionRoot, "extension.mjs")).href);
} else {
    await joinSession({});
}
