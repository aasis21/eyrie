import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLore, loreReadNote, resolveArea } from "./lore.mjs";

function withHq(fn) {
    const hq = mkdtempSync(join(tmpdir(), "eyrie-lore-"));
    try {
        return fn(hq);
    } finally {
        rmSync(hq, { recursive: true, force: true });
    }
}

test("is silent when lore/ is not installed", () => withHq((hq) => {
    const lore = createLore({ hqHome: hq });
    assert.equal(lore.startupContext({ mode: "hq", getProject: () => null }), "");
    assert.equal(lore.reminder(), "");
}));

test("resolves the area from the primary project or the registry default", () => {
    const getProject = (alias) => (alias === "web" ? { area: "work" } : null);
    assert.equal(resolveArea({ mode: "repository", primaryAlias: "web", getProject, defaultArea: "home" }), "work");
    assert.equal(resolveArea({ mode: "repository", primaryAlias: "other", getProject, defaultArea: "home" }), null);
    assert.equal(resolveArea({ mode: "hq", getProject }), null);
    assert.equal(resolveArea({ mode: "hq", getProject, defaultArea: "home" }), "home");
});

test("injects me.md, the area overview capped, and topic descriptions", () => withHq((hq) => {
    const root = join(hq, "lore");
    mkdirSync(join(root, "work"), { recursive: true });
    mkdirSync(join(root, "home"), { recursive: true });
    writeFileSync(join(root, "me.md"), "---\ndescription: me\n---\n- Answer briefly.");
    writeFileSync(join(root, "tools.md"), "---\ndescription: \"Shared tool gotchas\"\n---\nbody");
    writeFileSync(join(root, "work", "overview.md"), "x".repeat(5000));
    writeFileSync(join(root, "work", "builds.md"), "---\ndescription: Build quirks\n---\n");
    writeFileSync(join(root, "home", "garden.md"), "---\ndescription: Garden\n---\n");

    const lore = createLore({ hqHome: hq });
    const context = lore.startupContext({
        mode: "repository",
        primaryAlias: "web",
        getProject: () => ({ area: "work" }),
    });
    assert.match(context, /Answer briefly\./);
    assert.match(context, /## Area: work \(overview\.md\)/);
    assert.match(context, /truncated/);
    assert.ok(!context.includes("x".repeat(4001)));
    assert.match(context, /tools\.md` — Shared tool gotchas/);
    assert.match(context, /builds\.md` — Build quirks/);
    assert.doesNotMatch(context, /garden/i);
    assert.match(lore.reminder(), /^Lore: .*Learned: \.\.\./);
}));

test("notes how old a Lore file is only when it is read with a file-read tool", () => withHq((hq) => {
    const root = join(hq, "lore");
    mkdirSync(root);
    const file = join(root, "me.md");
    writeFileSync(file, "x");
    const now = Date.now();
    utimesSync(file, new Date(now - 3 * 86_400_000), new Date(now - 3 * 86_400_000));

    assert.match(loreReadNote({ toolName: "view", toolArgs: { path: file } }, root, now), /me\.md last edited 3 days ago/);
    assert.equal(loreReadNote({ toolName: "edit", toolArgs: { path: file } }, root, now), "");
    assert.equal(loreReadNote({ toolName: "view", toolArgs: { path: join(hq, "AGENTS.md") } }, root, now), "");
    assert.equal(createLore({ hqHome: hq }).postToolUse({ toolName: "powershell", toolArgs: {} }), undefined);
}));
