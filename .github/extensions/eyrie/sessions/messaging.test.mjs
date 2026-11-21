import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSessionMessaging } from "./messaging.mjs";

const SESSION_A = "0233eccc-44b7-4c56-9c7e-40a8015eac46";
const SESSION_B = "95cf2755-ea4b-4018-ba82-46e59b04999a";

function fakeSession(sessionId) {
    const sent = [];
    const logs = [];
    const aborts = [];
    return {
        sessionId,
        sent,
        logs,
        aborts,
        rpc: {
            abort: async (args) => {
                aborts.push(args);
                return { success: true };
            },
        },
        send: async (args) => sent.push(args),
        log: (message, options) => logs.push({ message, options }),
    };
}

async function withRuntimes(run) {
    const baseDir = mkdtempSync(join(tmpdir(), "eyrie-session-messaging-"));
    const sessionA = fakeSession(SESSION_A);
    const sessionB = fakeSession(SESSION_B);
    const alive = () => true;
    const a = createSessionMessaging({
        session: sessionA,
        sessionId: SESSION_A,
        cwd: "C:\\eyrie-a",
        title: "Session A",
        baseDir,
        pid: 101,
        processAlive: alive,
        watchInbox: false,
    });
    const b = createSessionMessaging({
        session: sessionB,
        sessionId: SESSION_B,
        cwd: "C:\\eyrie-b",
        title: "Session B",
        baseDir,
        pid: 202,
        processAlive: alive,
        watchInbox: false,
    });
    try {
        await run({ a, b, sessionA, sessionB, baseDir });
    } finally {
        a.stop();
        b.stop();
        rmSync(baseDir, { recursive: true, force: true });
    }
}

test("lists registered sessions and derives sender identity", async () => {
    await withRuntimes(async ({ a, b }) => {
        b.updateMetadata({
            title: "Implementing session details",
            titleSource: "cwd",
            summary: "Adding titles and summaries to Eyrie session discovery.",
        });
        b.setBusy(true);
        const sessions = a.listSessions();
        assert.equal(sessions.length, 1);
        assert.equal(sessions[0].session_id, SESSION_B);
        assert.equal(sessions[0].title, "Implementing session details");
        assert.match(sessions[0].summary, /titles and summaries/);
        assert.equal(sessions[0].status, "busy");
        assert.equal(sessions[0].metadata_source, "registration-cache");

        const liveSessions = a.listSessions({
            metadataBySessionId: new Map([[
                SESSION_B,
                {
                    sessionId: SESSION_B,
                    name: "Live session title",
                    summary: "Summary read from the Copilot session store.",
                    startTime: "2026-01-01T00:00:00.000Z",
                    modifiedTime: "2026-01-01T00:05:00.000Z",
                    context: { cwd: "C:\\live\\project" },
                    source: "session-store-sql",
                },
            ]]),
        });
        assert.equal(liveSessions[0].title, "Live session title");
        assert.equal(liveSessions[0].summary, "Summary read from the Copilot session store.");
        assert.equal(liveSessions[0].cwd, "C:\\live\\project");
        assert.equal(liveSessions[0].metadata_source, "session-store-sql");

        const result = a.sendMessage({ targetSessionId: SESSION_B, message: "hello" });
        assert.equal(result.sender_session_id, SESSION_A);
        await b.processInbox();
        const inbox = await b.listInbox({ unreadOnly: false });
        assert.equal(inbox[0].sender_session_id, SESSION_A);
    });
});

test("delivers enqueue and steer modes with the expected SDK mode", async () => {
    await withRuntimes(async ({ a, b, sessionB }) => {
        a.sendMessage({ targetSessionId: SESSION_B, message: "queued", mode: "enqueue" });
        a.sendMessage({ targetSessionId: SESSION_B, message: "steer", mode: "steer" });
        await b.processInbox();

        assert.deepEqual(sessionB.sent.map((item) => item.mode).sort(), ["enqueue", "immediate"]);
        assert.match(sessionB.sent[0].prompt + sessionB.sent[1].prompt, /Sender session: 0233eccc/);
    });
});

test("interrupt aborts before enqueueing the replacement message", async () => {
    await withRuntimes(async ({ a, b, sessionB }) => {
        b.setBusy(true);
        a.sendMessage({ targetSessionId: SESSION_B, message: "stop and replace", mode: "interrupt" });
        await b.processInbox();

        assert.equal(sessionB.aborts.length, 1);
        assert.equal(sessionB.sent.length, 1);
        assert.equal(sessionB.sent[0].mode, "enqueue");
    });
});

test("interrupt skips abort when the recipient is idle", async () => {
    await withRuntimes(async ({ a, b, sessionB }) => {
        a.sendMessage({ targetSessionId: SESSION_B, message: "start replacement", mode: "interrupt" });
        await b.processInbox();

        assert.equal(sessionB.aborts.length, 0);
        assert.equal(sessionB.sent.length, 1);
        assert.equal(sessionB.sent[0].mode, "enqueue");
    });
});

test("notify logs without starting an agent turn", async () => {
    await withRuntimes(async ({ a, b, sessionB }) => {
        a.sendMessage({ targetSessionId: SESSION_B, message: "build completed", mode: "notify" });
        await b.processInbox();

        assert.equal(sessionB.sent.length, 0);
        assert.equal(sessionB.logs.length, 1);
        assert.match(sessionB.logs[0].message, /build completed/);
    });
});

test("context waits for the next prompt hook to drain it", async () => {
    await withRuntimes(async ({ a, b, sessionB }) => {
        a.sendMessage({ targetSessionId: SESSION_B, message: "root cause found", mode: "context" });
        await b.processInbox();

        assert.equal(sessionB.sent.length, 0);
        assert.match(b.drainPendingContext(), /root cause found/);
        assert.equal(b.drainPendingContext(), "");
    });
});

test("replies inherit the conversation and require the original sender target", async () => {
    await withRuntimes(async ({ a, b }) => {
        const original = a.sendMessage({ targetSessionId: SESSION_B, message: "question" });
        await b.processInbox();

        const reply = b.sendMessage({
            targetSessionId: SESSION_A,
            message: "answer",
            inReplyTo: original.message_id,
            replyRequested: false,
        });
        assert.equal(reply.conversation_id, original.conversation_id);
        assert.throws(
            () => b.sendMessage({ targetSessionId: SESSION_B, message: "wrong", inReplyTo: original.message_id }),
            /must match the sender/,
        );
    });
});

test("rejects unknown targets and invalid modes", async () => {
    await withRuntimes(async ({ a }) => {
        assert.throws(
            () => a.sendMessage({ targetSessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", message: "hello" }),
            /is not running/,
        );
        assert.throws(
            () => a.sendMessage({ targetSessionId: SESSION_B, message: "hello", mode: "teleport" }),
            /mode must be one of/,
        );
    });
});
