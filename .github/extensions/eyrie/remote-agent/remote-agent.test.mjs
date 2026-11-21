// Colocated regression test for the remote_agent tool's core logic: boots a throwaway
// in-process fake A2A server (JSON-RPC) and drives opRequest -> poll-to-completion ->
// opGetResult, plus the unknown-agent error path, directly against operations.mjs — no MCP
// transport involved, since this module is transport-agnostic. No local state file is
// involved either: taskId/contextId are the fake server's own A2A-shaped ids, passed straight
// through, matching how operations.mjs now works against a real agent.
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";

import { loadRegistry, resolveAgent } from "./registry.mjs";
import { opRequest, opGetResult } from "./operations.mjs";

test("request polls a working task through to completion, then get_result re-reads it", async () => {
  let taskState = "submitted";
  let pollCount = 0;

  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url === "/.well-known/agent-card.json") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ name: "Fake Agent", url: `http://127.0.0.1:${port}/rpc` }));
        return;
      }
      const msg = JSON.parse(body);
      res.setHeader("Content-Type", "application/json");
      if (msg.method === "message/send") {
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { id: "provider-task-1", contextId: "provider-ctx-1", status: { state: "working" } },
          })
        );
      } else if (msg.method === "tasks/get") {
        pollCount += 1;
        if (pollCount >= 2) taskState = "completed";
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: {
              id: "provider-task-1",
              contextId: "provider-ctx-1",
              status: {
                state: taskState,
                message:
                  taskState === "completed"
                    ? { parts: [{ text: "the build is slow due to a backend retry storm" }] }
                    : undefined,
              },
            },
          })
        );
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { message: "unknown method" } }));
      }
    });
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  process.env.EYRIE_TEST_AGENT_TOKEN = "fake-token";

  try {
    const registry = await loadRegistry("does-not-exist-remote-agents.json"); // start empty
    registry.agents["test-agent"] = {
      name: "Test Agent",
      description: "Local smoke-test A2A agent",
      agentCardUrl: `http://127.0.0.1:${port}/.well-known/agent-card.json`,
      auth: { token: { source: "env", envVar: "EYRIE_TEST_AGENT_TOKEN" }, header: "bearer" },
      timeoutMs: 15000,
    };

    const requested = await opRequest(registry, { agent: "test-agent", prompt: "why is the nightly build slow?" });
    assert.equal(requested.state, "completed");
    assert.match(requested.text, /retry storm/);
    assert.equal(requested.taskId, "provider-task-1");

    const reRead = await opGetResult(registry, { agent: "test-agent", taskId: requested.taskId });
    assert.equal(reRead.state, "completed");
    assert.equal(reRead.taskId, requested.taskId);

    assert.throws(() => resolveAgent(registry, "does-not-exist"), /Unknown remote agent/);
  } finally {
    server.close();
    delete process.env.EYRIE_TEST_AGENT_TOKEN;
  }
});

test("request admits work non-blockingly and returns handles when the observation window lapses", async () => {
  const sendConfigurations = [];

  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url === "/.well-known/agent-card.json") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ name: "Slow Agent", url: `http://127.0.0.1:${port}/rpc` }));
        return;
      }
      const msg = JSON.parse(body);
      res.setHeader("Content-Type", "application/json");
      if (msg.method === "message/send") {
        // The server never blocks here; it records what the client asked for and admits the task.
        sendConfigurations.push(msg.params.configuration);
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { id: "slow-task-1", contextId: "slow-ctx-1", status: { state: "TASK_STATE_SUBMITTED" } },
          })
        );
      } else if (msg.method === "tasks/get") {
        // Work that outlives the caller's patience: never reaches a terminal state here.
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { id: "slow-task-1", contextId: "slow-ctx-1", status: { state: "TASK_STATE_WORKING" } },
          })
        );
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { message: "unknown method" } }));
      }
    });
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  process.env.EYRIE_TEST_AGENT_TOKEN = "fake-token";

  try {
    const registry = await loadRegistry("does-not-exist-remote-agents.json");
    registry.agents["slow-agent"] = {
      name: "Slow Agent",
      description: "Local smoke-test agent whose work never finishes",
      agentCardUrl: `http://127.0.0.1:${port}/.well-known/agent-card.json`,
      auth: { token: { source: "env", envVar: "EYRIE_TEST_AGENT_TOKEN" }, header: "bearer" },
      timeoutMs: 1,
    };

    const requested = await opRequest(registry, { agent: "slow-agent", prompt: "sleep for a long time" });

    // The caller must ask the server not to hold the request open, otherwise a long task blocks
    // inside message/send until an intermediary returns 504 and no taskId is ever delivered.
    assert.deepEqual(sendConfigurations, [{ returnImmediately: true }]);

    // A lapsed window surfaces the live state plus the handles needed to collect the result later,
    // and must not cancel the remote task.
    assert.equal(requested.state, "working");
    assert.equal(requested.taskId, "slow-task-1");
    assert.equal(requested.contextId, "slow-ctx-1");
  } finally {
    server.close();
    delete process.env.EYRIE_TEST_AGENT_TOKEN;
  }
});
