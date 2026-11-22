import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";

import { END_MARKER, START_MARKER, renderBlock, updateProfileText } from "./install-shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const hqRoot = dirname(here);
const sandbox = realpathSync.native(mkdtempSync(join(tmpdir(), "eyrie-install-shell-test-")));
const home = join(sandbox, "home");
const env = { ...process.env, HOME: home, USERPROFILE: home };

after(() => rmSync(sandbox, { recursive: true, force: true }));

function install(...args) {
    return execFileSync(process.execPath, [join(here, "install-shell.mjs"), ...args], { encoding: "utf8", env });
}

test("adds, keeps, replaces and removes one marked block without touching other lines", () => {
    const profile = join(sandbox, "profiles", ".bashrc");
    mkdirSync(dirname(profile), { recursive: true });
    writeFileSync(profile, "alias ll='ls -l'\n");

    const added = install("--home", hqRoot, "--command", "hq", "--shell", "bash", "--profile-file", profile);
    assert.match(added, /bash: added Eyrie block/);
    const first = readFileSync(profile, "utf8");
    assert.ok(first.startsWith("alias ll='ls -l'\n# >>> eyrie >>>\n"));
    assert.match(first, /export EYRIE_COMMAND='hq'\n/);
    assert.match(first, /\. "\$EYRIE_HOME\/profile\.sh"\n# <<< eyrie <<<\n$/);

    assert.match(install("--home", hqRoot, "--command", "hq", "--shell", "bash", "--profile-file", profile), /unchanged/);
    assert.equal(readFileSync(profile, "utf8"), first);

    writeFileSync(profile, `${first}export AFTER=1\n`);
    assert.match(install("--home", hqRoot, "--command", "nest", "--profile-file", profile), /replaced Eyrie block/);
    const replaced = readFileSync(profile, "utf8");
    assert.match(replaced, /EYRIE_COMMAND='nest'/);
    assert.equal(replaced.split(START_MARKER).length, 2);
    assert.ok(replaced.endsWith(`${END_MARKER}\nexport AFTER=1\n`));

    assert.match(install("--uninstall", "--profile-file", profile), /removed Eyrie block/);
    assert.equal(readFileSync(profile, "utf8"), "alias ll='ls -l'\nexport AFTER=1\n");
    assert.match(install("--uninstall", "--profile-file", profile), /unchanged/);
});

test("dry run reports the change without writing anything", () => {
    const profile = join(sandbox, "dry", "user_profile.ps1");
    const output = install("--home", hqRoot, "--command", "eyrie", "--profile-file", profile, "--dry-run");
    assert.match(output, /\[dry-run\] pwsh: added Eyrie block/);
    assert.match(output, /\$env:EYRIE_COMMAND = 'eyrie'/);
    assert.equal(existsSync(profile), false);
});

test("leaves the repository-mode loader to enable and only refreshes an existing one", () => {
    const profile = join(sandbox, "loader", "profile.ps1");
    const loaderFile = join(home, ".copilot", "extensions", "eyrie", "extension.mjs");
    const output = install("--home", hqRoot, "--command", "eyrie", "--profile-file", profile);
    assert.match(output, /`eyrie enable <alias>` installs its loader/);
    assert.equal(existsSync(loaderFile), false);
    assert.match(readFileSync(profile, "utf8"), /\. \(Join-Path \$env:EYRIE_HOME 'profile\.ps1'\)/);

    mkdirSync(dirname(loaderFile), { recursive: true });
    writeFileSync(loaderFile, '// Installed under ~/.copilot/extensions/eyrie; stale\nconst eyrieHome = "/old/hq";\n');
    assert.match(install("--home", hqRoot, "--command", "eyrie", "--profile-file", profile), /Refreshed: repository-mode loader/);
    assert.ok(readFileSync(loaderFile, "utf8").includes(`const eyrieHome = ${JSON.stringify(hqRoot)};`));
    rmSync(dirname(loaderFile), { recursive: true, force: true });
});

test("quotes paths safely and preserves CRLF profiles", () => {
    assert.match(renderBlock("pwsh", "C:\\it's\\hq", "eyrie"), /\$env:EYRIE_HOME = 'C:\\it''s\\hq'/);
    assert.match(renderBlock("bash", "/it's/hq", "eyrie"), /export EYRIE_HOME='\/it'\\''s\/hq'/);
    const block = renderBlock("pwsh", "C:\\hq", "eyrie");
    const { text, action } = updateProfileText("Set-Alias g git\r\n", block);
    assert.equal(action, "added");
    assert.equal(text, `Set-Alias g git\r\n${block.replaceAll("\n", "\r\n")}\r\n`);
    assert.equal(updateProfileText(text, block, { uninstall: true }).text, "Set-Alias g git\r\n");
});

test("refuses to edit a profile with a broken or duplicate block", () => {
    const block = renderBlock("bash", "/hq", "eyrie");
    assert.throws(() => updateProfileText(`${START_MARKER}\nexport X=1\n`, block), /without/);
    assert.throws(() => updateProfileText(`${END_MARKER}\n`, block), /without/);
    assert.throws(() => updateProfileText(`${block}\n${block}\n`, block), /more than one/);
    assert.throws(() => install("--home", hqRoot, "--command", "bad name", "--shell", "bash", "--profile-file", join(sandbox, "x")), /Invalid command name/);
});
