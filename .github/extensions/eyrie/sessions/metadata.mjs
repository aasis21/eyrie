import { DatabaseSync } from "node:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";

const QUERY_BATCH_SIZE = 500;

export function defaultSessionStorePath() {
    return join(homedir(), ".copilot", "session-store.db");
}

export function readSessionMetadata(sessionIds, { dbPath = defaultSessionStorePath() } = {}) {
    const ids = [...new Set(sessionIds)].filter(Boolean);
    const metadata = new Map();
    if (ids.length === 0) return metadata;

    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
        for (let offset = 0; offset < ids.length; offset += QUERY_BATCH_SIZE) {
            const batch = ids.slice(offset, offset + QUERY_BATCH_SIZE);
            const placeholders = batch.map(() => "?").join(", ");
            const rows = db.prepare(`
                SELECT id, cwd, summary, created_at, updated_at
                FROM sessions
                WHERE id IN (${placeholders})
            `).all(...batch);
            for (const row of rows) {
                metadata.set(row.id, {
                    sessionId: row.id,
                    title: row.summary || null,
                    summary: row.summary || null,
                    context: { cwd: row.cwd || null },
                    startTime: row.created_at || null,
                    modifiedTime: row.updated_at || null,
                    source: "session-store-sql",
                });
            }
        }
    } finally {
        db.close();
    }
    return metadata;
}
