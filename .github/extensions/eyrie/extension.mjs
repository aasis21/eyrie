// extension.mjs — Eyrie entry point.
// Registers the /eyrie slash command, tools, and session hooks that bring
// cross-repo Copilot asset catalogs into HQ and repository-mode sessions.

import { joinSession } from "@github/copilot-sdk/extension";
import { defineTool } from "@github/copilot-sdk";
import {
    bootstrap,
    activateProject,
    deactivateProject,
    peekProject,
    searchCopilotAssets,
    flushPendingContext,
    nextActiveScopeContext,
    activeAliases,
    sessionMode,
    primaryAlias,
    statusText,
} from "./projects/activation.mjs";
import { eyrieRoot, getProject, defaultArea } from "./projects/registry.mjs";
import { createLore } from "./lore/lore.mjs";
import { ALL_KINDS } from "./copilot-assets/catalog.mjs";
import { createSessionMessaging, DELIVERY_MODES } from "./sessions/messaging.mjs";
import { readSessionMetadata } from "./sessions/metadata.mjs";
import { loadRegistry, describeCatalog } from "./remote-agent/registry.mjs";
import { runRemoteAgentOperation } from "./remote-agent/operations.mjs";

// ---------------------------------------------------------------------------
// Tools (agent-callable)
// ---------------------------------------------------------------------------

const tActivate = defineTool("eyrie_activate", {
    description:
        "Activate a project from the Eyrie registry.json for discovery. Outside HQ, returns project identity and discovery instructions while preserving the primary checkout. In HQ, returns its Copilot asset catalog as name + description + absolute path per item; read selected files for full content. If its registered path is missing and a remote is configured, clone it lazily into that exact path first. Idempotent.",
    parameters: {
        type: "object",
        properties: {
            project: { type: "string", description: "Project alias from the HQ registry.json." },
        },
        required: ["project"],
    },
    handler: async ({ project }) => {
        const r = activateProject(project);
        if (!r.ok) return r.message;
        return `${r.message}\n\n${r.catalog}`;
    },
});

const tDeactivate = defineTool("eyrie_deactivate", {
    description:
        "Remove a project from the active scope. Its catalog remains in transcript history, and future search matches no longer receive the active-project ranking boost.",
    parameters: {
        type: "object",
        properties: {
            project: { type: "string", description: "Project alias to deactivate." },
        },
        required: ["project"],
    },
    handler: async ({ project }) => deactivateProject(project).message,
});

const tPeek = defineTool("eyrie_peek", {
    description:
        "Browse one known project's Copilot asset catalog WITHOUT activating it. Use project='eyrie' for shared HQ workflows. Use this instead of eyrie_search when you want to inspect all available skills/prompts/agents/instructions for a project: omit query, and optionally set kind. A supplied query is only lexical fuzzy filtering, not semantic search. If the registered path is missing and a remote is configured, Eyrie clones it lazily.",
    parameters: {
        type: "object",
        properties: {
            project: { type: "string", description: "Project alias to peek at." },
            kind: { type: "string", enum: ALL_KINDS, description: "Optional: restrict to one kind." },
            query: { type: "string", description: "Optional lexical fuzzy filter over file name, metadata name, and description. Omit to return the complete selected catalog." },
        },
        required: ["project"],
    },
    handler: async ({ project, kind, query }) => {
        const r = peekProject(project, { kind, query });
        if (!r.ok) return r.message;
        return r.message ? `${r.message}\n\n${r.catalog}` : r.catalog;
    },
});

const tSearch = defineTool("eyrie_search", {
    description:
        "Lexical ranked Copilot asset search across registered projects; this is NOT semantic or AI intent search. Pass 1-4 short asset keywords or an exact identifier (for example 'release notes' or 'BuildRunner'), not a natural-language request. By default it searches file names plus metadata name/description. Use deep=true only after the default search misses and the terms are likely to appear verbatim inside a Copilot asset body; deep body matches are broader and can be noisy. If you know the project and want to inspect all relevant assets, call eyrie_peek(project) without query instead. Broad searches skip unavailable checkouts; an explicit project search may clone that one checkout.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "Use 1-4 short lexical keywords or an exact identifier. Do not pass a natural-language sentence." },
            project: { type: "string", description: "Optional: restrict to a single project alias (or 'eyrie' for shared HQ workflows); otherwise search HQ and the full registry." },
            kind: { type: "string", enum: ALL_KINDS, description: "Optional: restrict to one kind." },
            deep: { type: "boolean", description: "Search full Copilot asset bodies too. Use only as a fallback for exact terms likely present in the body; body-only matches may be noisy." },
            top: { type: "integer", minimum: 1, maximum: 500, default: 30, description: "Maximum ranked matches to return." },
        },
        required: ["query"],
    },
    handler: async ({ query, project, kind, deep, top }) => {
        const r = searchCopilotAssets({ query, project, kind, deep, top: top ?? 30 });
        if (!r.ok) return r.message;
        return r.rendered || "(no results)";
    },
});

