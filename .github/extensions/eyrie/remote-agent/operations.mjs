// Transport-agnostic remote_agent business logic: request/follow_up/get_result/cancel,
// bounded polling, and the registry-aliased catalog description. Deliberately has no
// dependency on how it is invoked (Eyrie extension tool today; an MCP server again
// tomorrow, if a second transport is ever needed) — see README.md "Transports".
//
// No local state is kept: every caller passes "agent" on every operation, and taskId/
// contextId are the real A2A protocol IDs (Task.id / Task.contextId), used as-is. This
// trades a slightly chattier contract (agent repeated on every call) for one less moving
// part — no state.json, no local-id <-> provider-id mapping to keep in sync.

import { resolveAgent, resolveCredential } from "./registry.mjs";
import { sendMessage, getTaskStatus, cancelTask } from "./a2a-client.mjs";

export const DEFAULT_TIMEOUT_MS = 600_000; // 10 minutes
const POLL_INTERVAL_MS = 2_000;
const TERMINAL_STATES = ["completed", "canceled", "failed", "input-required"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Bounded poll: observe an admitted task until terminal/input-required or the connection's
// timeout lapses. Lapsing returns current state + handles; it never cancels the remote task.
async function observeTask({ cfg, token, taskId, deadline }) {
  let status = await getTaskStatus({ cfg, token, providerTaskId: taskId });
  while (status.kind === "task" && !TERMINAL_STATES.includes(status.state) && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    status = await getTaskStatus({ cfg, token, providerTaskId: taskId });
  }
  return status;
}

// Admission and waiting are deliberately separate steps: sendMessage asks the agent to return as
// soon as the task is admitted, so all waiting happens in observeTask's poll loop where the
// deadline is ours to enforce. A blocking send would instead be cut off by gateways on long work.
async function sendAndObserve({ cfg, token, prompt, contextId, taskId, timeoutMs }) {
  const result = await sendMessage({ cfg, token, prompt, contextId, taskId });
  if (result.kind === "message") return result;
  if (TERMINAL_STATES.includes(result.state)) return result;
  const deadline = Date.now() + timeoutMs;
  return observeTask({ cfg, token, taskId: result.taskId, deadline });
}

export async function opRequest(registry, { agent, prompt }) {
  if (!agent || !prompt) throw new Error('operation "request" requires "agent" and "prompt".');
  const cfg = resolveAgent(registry, agent);
  const token = await resolveCredential(cfg, agent);
  const timeoutMs = cfg.timeoutMs || DEFAULT_TIMEOUT_MS;

  const observed = await sendAndObserve({ cfg, token, prompt, contextId: undefined, taskId: undefined, timeoutMs });
  return { agent, ...observed };
}

export async function opFollowUp(registry, { agent, contextId, taskId, prompt }) {
  if (!agent || !prompt || !contextId) {
    throw new Error('operation "follow_up" requires "agent", "contextId", and "prompt".');
  }
  const cfg = resolveAgent(registry, agent);
  const token = await resolveCredential(cfg, agent);
  const timeoutMs = cfg.timeoutMs || DEFAULT_TIMEOUT_MS;

  const observed = await sendAndObserve({ cfg, token, prompt, contextId, taskId, timeoutMs });
  return { agent, ...observed };
}

export async function opGetResult(registry, { agent, taskId }) {
  if (!agent || !taskId) throw new Error('operation "get_result" requires "agent" and "taskId".');
  const cfg = resolveAgent(registry, agent);
  const token = await resolveCredential(cfg, agent);
  const result = await getTaskStatus({ cfg, token, providerTaskId: taskId });
  return { agent, ...result };
}

export async function opCancel(registry, { agent, taskId }) {
  if (!agent || !taskId) throw new Error('operation "cancel" requires "agent" and "taskId".');
  const cfg = resolveAgent(registry, agent);
  const token = await resolveCredential(cfg, agent);
  const result = await cancelTask({ cfg, token, providerTaskId: taskId });
  return { agent, ...result };
}

// Single dispatcher so a transport only needs to know {operation, ...args} -> payload,
// without re-implementing the switch itself.
export async function runRemoteAgentOperation(registry, args) {
  switch (args.operation) {
    case "request":
      return opRequest(registry, args);
    case "follow_up":
      return opFollowUp(registry, args);
    case "get_result":
      return opGetResult(registry, args);
    case "cancel":
      return opCancel(registry, args);
    default:
      throw new Error(`Unknown operation "${args.operation}".`);
  }
}
