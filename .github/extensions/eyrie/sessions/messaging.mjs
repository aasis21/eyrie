import { randomUUID } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    renameSync,
    rmSync,
    watch,
    writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MESSAGE_VERSION = 1;
const MAX_MESSAGE_LENGTH = 16 * 1024;
const DELIVERY_MODES = Object.freeze(["enqueue", "steer", "interrupt", "notify", "context"]);

function defaultBaseDir() {
    const local = process.env.LOCALAPPDATA;
    return local ? join(local, "eyrie", "sessions") : join(homedir(), ".eyrie", "sessions");
}

function ensureDir(path) {
    mkdirSync(path, { recursive: true });
}

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return null;
    }
}

function writeJsonAtomic(path, value) {
    ensureDir(dirname(path));
    const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    renameSync(temp, path);
}

function removeFile(path) {
    try {
        rmSync(path, { force: true });
    } catch {
        // Best-effort cleanup. Stale files are pruned on a later operation.
    }
}

export function isProcessAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return err?.code === "EPERM";
    }
}

function assertUuid(value, field) {
    if (!UUID_PATTERN.test(String(value || ""))) {
        throw new Error(`${field} must be a full UUID.`);
    }
}

function validateMode(mode) {
    const resolved = mode || "enqueue";
    if (!DELIVERY_MODES.includes(resolved)) {
        throw new Error(`mode must be one of: ${DELIVERY_MODES.join(", ")}.`);
    }
    return resolved;
}

function registrationName(registration) {
    return `${registration.sessionId}-${registration.instanceId}.json`;
}

function messageName(messageId) {
    return `${messageId}.json`;
}

function sessionLabel(registration) {
    return registration.title || basename(registration.cwd || "") || registration.sessionId;
}

function formatActionableMessage(message) {
    return [
        `[Eyrie message from "${message.senderTitle || message.senderSessionId}"]`,
        `Sender session: ${message.senderSessionId}`,
        `Message ID: ${message.messageId}`,
        `Conversation ID: ${message.conversationId}`,
        `Reply requested: ${message.replyRequested ? "yes" : "no"}`,
        "",
        message.message,
        "",
        message.replyRequested
            ? `Reply with eyrie_session_send. Set target_session_id to ${message.senderSessionId} and in_reply_to to ${message.messageId}.`
            : "No reply was requested.",
    ].join("\n");
}

function formatContextMessage(message) {
    return [
        `Eyrie session context from "${message.senderTitle || message.senderSessionId}"`,
        `Sender session: ${message.senderSessionId}`,
        `Message ID: ${message.messageId}`,
        `Conversation ID: ${message.conversationId}`,
        "",
        message.message,
        "",
        message.replyRequested
            ? `Reply through eyrie_session_send if coordination is needed. Target ${message.senderSessionId} and reply to ${message.messageId}.`
            : "",
    ].filter((line, index, lines) => line || lines[index - 1] !== "").join("\n");
}