// Loaded once at startup; reload extensions or start a new session to pick up
// remote-agents.json changes.
let remoteAgentRegistry;
let remoteAgentCatalogHint;
try {
    remoteAgentRegistry = await loadRegistry();
    remoteAgentCatalogHint = JSON.stringify(describeCatalog(remoteAgentRegistry));
} catch (err) {
    remoteAgentRegistry = { agents: {} };
    remoteAgentCatalogHint = `(remote-agents.json failed to load: ${err?.message || err})`;
}

const tRemoteAgent = defineTool("remote_agent", {
    description:
        "Delegate work to an approved remote agent over A2A. 'agent' is required on every " +
        "operation (no local state is kept — every call is self-contained). operation=request " +
        "starts new work (requires agent+prompt); follow_up continues a conversation (requires " +
        "agent+contextId+prompt, taskId optional to continue a specific task); get_result polls a " +
        "task (requires agent+taskId); cancel stops one (requires agent+taskId). request/follow_up " +
        "block until the task reaches a terminal/input-required state or its timeout lapses. " +
        `Approved agents: ${remoteAgentCatalogHint}`,
    parameters: {
        type: "object",
        properties: {
            operation: { type: "string", enum: ["request", "follow_up", "get_result", "cancel"] },
            agent: { type: "string", description: "Approved logical agent alias. Required on every operation." },
            prompt: { type: "string", description: "Question or follow-up text (request/follow_up only)." },
            contextId: {
                type: "string",
                description: "A2A contextId from a prior response, to continue the same conversation (follow_up only).",
            },
            taskId: {
                type: "string",
                description: "A2A taskId from a prior response (follow_up optional / get_result / cancel required).",
            },
        },
        required: ["operation", "agent"],
    },
    handler: async (args) => {
        try {
            const payload = await runRemoteAgentOperation(remoteAgentRegistry, args);
            return JSON.stringify(payload, null, 2);
        } catch (err) {
            return `remote_agent error: ${err?.message || err}`;
        }
    },
});

let sessionMessaging = null;

function messaging() {
    if (!sessionMessaging) throw new Error("Eyrie session messaging is not ready yet.");
    return sessionMessaging;
}

const tSessionList = defineTool("eyrie_session_list", {
    description:
        "List fully independent Copilot CLI sessions or terminals running Eyrie on this machine, NOT parent/child or sibling subagents. Use native list_agents/read_agent for subagents. Live-pulls title, summary, working directory, timestamps, busy/idle status, PIDs, and duplicate-session conflicts.",
    defer: "never",
    parameters: {
        type: "object",
        properties: {
            include_self: { type: "boolean", default: false, description: "Include the calling session in the result." },
        },
    },
    handler: async ({ include_self = false }) => {
        const registered = messaging().listSessions({ includeSelf: include_self });
        const activeIds = new Set(registered.map((item) => item.session_id));
        if (activeIds.size === 0) return "[]";

        try {
            const metadataBySessionId = readSessionMetadata(activeIds);
            return JSON.stringify(
                messaging().listSessions({
                    includeSelf: include_self,
                    metadataBySessionId,
                }),
                null,
                2,
            );
        } catch (err) {
            return JSON.stringify(
                messaging().listSessions({
                    includeSelf: include_self,
                    metadataRefreshError: err?.message || String(err),
                }),
                null,
                2,
            );
        }
    },
});

const tSessionSend = defineTool("eyrie_session_send", {
    description:
        "Send ONLY between fully separate Copilot sessions or independent terminals running Eyrie. NEVER use for parent-child or sibling subagent communication, self-messaging, or relaying a subagent result to its parent. Use native write_agent/read_agent and completion responses for subagents; a missing parent agent ID is not an Eyrie fallback. Select an independent recipient from eyrie_session_list. Sender identity comes from the SDK session. Modes: enqueue (next turn), steer (active turn), interrupt (abort then replace), notify (human timeline), context (next prompt). Use in_reply_to for cross-session replies.",
    defer: "never",
    parameters: {
        type: "object",
        properties: {
            target_session_id: { type: "string", format: "uuid", description: "Independent recipient session UUID from eyrie_session_list; never a subagent agent_id or this session's own ID." },
            message: { type: "string", minLength: 1, maxLength: 16384, description: "Message to deliver." },
            mode: { type: "string", enum: DELIVERY_MODES, default: "enqueue", description: "Recipient delivery behavior." },
            in_reply_to: { type: "string", format: "uuid", description: "Optional received message UUID being answered." },
            reply_requested: { type: "boolean", default: true, description: "Whether the recipient should respond." },
        },
        required: ["target_session_id", "message"],
    },
    handler: async ({ target_session_id, message, mode = "enqueue", in_reply_to, reply_requested = true }) =>
        JSON.stringify(
            messaging().sendMessage({
                targetSessionId: target_session_id,
                message,
                mode,
                inReplyTo: in_reply_to,
                replyRequested: reply_requested,
            }),
            null,
            2,
        ),
});

