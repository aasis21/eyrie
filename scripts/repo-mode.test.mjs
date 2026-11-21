import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, beforeEach } from "node:test";

import { installLoader, loaderPath, setProjectEnabled } from "./repo-mode.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sandbox = realpathSync.native(mkdtempSync(join(tmpdir(), "eyrie-repo-mode-test-")));
const hq = join(sandbox, "hq");
const project = join(sandbox, "project");
const registryFile = join(hq, "registry.json");
const previous = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };

mkdirSync(join(hq, "scripts"), { recursive: true });
copyFileSync(join(here, "repo-mode-loader.mjs"), join(hq, "scripts", "repo-mode-loader.mjs"));
execFileSync("git", ["init", "--quiet", project]);
process.env.HOME = process.env.USERPROFILE = join(sandbox, "home");

const registryText = [
    "{",
    '  "version": 1,',
    '  "projects": {',
    "    \"demo\": {",
    `      "path": ${JSON.stringify(project)},`,
    '      "tags": ["a", "b"]',
    "    },",
    `    "flagged": { "path": ${JSON.stringify(project)}, "enabled": false },`,
    '    "missing": { "path": "does-not-exist", "enabled": true },',
    '    "odd": { "path": "x", "enabled": "yes" }',
    "  },",
    '  "_example": { "demo": { "path": "x" } }',
    "}",
    "",
].join("\r\n");

beforeEach(() => {
    writeFileSync(registryFile, registryText);
    rmSync(join(sandbox, "home"), { recursive: true, force: true });
});

after(() => {
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    rmSync(sandbox, { recursive: true, force: true });
});

test("enable inserts the flag in place and disable flips it, keeping formatting", () => {
    assert.equal(setProjectEnabled(hq, "demo", true).changed, true);
    const enabled = readFileSync(registryFile, "utf8");
    assert.equal(enabled, registryText.replace('"demo": {', '"demo": {\r\n      "enabled": true,'));
    assert.equal(JSON.parse(enabled).projects.demo.enabled, true);
    assert.equal(setProjectEnabled(hq, "demo", true).changed, false);

    assert.equal(setProjectEnabled(hq, "demo", false).changed, true);
    assert.equal(readFileSync(registryFile, "utf8"), enabled.replace('"enabled": true', '"enabled": false'));

    setProjectEnabled(hq, "flagged", true);
    assert.match(readFileSync(registryFile, "utf8"), /"flagged": \{ "path": .*, "enabled": true \},/);
});

test("rejects unknown, underscore, non-boolean and unavailable projects", () => {
    assert.throws(() => setProjectEnabled(hq, "nope", true), /Unknown Eyrie project 'nope'/);
    assert.throws(() => setProjectEnabled(hq, "_example", true), /Unknown Eyrie project/);
    assert.throws(() => setProjectEnabled(hq, "odd", false), /boolean enabled flag/);
    assert.throws(() => setProjectEnabled(hq, "missing", true), /is unavailable at/);
    assert.equal(setProjectEnabled(hq, "missing", false).changed, true);
    assert.equal(JSON.parse(readFileSync(registryFile, "utf8")).projects.missing.enabled, false);
});

test("installs the loader with the HQ path and never overwrites an unrelated extension", () => {
    const first = installLoader(hq);
    assert.equal(first.path, loaderPath());
    assert.equal(first.changed, true);
    const loader = readFileSync(first.path, "utf8");
    assert.ok(loader.startsWith("// Installed under ~/.copilot/extensions/eyrie;"));
    assert.ok(loader.includes(`const eyrieHome = ${JSON.stringify(hq)};`));
    assert.equal(installLoader(hq).changed, false);

    writeFileSync(first.path, "// someone else's extension\n");
    assert.throws(() => installLoader(hq), /refusing to overwrite/);
    assert.equal(readFileSync(first.path, "utf8"), "// someone else's extension\n");
});

test("the CLI enables a project and installs the loader", () => {
    const output = execFileSync(process.execPath, [join(here, "repo-mode.mjs"), "enable", "demo", "--home", hq], {
        encoding: "utf8",
        env: { ...process.env },
    });
    assert.match(output, /Repository mode enabled for 'demo'/);
    assert.equal(existsSync(loaderPath()), true);
});
