import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const extensionUrl = new URL("./extension.mjs", import.meta.url);
const mocks = new Map([
    ["@github/copilot-sdk/extension", `
        export const joinSession = (config) => globalThis.eyrieExtensionTest.join(config);
    `],
    ["@github/copilot-sdk", `
        export const defineTool = (name, definition) => ({ name, ...definition });
    `],
    ["./projects/activation.mjs", `
        const t = () => globalThis.eyrieExtensionTest;
        export const bootstrap = ({ cwd }) => "Eyrie mode: hq; primary: " + cwd;
        export const sessionMode = () => "hq";
        export const primaryAlias = () => null;
        export const activeAliases = () => [];
        export const flushPendingContext = () => t().pending.shift() || null;
        export const nextActiveScopeContext = () => null;
        export const activateProject = (alias, options) => {
            t().calls.push(["activate", alias, options]);
            t().pending.push("catalog for " + alias);
            return { ok: true, message: "Activated '" + alias + "'.", catalog: "catalog for " + alias };
        };
        export const deactivateProject = (alias) => ({ ok: true, message: "Deactivated '" + alias + "'." });
        export const peekProject = () => ({ ok: true, catalog: "peek" });
        export const searchCopilotAssets = (args) => {
            t().calls.push(["search", args]);
            return { ok: true, rendered: "results" };
        };
        export const statusText = () => "Mode: HQ";
    `],
    ["./sessions/messaging.mjs", `
        export const DELIVERY_MODES = ["enqueue", "steer", "interrupt", "notify", "context"];
        export const createSessionMessaging = () => ({
            processInbox: async () => {}, drainPendingContext: () => "",
            stop() {}, setBusy() {}, updateTitle() {}, updateMetadata() {},
        });
    `],
    ["./projects/registry.mjs", `
        export const eyrieRoot = () => "/eyrie-test-hq-without-lore";
        export const getProject = () => null;
        export const defaultArea = () => null;
    `],
    ["./remote-agent/registry.mjs", `
        export const loadRegistry = async () => ({ agents: {} });
        export const describeCatalog = () => [];
    `],
]);

test("registers the Eyrie tools, /eyrie command, and session hooks", { timeout: 5000 }, async () => {
    const messages = [];
    const session = {
        sessionId: "0233eccc-44b7-4c56-9c7e-40a8015eac46",
        log: (message) => messages.push(message),
        on: () => () => {},
        rpc: { metadata: { snapshot: async () => ({}) } },
    };
    const fixture = {
        calls: [],
        pending: [],
        async join(config) {
            fixture.config = config;
            fixture.startup = await config.hooks.onSessionStart({ workingDirectory: "/hq" });
            return session;
        },
    };
    globalThis.eyrieExtensionTest = fixture;
    const resolver = registerHooks({
        resolve(specifier, context, nextResolve) {
            if (context.parentURL?.split("?")[0] === extensionUrl.href && mocks.has(specifier)) {
                return {
                    url: `data:text/javascript,${encodeURIComponent(mocks.get(specifier))}`,
                    shortCircuit: true,
                };
            }
            return nextResolve(specifier, context);
        },
    });
    try {
        await import(extensionUrl.href);
        const { tools, commands, hooks } = fixture.config;
        assert.deepEqual(tools.map((tool) => tool.name).sort(), [
            "eyrie_activate", "eyrie_deactivate", "eyrie_peek", "eyrie_search",
            "eyrie_session_inbox", "eyrie_session_list", "eyrie_session_send", "remote_agent",
        ]);
        assert.deepEqual(commands.map((command) => command.name), ["eyrie"]);
        assert.match(fixture.startup.additionalContext, /Eyrie mode: hq; primary: \/hq/);

        const eyrie = commands[0];
        await eyrie.handler({ args: "" });
        assert.match(messages.at(-1), /Mode: HQ/);

        await eyrie.handler({ args: "activate demo" });
        assert.deepEqual(fixture.calls.at(-1), ["activate", "demo", { injectOnNextTurn: true }]);
        assert.deepEqual(await hooks.onUserPromptSubmitted(), { additionalContext: "catalog for demo" });
        assert.equal(await hooks.onUserPromptSubmitted(), undefined);

        await eyrie.handler({ args: "search -p demo -k skill -d -t 5 release notes" });
        assert.deepEqual(fixture.calls.at(-1), ["search", {
            project: "demo", kind: "skill", deep: true, top: 5, query: "release notes",
        }]);
        await eyrie.handler({ args: "search --top 0 x" });
        assert.match(messages.at(-1), /^Usage: \/eyrie search/);

        await eyrie.handler({ args: "bogus list" });
        assert.match(messages.at(-1), /Unknown subcommand 'bogus'/);
    } finally {
        resolver.deregister();
        delete globalThis.eyrieExtensionTest;
    }
});