const tSessionInbox = defineTool("eyrie_session_inbox", {
    description:
        "Inspect messages between fully independent Eyrie sessions: sender/session IDs, reply linkage, delivery status and errors. NOT a parent-child or sibling subagent inbox; use native read_agent and completion notifications for subagents.",
    defer: "never",
    parameters: {
        type: "object",
        properties: {
            unread_only: { type: "boolean", default: true, description: "Return only messages not marked read." },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20, description: "Maximum messages to return." },
            mark_read: { type: "boolean", default: false, description: "Mark returned messages as read." },
        },
    },
    handler: async ({ unread_only = true, limit = 20, mark_read = false }) => JSON.stringify(
        await messaging().listInbox({ unreadOnly: unread_only, limit, markRead: mark_read }),
        null,
        2,
    ),
});

// ---------------------------------------------------------------------------
// Slash command (human-facing)
// ---------------------------------------------------------------------------

function parseArgs(argsStr) {
    // Whitespace-tokenize, respecting simple double-quoted strings.
    const out = [];
    const re = /"([^"]*)"|(\S+)/g;
    let m;
    while ((m = re.exec(argsStr || "")) !== null) out.push(m[1] ?? m[2]);
    return out;
}

let sessionRef = null;

function log(msg) {
    if (sessionRef?.log) { try { sessionRef.log(msg); return; } catch {} }
    // Fallback: stderr — CLI usually shows it too.
    try { process.stderr.write(String(msg) + "\n"); } catch {}
}

const SEARCH_USAGE = `Usage: /eyrie search [--project <alias>] [--kind <${ALL_KINDS.join("|")}>] [--deep] [--top <1-500>] <query>`;

// Returns { project, kind, deep, top, query } or null when the arguments are invalid.
function parseSearchArgs(rest) {
    let project;
    let kind;
    let deep = false;
    let top = 30;
    const queryTokens = [];
    const validTop = (value) => Number.isInteger(value) && value >= 1 && value <= 500;
    for (let i = 0; i < rest.length; i += 1) {
        const token = rest[i];
        if (token === "--project" || token === "-p") {
            project = rest[i + 1];
            if (!project) return null;
            i += 1;
        } else if (token.startsWith("--project=")) {
            project = token.slice("--project=".length);
            if (!project) return null;
        } else if (token === "--kind" || token === "-k") {
            kind = rest[i + 1];
            if (!ALL_KINDS.includes(kind)) return null;
            i += 1;
        } else if (token.startsWith("--kind=")) {
            kind = token.slice("--kind=".length);
            if (!ALL_KINDS.includes(kind)) return null;
        } else if (token === "--deep" || token === "-d") {
            deep = true;
        } else if (token === "--top" || token === "-t") {
            top = Number(rest[i + 1]);
            if (!validTop(top)) return null;
            i += 1;
        } else if (token.startsWith("--top=")) {
            top = Number(token.slice("--top=".length));
            if (!validTop(top)) return null;
        } else {
            queryTokens.push(token);
        }
    }
    const query = queryTokens.join(" ");
    return query ? { project, kind, deep, top, query } : null;
}