function validateEnvelope(message, expectedTarget) {
    if (!message || typeof message !== "object") throw new Error("Message envelope must be an object.");
    if (message.version !== MESSAGE_VERSION) throw new Error(`Unsupported message version '${message.version}'.`);
    assertUuid(message.messageId, "messageId");
    assertUuid(message.conversationId, "conversationId");
    assertUuid(message.senderSessionId, "senderSessionId");
    assertUuid(message.senderInstanceId, "senderInstanceId");
    assertUuid(message.targetSessionId, "targetSessionId");
    if (message.targetSessionId !== expectedTarget) throw new Error("Message target does not match this session.");
    if (typeof message.message !== "string" || !message.message.trim()) throw new Error("Message content is required.");
    if (message.message.length > MAX_MESSAGE_LENGTH) throw new Error(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
    validateMode(message.mode);
    if (message.inReplyTo != null) assertUuid(message.inReplyTo, "inReplyTo");
    return message;
}

export function createSessionMessaging({
    session,
    sessionId = session?.sessionId,
    cwd = process.cwd(),
    title = null,
    baseDir = defaultBaseDir(),
    pid = process.pid,
    processAlive = isProcessAlive,
    watchFactory = watch,
    watchInbox = true,
} = {}) {
    if (!session) throw new Error("Eyrie session messaging requires a Copilot session.");
    assertUuid(sessionId, "sessionId");

    const instanceId = randomUUID();
    const liveDir = join(baseDir, "live");
    const inboxRoot = join(baseDir, "inbox");
    const processingRoot = join(baseDir, "processing");
    const contextRoot = join(baseDir, "context");
    const processedRoot = join(baseDir, "processed");
    const inboxDir = join(inboxRoot, sessionId);
    const processingDir = join(processingRoot, sessionId);
    const contextDir = join(contextRoot, sessionId);
    const processedDir = join(processedRoot, sessionId);
    for (const dir of [liveDir, inboxDir, processingDir, contextDir, processedDir]) ensureDir(dir);

    let registration = {
        sessionId,
        instanceId,
        pid,
        title: title || basename(cwd) || null,
        titleSource: title ? "provided" : "cwd",
        summary: null,
        status: "idle",
        cwd,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const registrationPath = join(liveDir, registrationName(registration));
    writeJsonAtomic(registrationPath, registration);

    let stopped = false;
    let processingPromise = null;
    let rescanRequested = false;
    let busy = false;
    let watcher = null;
    let watchDebounce = null;

    function updateMetadata({ title: nextTitle, titleSource, summary, cwd: nextCwd } = {}) {
        const normalizedTitle = typeof nextTitle === "string" && nextTitle.trim()
            ? nextTitle.trim()
            : registration.title;
        const normalizedSummary = typeof summary === "string" && summary.trim()
            ? summary.trim()
            : registration.summary;
        const normalizedCwd = typeof nextCwd === "string" && nextCwd.trim()
            ? nextCwd
            : registration.cwd;
        const normalizedTitleSource = typeof titleSource === "string" && titleSource
            ? titleSource
            : registration.titleSource;
        if (
            normalizedTitle === registration.title &&
            normalizedTitleSource === registration.titleSource &&
            normalizedSummary === registration.summary &&
            normalizedCwd === registration.cwd
        ) return;
        registration = {
            ...registration,
            title: normalizedTitle,
            titleSource: normalizedTitleSource,
            summary: normalizedSummary,
            cwd: normalizedCwd,
            updatedAt: new Date().toISOString(),
        };
        writeJsonAtomic(registrationPath, registration);
    }

    function updateTitle(nextTitle) {
        updateMetadata({ title: nextTitle, titleSource: "event" });
    }

    function setBusy(value) {
        const nextBusy = Boolean(value);
        if (busy === nextBusy && registration.status === (nextBusy ? "busy" : "idle")) return;
        busy = nextBusy;
        registration = {
            ...registration,
            status: busy ? "busy" : "idle",
            updatedAt: new Date().toISOString(),
        };
        writeJsonAtomic(registrationPath, registration);
    }

    function registrations() {
        const results = [];
        for (const file of readdirSync(liveDir, { withFileTypes: true })) {
            if (!file.isFile() || !file.name.endsWith(".json")) continue;
            const path = join(liveDir, file.name);
            const value = readJson(path);
            if (!value || !UUID_PATTERN.test(String(value.sessionId || "")) || !processAlive(value.pid)) {
                removeFile(path);
                continue;
            }
            results.push(value);
        }
        return results;
    }

    function listSessions({ includeSelf = false, metadataBySessionId = new Map(), metadataRefreshError = null } = {}) {
        const all = registrations();
        const counts = new Map();
        for (const item of all) counts.set(item.sessionId, (counts.get(item.sessionId) || 0) + 1);
        return all
            .filter((item) => includeSelf || item.sessionId !== sessionId || item.instanceId !== instanceId)
            .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
            .map((item) => {
                const live = metadataBySessionId.get(item.sessionId);
                return {
                    session_id: item.sessionId,
                    instance_id: item.instanceId,
                    title: ["event", "provided", "name"].includes(item.titleSource)
                        ? item.title
                        : live?.name || live?.title || item.title || null,
                    summary: live?.summary || item.summary || null,
                    cwd: live?.context?.cwd || item.cwd || null,
                    pid: item.pid,
                    status: item.status || "unknown",
                    started_at: live?.startTime || item.startedAt || null,
                    updated_at: live?.modifiedTime || item.updatedAt || null,
                    metadata_source: live?.source || (live ? "session-store-live" : "registration-cache"),
                    metadata_refresh_error: live ? null : metadataRefreshError,
                    is_self: item.sessionId === sessionId && item.instanceId === instanceId,
                    conflicted: (counts.get(item.sessionId) || 0) > 1,
                };
            });
    }

    function resolveTarget(targetSessionId) {
        assertUuid(targetSessionId, "target_session_id");
        const matches = registrations().filter((item) => item.sessionId === targetSessionId);
        if (matches.length === 0) throw new Error(`Eyrie session '${targetSessionId}' is not running.`);
        if (matches.length > 1) throw new Error(`Eyrie session '${targetSessionId}' has multiple live processes; delivery is ambiguous.`);
        return matches[0];
    }

    function allMessageRecords() {
        const records = [];
        for (const [dir, state] of [[contextDir, "context"], [processedDir, "processed"]]) {
            if (!existsSync(dir)) continue;
            for (const file of readdirSync(dir, { withFileTypes: true })) {
                if (!file.isFile() || !file.name.endsWith(".json")) continue;
                const path = join(dir, file.name);
                const value = readJson(path);
                if (value?.messageId) records.push({ path, state, value });
            }
        }
        return records;
    }

    function findReceivedMessage(messageId) {
        return allMessageRecords().find((record) => record.value.messageId === messageId)?.value || null;
    }

    function sendMessage({
        targetSessionId,
        message,
        mode = "enqueue",
        inReplyTo = null,
        replyRequested = true,
    }) {
        const target = resolveTarget(targetSessionId);
        if (typeof message !== "string" || !message.trim()) throw new Error("message is required.");
        if (message.length > MAX_MESSAGE_LENGTH) throw new Error(`message must not exceed ${MAX_MESSAGE_LENGTH} characters.`);
        const resolvedMode = validateMode(mode);
        let reply = null;
        if (inReplyTo != null) {
            assertUuid(inReplyTo, "in_reply_to");
            reply = findReceivedMessage(inReplyTo);
            if (!reply) throw new Error(`Cannot reply to unknown message '${inReplyTo}'.`);
            if (reply.senderSessionId !== targetSessionId) {
                throw new Error("target_session_id must match the sender of in_reply_to.");
            }
        }

        const envelope = {
            version: MESSAGE_VERSION,
            messageId: randomUUID(),
            conversationId: reply?.conversationId || randomUUID(),
            senderSessionId: sessionId,
            senderInstanceId: instanceId,
            senderTitle: registration.title,
            senderCwd: registration.cwd,
            targetSessionId,
            targetInstanceId: target.instanceId,
            message: message.trim(),
            mode: resolvedMode,
            replyRequested: replyRequested !== false,
            inReplyTo: inReplyTo || null,
            sentAt: new Date().toISOString(),
        };

        const targetDir = join(inboxRoot, targetSessionId);
        ensureDir(targetDir);
        writeJsonAtomic(join(targetDir, messageName(envelope.messageId)), envelope);
        return {
            message_id: envelope.messageId,
            conversation_id: envelope.conversationId,
            target_session_id: targetSessionId,
            mode: resolvedMode,
            status: "published",
            sender_session_id: sessionId,
        };
    }

    function archiveMessage(sourcePath, message, deliveryStatus, error = null) {
        const record = {
            ...message,
            deliveryStatus,
            deliveredAt: new Date().toISOString(),
            ...(error ? { deliveryError: String(error) } : {}),
        };
        writeJsonAtomic(join(processedDir, messageName(message.messageId || randomUUID())), record);
        removeFile(sourcePath);
    }

    async function deliverClaimed(path, raw) {
        let message;
        try {
            message = validateEnvelope(raw, sessionId);
            if (message.targetInstanceId && message.targetInstanceId !== instanceId) {
                throw new Error("Message targets a different live instance.");
            }
            switch (message.mode) {
                case "enqueue":
                    await session.send({ prompt: formatActionableMessage(message), mode: "enqueue" });
                    archiveMessage(path, message, "injected");
                    return;
                case "steer":
                    await session.send({ prompt: formatActionableMessage(message), mode: "immediate" });
                    archiveMessage(path, message, "steered");
                    return;
                case "interrupt": {
                    if (busy) {
                        if (typeof session.rpc?.abort !== "function") throw new Error("session.rpc.abort is unavailable.");
                        const result = await session.rpc.abort({ reason: "eyrie_session_message" });
                        if (result?.success === false) throw new Error(result.error || "The active turn could not be interrupted.");
                    }
                    await session.send({ prompt: formatActionableMessage(message), mode: "enqueue" });
                    archiveMessage(path, message, busy ? "interrupted-and-injected" : "idle-and-injected");
                    return;
                }
                case "notify":
                    session.log?.(
                        `Eyrie message from ${message.senderTitle || message.senderSessionId} (${message.senderSessionId})\n` +
                        `Message ID: ${message.messageId}\n\n${message.message}`,
                        { ephemeral: false },
                    );
                    archiveMessage(path, message, "notified");
                    return;
                case "context": {
                    const pending = { ...message, deliveryStatus: "pending-context", receivedAt: new Date().toISOString() };
                    writeJsonAtomic(join(contextDir, messageName(message.messageId)), pending);
                    removeFile(path);
                    session.log?.(
                        `Eyrie context from ${message.senderTitle || message.senderSessionId} will be included with your next prompt.`,
                        { ephemeral: false },
                    );
                    return;
                }
                default:
                    throw new Error(`Unsupported mode '${message.mode}'.`);
            }
        } catch (err) {
            const fallback = raw && typeof raw === "object"
                ? { ...raw, messageId: UUID_PATTERN.test(String(raw.messageId || "")) ? raw.messageId : randomUUID() }
                : { version: MESSAGE_VERSION, messageId: randomUUID(), message: "(unreadable message)" };
            archiveMessage(path, fallback, "failed", err?.message || err);
            session.log?.(`Eyrie session message failed: ${err?.message || err}`, { level: "warning", ephemeral: false });
        }
    }

    async function processInbox() {
        if (stopped) return;
        if (processingPromise) {
            rescanRequested = true;
            await processingPromise;
            if (rescanRequested && !stopped) return processInbox();
            return;
        }
        const run = (async () => {
            do {
                rescanRequested = false;
                for (const file of readdirSync(inboxDir, { withFileTypes: true })) {
                    if (!file.isFile() || !file.name.endsWith(".json")) continue;
                    const source = join(inboxDir, file.name);
                    const claimed = join(processingDir, `${instanceId}-${file.name}`);
                    try {
                        renameSync(source, claimed);
                    } catch {
                        continue;
                    }
                    await deliverClaimed(claimed, readJson(claimed));
                }
            } while (rescanRequested && !stopped);
        })();
        const tracked = run.finally(() => {
            if (processingPromise === tracked) {
                processingPromise = null;
            }
        });
        processingPromise = tracked;
        return processingPromise;
    }

    function drainPendingContext() {
        const contexts = [];
        for (const file of readdirSync(contextDir, { withFileTypes: true })) {
            if (!file.isFile() || !file.name.endsWith(".json")) continue;
            const path = join(contextDir, file.name);
            const message = readJson(path);
            try {
                validateEnvelope(message, sessionId);
                contexts.push(formatContextMessage(message));
                archiveMessage(path, message, "context-injected");
            } catch (err) {
                archiveMessage(path, message || { messageId: randomUUID() }, "failed", err?.message || err);
            }
        }
        return contexts.join("\n\n---\n\n");
    }

    async function listInbox({ unreadOnly = true, limit = 20, markRead = false } = {}) {
        await processInbox();
        const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
        const records = allMessageRecords()
            .filter((record) => !unreadOnly || !record.value.readAt)
            .sort((a, b) => String(b.value.sentAt || "").localeCompare(String(a.value.sentAt || "")))
            .slice(0, safeLimit);
        const now = new Date().toISOString();
        if (markRead) {
            for (const record of records) {
                record.value.readAt = now;
                writeJsonAtomic(record.path, record.value);
            }
        }
        return records.map((record) => ({
            message_id: record.value.messageId,
            conversation_id: record.value.conversationId || null,
            sender_session_id: record.value.senderSessionId || null,
            sender_title: record.value.senderTitle || null,
            message: record.value.message || "",
            mode: record.value.mode || null,
            sent_at: record.value.sentAt || null,
            in_reply_to: record.value.inReplyTo || null,
            reply_requested: record.value.replyRequested !== false,
            delivery_status: record.value.deliveryStatus || record.state,
            delivery_error: record.value.deliveryError || null,
            read: Boolean(record.value.readAt || (markRead && now)),
        }));
    }

    if (watchInbox) {
        try {
            watcher = watchFactory(inboxDir, { persistent: false }, () => {
                if (watchDebounce) clearTimeout(watchDebounce);
                watchDebounce = setTimeout(() => {
                    watchDebounce = null;
                    void processInbox();
                }, 50);
                watchDebounce.unref?.();
            });
            watcher.unref?.();
        } catch (err) {
            session.log?.(`Eyrie session inbox watcher failed: ${err?.message || err}`, { level: "warning" });
        }
    }
    void processInbox();

    function stop() {
        if (stopped) return;
        stopped = true;
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = null;
        try {
            watcher?.close?.();
        } catch {
            // Best-effort watcher cleanup.
        }
        removeFile(registrationPath);
    }

    return {
        sessionId,
        instanceId,
        baseDir,
        updateMetadata,
        updateTitle,
        setBusy,
        listSessions,
        sendMessage,
        listInbox,
        processInbox,
        drainPendingContext,
        stop,
    };
}

export { DELIVERY_MODES, MAX_MESSAGE_LENGTH };
