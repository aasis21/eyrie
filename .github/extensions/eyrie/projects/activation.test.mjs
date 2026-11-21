import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

import {
    activateProject,
    activeAliases,
    activeScopeContext,
    bootstrap,
    deactivateProject,
    flushPendingContext,
    nextActiveScopeContext,
    peekProject,
    searchCopilotAssets,
    sessionMode,
    statusText,
} from "./activation.mjs";
import { eyrieRoot, listAll, reload } from "./registry.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: "pipe" });

function writeSkill(root, name, description = "Fixture guidance") {
    const skill = join(root, ".github", "skills", name);
    mkdirSync(skill, { recursive: true });
    writeFileSync(join(skill, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\nBody mentions quasarcheckpoint.\n`);
}

function writeRegistry(home, projects) {
    writeFileSync(join(home, "registry.json"), JSON.stringify({ version: 1, projects }, null, 2));
    reload();
}

// A hermetic HQ: a Git repository with its own registry and shared skill.
const sandbox = realpathSync.native(mkdtempSync(join(tmpdir(), "eyrie-activation-test-")));
const hq = join(sandbox, "hq");
const alpha = join(sandbox, "alpha");
git("init", "--quiet", hq);
writeSkill(hq, "hq-workflow", "Shared HQ routing workflow");
writeSkill(alpha, "alpha-release", "Release notes workflow");
mkdirSync(join(alpha, ".github", "prompts"), { recursive: true });
writeFileSync(join(alpha, ".github", "prompts", "ship.prompt.md"), "---\ndescription: Ship a release workflow\n---\n");
for (let i = 0; i < 35; i += 1) writeSkill(alpha, `bulk-workflow-${i}`);
const baseProjects = {
    alpha: { path: alpha, description: "Alpha project", auto_activate: true },
    _note: { path: "ignored", description: "Keys starting with _ are ignored" },
};
const previousHome = process.env.EYRIE_HOME;
process.env.EYRIE_HOME = hq;
writeRegistry(hq, baseProjects);

after(() => {
    if (previousHome === undefined) delete process.env.EYRIE_HOME;
    else process.env.EYRIE_HOME = previousHome;
    rmSync(sandbox, { recursive: true, force: true });
});

test("ignores registry keys that start with an underscore", () => {
    assert.deepEqual(listAll().map((project) => project.alias), ["alpha"]);
});

test("returns 30 results by default and preserves total count", () => {
    bootstrap({ cwd: hq });
    const result = searchCopilotAssets({ query: "workflow" });

    assert.equal(result.ok, true);
    assert.equal(result.top, 30);
    assert.ok(result.totalHits > result.hits.length);
    assert.equal(result.hits.length, 30);
    assert.match(result.rendered, /Showing 30 of \d+ ranked matches/);
    assert.match(result.rendered, /lexical fuzzy token matching, not semantic intent search/);
    assert.match(result.rendered, /eyrie_peek\(project\)/);
});

test("exposes shared HQ workflows through project-scoped peek and search", () => {
    const peek = peekProject("eyrie", { kind: "skill" });
    assert.equal(peek.ok, true);
    assert.match(peek.catalog, /hq-workflow/);
    const search = searchCopilotAssets({ project: "eyrie", query: "hq-workflow" });
    assert.equal(search.ok, true);
    assert.ok(search.hits.some((hit) => hit.projectAlias === "eyrie" && hit.name === "hq-workflow"));
});

test("accepts top up to 500 and rejects values outside the range", () => {
    assert.equal(searchCopilotAssets({ query: "workflow", top: 500 }).top, 500);
    assert.equal(searchCopilotAssets({ query: "workflow", top: 0 }).ok, false);
    assert.equal(searchCopilotAssets({ query: "workflow", top: 501 }).ok, false);
});

test("deep search reaches asset bodies and explains the peek fallback", () => {
    assert.equal(searchCopilotAssets({ query: "quasarcheckpoint", project: "alpha" }).hits.length, 0);
    const result = searchCopilotAssets({ query: "quasarcheckpoint", project: "alpha", deep: true, top: 10 });
    assert.equal(result.ok, true);
    assert.ok(result.hits.length > 0);
    assert.match(result.rendered, /deep=true.*complete Copilot asset bodies/);
    assert.match(result.rendered, /eyrie_peek\(project="alpha"\)/);
});

test("HQ startup auto-activates projects with a compact name index", () => {
    const context = bootstrap({ cwd: hq });

    assert.equal(sessionMode(), "hq");
    assert.deepEqual(activeAliases(), ["alpha"]);
    assert.match(context, /# Eyrie — cross-repo Copilot asset scope/);
    assert.match(context, /# Available Copilot asset names: `alpha`/);
    assert.match(context, /Eyrie active scope:/);
    assert.match(context, /alpha: .*; 36 skills, 1 prompts/);
    assert.doesNotMatch(context, /Release notes workflow/);
    assert.match(statusText(), /^Mode: HQ/);
    assert.match(statusText(), /→ alpha \[auto\]/);
    assert.match(activeScopeContext(), /Eyrie active scope:/);
});

test("emits scope context after a change and then every five prompts", () => {
    bootstrap({ cwd: hq });
    assert.equal(deactivateProject("alpha").ok, true);
    assert.match(nextActiveScopeContext(), /no projects are active/);
    assert.equal(nextActiveScopeContext(), null);
    const activated = activateProject("alpha", { injectOnNextTurn: true });
    assert.equal(activated.ok, true);
    assert.match(activated.catalog, /# Activated: `alpha`/);
    assert.equal(flushPendingContext(), activated.catalog);
    assert.equal(flushPendingContext(), null);

    assert.match(nextActiveScopeContext(), /Eyrie active scope:/);
    for (let prompt = 1; prompt <= 4; prompt += 1) {
        assert.equal(nextActiveScopeContext(), null);
    }
    assert.match(nextActiveScopeContext(), /Eyrie active scope:/);
});

test("HQ subfolders retain HQ mode", () => {
    const context = bootstrap({ cwd: join(hq, ".github", "skills") });
    assert.equal(sessionMode(), "hq");
    assert.doesNotMatch(context, /Primary checkout:/);
});

test("a non-Git HQ folder is recognized by path", () => {
    const plainHq = join(sandbox, "plain-hq");
    mkdirSync(plainHq);
    process.env.EYRIE_HOME = plainHq;
    try {
        writeRegistry(plainHq, {});
        bootstrap({ cwd: plainHq });
        assert.equal(sessionMode(), "hq");
        assert.equal(eyrieRoot(), plainHq);
    } finally {
        process.env.EYRIE_HOME = hq;
        reload();
    }
});

test("clones lazily only on explicit activate, peek, or project search", () => {
    const remote = join(sandbox, "remote.git");
    const seed = join(sandbox, "seed");
    git("init", "--quiet", seed);
    writeSkill(seed, "remote-workflow");
    git("-C", seed, "add", ".");
    git("-C", seed, "-c", "user.name=Eyrie test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "seed");
    git("clone", "--quiet", "--bare", seed, remote);
    const missing = join(sandbox, "checkouts", "remote-project");
    try {
        writeRegistry(hq, { ...baseProjects, beta: { path: missing, remote, auto_activate: true } });

        const context = bootstrap({ cwd: hq });
        assert.match(context, /Auto-activation pending: `beta`/);
        const broad = searchCopilotAssets({ query: "remote-workflow" });
        assert.match(broad.rendered, /Skipped unavailable projects: beta/);
        assert.equal(existsSync(missing), false);

        const search = searchCopilotAssets({ project: "beta", query: "remote-workflow" });
        assert.equal(search.ok, true);
        assert.match(search.rendered, /Cloned 'beta'/);
        assert.equal(search.hits[0].name, "remote-workflow");
        assert.equal(existsSync(join(missing, ".git")), true);
    } finally {
        writeRegistry(hq, baseProjects);
    }
});

function withRepositoryProjects(run) {
    const root = realpathSync.native(mkdtempSync(join(tmpdir(), "eyrie-repository-test-")));
    const base = join(root, "runtime");
    const secondary = join(root, "controlplane");
    const worktree = join(root, "runtime worktree");
    try {
        git("init", "--quiet", base);
        git("-C", base, "-c", "user.name=Eyrie test", "-c", "user.email=test@example.invalid",
            "commit", "--quiet", "--allow-empty", "-m", "fixture");
        git("-C", base, "worktree", "add", "--quiet", "--detach", worktree);
        for (const path of [base, secondary, worktree]) writeSkill(path, "fixture-workflow");
        writeRegistry(hq, {
            runtime: { path: base, auto_activate: true },
            controlplane: { path: secondary, auto_activate: true },
        });
        run({ root, base, secondary, worktree });
    } finally {
        writeRegistry(hq, baseProjects);
        rmSync(root, { recursive: true, force: true });
    }
}

test("repository mode startup uses the primary checkout without catalogs or HQ defaults", () => {
    withRepositoryProjects(({ base }) => {
        const context = bootstrap({ cwd: base });
        assert.equal(context, [
            "# Eyrie",
            `Primary checkout: ${base}. Follow its local instructions.`,
            "",
            'Use eyrie_search or eyrie_peek to find workflows; project="eyrie" selects shared',
            "HQ skills. Read selected files in full.",
            "",
            "Tools also support project activation, independent-session messaging,",
            "and approved remote agents. Command: /eyrie.",
            "",
            `Eyrie HQ: ${hq}`,
        ].join("\n"));
        assert.deepEqual(activeAliases(), []);
        assert.equal(sessionMode(), "repository");
        assert.match(statusText(), /^Mode: Repository/);
        assert.match(statusText(), /Primary project: runtime/);
        assert.match(statusText(), /Additional active projects: \(none\)/);
        assert.doesNotMatch(statusText(), /\[auto\]/);
    });
});

test("repository mode reminders repeat every five prompts without active scopes", () => {
    withRepositoryProjects(({ base }) => {
        bootstrap({ cwd: base });
        for (let cycle = 0; cycle < 2; cycle += 1) {
            for (let prompt = 1; prompt <= 4; prompt += 1) {
                assert.equal(nextActiveScopeContext(), null);
            }
            assert.equal(
                nextActiveScopeContext(),
                "Eyrie: follow local instructions. Discover workflows with eyrie_search or eyrie_peek.",
            );
        }
    });
});

test("repository mode secondary activation queues identity without a catalog and preserves primary", () => {
    withRepositoryProjects(({ base, secondary }) => {
        bootstrap({ cwd: base });
        const result = activateProject("controlplane", { injectOnNextTurn: true });
        assert.equal(result.ok, true);
        assert.ok(result.catalog.includes(`Path: ${secondary}`));
        assert.ok(result.catalog.includes(`Primary checkout: ${base}`));
        assert.match(result.catalog, /eyrie_peek\(project="controlplane"\)/);
        assert.doesNotMatch(result.catalog, /fixture-workflow|## Skills/);
        assert.equal(flushPendingContext(), result.catalog);
        assert.equal(flushPendingContext(), null);
        assert.deepEqual(activeAliases(), ["controlplane"]);
        assert.match(nextActiveScopeContext(), /Additional scope: controlplane/);
        assert.equal(nextActiveScopeContext(), null);
        assert.match(peekProject("controlplane").catalog, /fixture-workflow/);
        assert.equal(deactivateProject("controlplane").ok, true);
        assert.deepEqual(activeAliases(), []);
    });
});

test("repository mode primary stays separate and worktree discovery uses the opened root", () => {
    withRepositoryProjects(({ base, worktree }) => {
        const child = join(worktree, "src");
        mkdirSync(child);
        const context = bootstrap({ cwd: child });
        assert.ok(context.includes(`Primary checkout: ${worktree}.`));
        assert.equal(activateProject("runtime").ok, true);
        assert.deepEqual(activeAliases(), []);
        assert.equal(deactivateProject("runtime").ok, false);
        const search = searchCopilotAssets({ project: "runtime", query: "fixture-workflow" });
        assert.equal(search.hits[0].absolutePath, join(worktree, ".github", "skills", "fixture-workflow", "SKILL.md"));
        assert.match(peekProject("eyrie", { kind: "skill" }).catalog, /hq-workflow/);
        assert.ok(!context.includes(`Primary checkout: ${base}.`));
    });
});

test("unmatched repository mode folders do not inherit HQ auto-activation", () => {
    withRepositoryProjects(({ root }) => {
        const context = bootstrap({ cwd: root });
        assert.ok(context.includes(`Primary checkout: ${root}.`));
        assert.deepEqual(activeAliases(), []);
        assert.match(statusText(), /Primary project: \(unregistered\)/);
    });
});