const eyrieCommand = {
    name: "eyrie",
    description: "Cross-repo Copilot asset catalog. Try: /eyrie status | activate <alias> | deactivate <alias> | peek <alias> [kind] [query] | search [...] <query>",
    handler: async ({ args }) => {
        const tokens = parseArgs(args);
        const sub = (tokens[0] || "status").toLowerCase();
        const rest = tokens.slice(1);
        try {
            switch (sub) {
                case "status":
                    log("🦅 Eyrie status\n" + statusText());
                    return;
                case "activate": {
                    const alias = rest[0];
                    if (!alias) { log("Usage: /eyrie activate <alias>"); return; }
                    const r = activateProject(alias, { injectOnNextTurn: true });
                    if (!r.ok) { log(`🦅 ${r.message}`); return; }
                    log(`🦅 ${r.message} (scope context injected into your next turn)\n\n${r.catalog}`);
                    return;
                }
                case "deactivate": {
                    const alias = rest[0];
                    if (!alias) { log("Usage: /eyrie deactivate <alias>"); return; }
                    log("🦅 " + deactivateProject(alias).message);
                    return;
                }
                case "peek": {
                    const alias = rest[0];
                    if (!alias) { log("Usage: /eyrie peek <alias> [kind] [query]"); return; }
                    let kind, query;
                    if (rest[1] && ALL_KINDS.includes(rest[1])) { kind = rest[1]; query = rest.slice(2).join(" ") || undefined; }
                    else { query = rest.slice(1).join(" ") || undefined; }
                    const r = peekProject(alias, { kind, query, injectOnNextTurn: true });
                    if (!r.ok) { log(`🦅 ${r.message}`); return; }
                    log(`🦅 Peek (injected into your next turn):\n\n${r.catalog}`);
                    return;
                }
                case "search": {
                    const parsed = parseSearchArgs(rest);
                    if (!parsed) { log(SEARCH_USAGE); return; }
                    const r = searchCopilotAssets(parsed);
                    if (!r.ok) { log(`🦅 ${r.message}`); return; }
                    log(`🦅 ${r.rendered}`);
                    return;
                }
                default:
                    log(`🦅 Unknown subcommand '${sub}'. Try /eyrie status.`);
            }
        } catch (err) {
            log(`🦅 Eyrie error: ${err?.stack || err?.message || err}`);
        }
    },
};

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

const lore = createLore({ hqHome: eyrieRoot() });

const session = await joinSession({
    tools: [tActivate, tDeactivate, tPeek, tSearch, tSessionList, tSessionSend, tSessionInbox, tRemoteAgent],
    commands: [eyrieCommand],
    hooks: {
        onSessionStart: async (input) => {
            try {
                const bootstrapContext = bootstrap({ cwd: input?.workingDirectory });
                let loreContext = "";
                try {
                    loreContext = lore.startupContext({
                        mode: sessionMode(),
                        primaryAlias: primaryAlias(),
                        getProject,
                        defaultArea: defaultArea(),
                    });
                } catch (err) {
                    log(`🦅 Eyrie: Lore load failed — ${err?.message || err}`);
                }
                const additionalContext = [bootstrapContext, loreContext].filter(Boolean).join("\n\n");
                const active = activeAliases();
                const activeSummary = active.length
                    ? `${active.join(", ")} active`
                    : sessionMode() === "repository" ? "local checkout primary" : "no projects active";
                log(`🦅 Eyrie ready — ${sessionMode()} mode; ${activeSummary}. Run /eyrie to browse Copilot assets.`);
                return { additionalContext };
            } catch (err) {
                log(`🦅 Eyrie: bootstrap failed — ${err?.message || err}`);
                return { additionalContext: `Eyrie: bootstrap failed — ${err?.message || err}` };
            }
        },
        onUserPromptSubmitted: async () => {
            await sessionMessaging?.processInbox();
            // Active-scope reminders plus catalogs queued by slash-command handlers.
            const contexts = [
                nextActiveScopeContext(),
                flushPendingContext(),
                sessionMessaging?.drainPendingContext(),
                lore.reminder(),
            ].filter(Boolean);
            const additionalContext = contexts.join("\n\n");
            return additionalContext ? { additionalContext } : undefined;
        },
        onPostToolUse: async (input) => {
            try {
                return lore.postToolUse(input);
            } catch {
                return undefined;
            }
        },
        onSessionEnd: async () => {
            sessionMessaging?.stop();
        },
    },
});

sessionRef = session;
sessionMessaging = createSessionMessaging({
    session,
    sessionId: session.sessionId,
    cwd: process.cwd(),
});
const stopMessagingEvents = session.on?.((event) => {
    if (event?.type === "assistant.message_start") sessionMessaging?.setBusy(true);
    if (event?.type === "assistant.idle") {
        sessionMessaging?.setBusy(false);
        void refreshSessionMetadata();
    }
    if (event?.type === "session.title_changed") {
        sessionMessaging?.updateTitle(event.data?.title);
    }
});

async function refreshSessionMetadata() {
    try {
        const snapshot = await session.rpc?.metadata?.snapshot?.();
        sessionMessaging?.updateMetadata({
            title: snapshot?.initialName,
            titleSource: snapshot?.initialName ? "name" : undefined,
            summary: snapshot?.summary,
            cwd: snapshot?.workingDirectory,
        });
    } catch {
        // Metadata enrichment is best-effort; registration and messaging remain available.
    }
}

void refreshSessionMetadata();
process.once("exit", () => {
    stopMessagingEvents?.();
    sessionMessaging?.stop();
});
