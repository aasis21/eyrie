import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ensureProjectAvailable } from "./registry.mjs";

function withTempDir(run) {
    const root = mkdtempSync(join(tmpdir(), "eyrie-registry-test-"));
    try {
        run(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

test("returns an existing project without cloning", () => {
    withTempDir((root) => {
        const projectPath = join(root, "existing");
        mkdirSync(projectPath);

        const result = ensureProjectAvailable({
            alias: "existing",
            path: projectPath,
            remote: "unused",
        });

        assert.equal(result.ok, true);
        assert.equal(result.cloned, false);
    });
});

test("fails clearly when a missing project has no remote", () => {
    withTempDir((root) => {
        const projectPath = join(root, "missing");
        const result = ensureProjectAvailable({ alias: "missing", path: projectPath });

        assert.equal(result.ok, false);
        assert.equal(result.reason, "missing-remote");
        assert.match(result.message, /has no 'remote'/);
        assert.equal(existsSync(projectPath), false);
    });
});

test("clones a missing project into its registered path", () => {
    withTempDir((root) => {
        const remote = join(root, "remote.git");
        const projectPath = join(root, "checkouts", "sample");
        execFileSync("git", ["init", "--bare", "--quiet", remote]);

        const result = ensureProjectAvailable({
            alias: "sample",
            path: projectPath,
            remote,
        });

        assert.equal(result.ok, true);
        assert.equal(result.cloned, true);
        assert.equal(existsSync(join(projectPath, ".git")), true);
    });
});
