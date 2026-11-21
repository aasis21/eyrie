import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { fuzzyFilter, scanProject } from "./catalog.mjs";

function entry({ name, description = "", file }) {
    return {
        kind: "prompt",
        name,
        description,
        absolutePath: join("C:\\test", file),
        relPath: file,
    };
}

test("matches metadata case-insensitively", () => {
    const results = fuzzyFilter([
        entry({ name: "Create Pull Request", file: "unrelated.prompt.md" }),
    ], "PULL REQUEST");

    assert.equal(results.length, 1);
});

test("matches the Copilot asset file name", () => {
    const results = fuzzyFilter([
        entry({ name: "Unrelated metadata", file: "create-release-payload.prompt.md" }),
    ], "release payload");

    assert.equal(results.length, 1);
});

test("matches metadata descriptions", () => {
    const results = fuzzyFilter([
        entry({
            name: "Health asset",
            description: "Investigate dashboard monitoring failures.",
            file: "health.prompt.md",
        }),
    ], "dashboard monitoring");

    assert.equal(results.length, 1);
});

test("tolerates small spelling mistakes", () => {
    const results = fuzzyFilter([
        entry({ name: "Deployment Management", file: "deployment.prompt.md" }),
    ], "deplyoment");

    assert.equal(results.length, 1);
});

test("ranks name matches above description-only matches", () => {
    const results = fuzzyFilter([
        entry({
            name: "General asset",
            description: "Create pull request automation.",
            file: "general.prompt.md",
        }),
        entry({
            name: "Create Pull Request",
            description: "Repository Copilot asset.",
            file: "create-pr.prompt.md",
        }),
    ], "create pull request");

    assert.equal(results[0].name, "Create Pull Request");
});

test("searches Copilot asset bodies only when deep search is enabled", () => {
    const asset = {
        ...entry({
            name: "Generic Operations",
            description: "General operational Copilot asset.",
            file: "operations.prompt.md",
        }),
        body: "Use the quasar reconciliation checkpoint when processing failures.",
    };

    assert.equal(fuzzyFilter([asset], "quasar checkpoint").length, 0);
    const deepResults = fuzzyFilter([asset], "quasar checkpoint", { deep: true });
    assert.equal(deepResults.length, 1);
    assert.match(deepResults[0].matchSnippet, /quasar reconciliation checkpoint/i);
});

test("folds frontmatter block descriptions without leaking YAML markers", () => {
    const root = mkdtempSync(join(tmpdir(), "eyrie-scanner-test-"));
    try {
        const prompts = join(root, ".github", "prompts");
        mkdirSync(prompts, { recursive: true });
        writeFileSync(join(prompts, "folded.prompt.md"), `---
name: folded-description
description: >-
  First description line
  followed by the second line.
---
# Body
`);

        const result = scanProject(root, ["prompt"]);
        assert.equal(
            result.prompt[0].description,
            "First description line followed by the second line.",
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
