import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { enabledFolderProject } from "./folder-scope.mjs";
import { findRepositoryProject, pathKey, repositoryIdentity } from "./repository.mjs";

function withRepositories(run) {
    const root = mkdtempSync(join(tmpdir(), "eyrie-folder-test-"));
    const base = join(root, "base checkout");
    const worktree = join(root, "outside configured worktree root");
    const other = join(root, "other");
    const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: "pipe" });
    try {
        git("init", "--quiet", base);
        git("-C", base, "-c", "user.name=Eyrie test", "-c", "user.email=test@example.invalid",
            "commit", "--quiet", "--allow-empty", "-m", "fixture");
        git("-C", base, "worktree", "add", "--quiet", "--detach", worktree);
        git("init", "--quiet", other);
        run({ root, base, worktree, other, git });
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

test("matches opted-in repositories and worktrees by shared Git identity without writing target files", () => {
    withRepositories(({ base, worktree, other, git }) => {
        const projects = [{ alias: "runtime", path: base }];
        const before = git("-C", base, "status", "--porcelain");
        assert.equal(findRepositoryProject(base, projects)?.path, repositoryIdentity(base).root);
        assert.equal(findRepositoryProject(worktree, projects)?.path, repositoryIdentity(worktree).root);
        const child = join(worktree, "child");
        mkdirSync(child);
        assert.equal(findRepositoryProject(child, projects)?.alias, "runtime");
        assert.equal(findRepositoryProject(other, projects), null);
        assert.equal(pathKey(repositoryIdentity(base).commonDir), pathKey(repositoryIdentity(worktree).commonDir));
        assert.equal(git("-C", base, "status", "--porcelain"), before);
        assert.equal(git("-C", worktree, "status", "--porcelain"), "");
    });
});

test("does not enable an unrelated nested repository or a separate clone", () => {
    withRepositories(({ root, base, git }) => {
        const nested = join(base, "nested");
        const clone = join(root, "clone");
        git("init", "--quiet", nested);
        git("clone", "--quiet", "--", base, clone);
        const projects = [{ alias: "runtime", path: base }];
        assert.equal(findRepositoryProject(nested, projects), null);
        assert.equal(findRepositoryProject(clone, projects), null);
    });
});

test("does not activate plain folders or fabricate repository identities", () => {
    withRepositories(({ root, base }) => {
        assert.equal(repositoryIdentity(root), null);
        assert.equal(repositoryIdentity(join(root, "missing")), null);
        assert.equal(findRepositoryProject(root, [{ alias: "runtime", path: base }]), null);
    });
});

test("defaults registry projects to disabled and honors only a true boolean flag", () => {
    withRepositories(({ base, worktree, other }) => {
        const project = { alias: "runtime", path: base };
        assert.equal(enabledFolderProject(base, [project]), null);
        assert.equal(enabledFolderProject(base, [{ ...project, enabled: false }]), null);
        assert.equal(enabledFolderProject(base, [{ ...project, auto_activate: true }]), null);
        const enabled = [{ ...project, enabled: true }];
        assert.equal(enabledFolderProject(base, enabled)?.alias, "runtime");
        assert.equal(enabledFolderProject(worktree, enabled)?.path, repositoryIdentity(worktree).root);
        assert.equal(enabledFolderProject(other, enabled), null);
        assert.throws(() => enabledFolderProject(base, [{ ...project, enabled: "true" }]), /boolean enabled/);
        assert.throws(() => enabledFolderProject(base, [{ alias: "runtime", enabled: true }]), /has no path/);
        assert.equal(enabledFolderProject(base, []), null);
    });
});
