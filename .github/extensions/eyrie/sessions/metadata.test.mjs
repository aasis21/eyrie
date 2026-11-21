import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { readSessionMetadata } from "./metadata.mjs";

test("reads selected session metadata from the local session store", () => {
    const root = mkdtempSync(join(tmpdir(), "eyrie-session-store-"));
    const dbPath = join(root, "session-store.db");
    try {
        const db = new DatabaseSync(dbPath);
        db.exec(`
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                cwd TEXT,
                summary TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        `);
        db.prepare(`
            INSERT INTO sessions (id, cwd, summary, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            "05230926-9746-4021-8345-6664d80a85cb",
            "C:\\projects\\eyrie",
            "Building Eyrie session collaboration",
            "2026-01-01T00:00:00.000Z",
            "2026-01-01T00:05:00.000Z",
        );
        db.close();

        const metadata = readSessionMetadata(
            ["05230926-9746-4021-8345-6664d80a85cb", "00000000-0000-4000-8000-000000000000"],
            { dbPath },
        );
        assert.equal(metadata.size, 1);
        assert.deepEqual(metadata.get("05230926-9746-4021-8345-6664d80a85cb"), {
            sessionId: "05230926-9746-4021-8345-6664d80a85cb",
            title: "Building Eyrie session collaboration",
            summary: "Building Eyrie session collaboration",
            context: { cwd: "C:\\projects\\eyrie" },
            startTime: "2026-01-01T00:00:00.000Z",
            modifiedTime: "2026-01-01T00:05:00.000Z",
            source: "session-store-sql",
        });
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
