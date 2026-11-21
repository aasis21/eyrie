// Minimal A2A 1.0.1 client adapter: HTTPS + JSON-RPC 2.0, text-only, polling (no streaming,
// no push notifications).

import { randomUUID } from "node:crypto";

import { applyAuthHeader } from "./auth-resolver.mjs";

const AGENT_CARD_PATHS = ["/.well-known/agent-card.json", "/.well-known/agent.json"];

async function authHeaders(cfg, token) {
  return applyAuthHeader(cfg.auth.header, token);
}

export async function fetchAgentCard(cfg, token) {
  const headers = await authHeaders(cfg, token);
  const res = await fetch(cfg.agentCardUrl, { headers });
  if (!res.ok) {
    throw new Error(`Agent Card fetch failed (${res.status} ${res.statusText}) for ${cfg.agentCardUrl}`);
  }
  const card = await res.json();
  // A2A 1.0.1 Agent Cards carry the JSON-RPC endpoint under supportedInterfaces[] (ordered by
  // preference per spec), not a bare top-level   "url" (see the official A2A spec at
    // a2a-protocol.org). This client only speaks the
  // HTTP+JSON/JSON-RPC binding, so prefer the first entry only if it matches; otherwise search
  // for a JSON-capable entry before giving up, rather than silently picking an unusable transport
  // (e.g. websocket/grpc) and failing later with a confusing RPC error.
  // A2A defines three transport bindings: "JSONRPC" (single endpoint, JSON-RPC 2.0 envelope,
  // method name in body), "HTTP+JSON" (REST-style, one path+verb per operation, e.g.
  // POST {url}/message:send), and "GRPC". This client supports the first two.
  if (!card.url) {
    const interfaces = card.supportedInterfaces || card.interfaces || [];
    const isSupportedBinding = (i) => /^(json-?rpc|http\+json)$/i.test((i.protocolBinding || "").trim());
    const chosen = (interfaces[0] && isSupportedBinding(interfaces[0]) ? interfaces[0] : null) ||
      interfaces.find(isSupportedBinding);
    if (chosen?.url) {
      card.url = chosen.url;
      card.protocolVersion = chosen.protocolVersion;
      card.protocolBinding = chosen.protocolBinding;
    }
    if (!card.url && interfaces.length) {
      throw new Error(
        `Agent Card at ${cfg.agentCardUrl} declares no JSON-RPC/HTTP+JSON interface this client ` +
          `supports (found: ${interfaces.map((i) => i.protocolBinding).join(", ")}).`
      );
    }
  }
  if (!card.url) {
    throw new Error(
      `Agent Card at ${cfg.agentCardUrl} has no usable JSON-RPC endpoint ` +
        `(expected top-level "url" or a "supportedInterfaces[].url").`
    );
  }
  return card;
}

// REST (HTTP+JSON) path+verb mapping per the A2A spec: one resource path per operation, method
// name is never sent in the body (unlike JSON-RPC). "params" is the raw operation input object.
const REST_ROUTES = {
  "message/send": (base, params) => ({ method: "POST", url: `${base}/message:send`, body: params }),
  "tasks/get": (base, params) => ({ method: "GET", url: `${base}/tasks/${params.id}`, body: undefined }),
  "tasks/cancel": (base, params) => ({ method: "POST", url: `${base}/tasks/${params.id}:cancel`, body: {} }),
};

async function callJsonRpc(endpoint, headers, protocolVersion, method, params) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "A2A-Version": protocolVersion || "1.0",
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`A2A ${method} failed (${res.status} ${res.statusText}): ${JSON.stringify(body)}`);
  }
  if (body?.error) {
    throw new Error(`A2A ${method} returned an error: ${JSON.stringify(body.error)}`);
  }
  return body?.result;
}

async function callRest(baseUrl, headers, protocolVersion, method, params) {
  const route = REST_ROUTES[method];
  if (!route) throw new Error(`A2A HTTP+JSON binding has no route mapping for method "${method}".`);
  const { method: verb, url, body } = route(baseUrl, params);
  const res = await fetch(url, {
    method: verb,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      // Some deployments reject requests without it (400 VERSION_NOT_SUPPORTED). Sending the
      // interface's own declared protocolVersion is correct whether or not a deployment enforces it.
      "A2A-Version": protocolVersion || "1.0",
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`A2A ${method} failed (${res.status} ${res.statusText}): ${JSON.stringify(result)}`);
  }
  if (result?.error) {
    throw new Error(`A2A ${method} returned an error: ${JSON.stringify(result.error)}`);
  }
  return result;
}

// Dispatches to the binding the Agent Card actually advertised (set during fetchAgentCard),
// rather than guessing — "HTTP+JSON" and "JSONRPC" are different wire formats, not synonyms.
function rpc(card, headers, method, params) {
  return /^http\+json$/i.test(card.protocolBinding || "")
    ? callRest(card.url, headers, card.protocolVersion, method, params)
    : callJsonRpc(card.url, headers, card.protocolVersion, method, params);
}

// request / follow_up both call message/send; the only difference is whether an existing
// contextId/taskId is supplied. A direct Message result and a tracked Task result are both valid.
//
// `returnImmediately` asks the server to admit the task and return right away instead of holding
// the HTTP request open until the work finishes. Without it a long investigation blocks inside
// message/send until an intermediary gives up (observed: 504 Gateway Timeout on a 150s task), and
// the caller never receives the taskId it needs to collect the result later. Bounded waiting
// belongs to this client's own polling loop, not to a hanging request. Servers that do not
// implement the field ignore it and simply block as before.
export async function sendMessage({ cfg, token, prompt, contextId, taskId, returnImmediately = true }) {
  const card = await fetchAgentCard(cfg, token);
  const headers = await authHeaders(cfg, token);
  const message = {
    role: "ROLE_USER", // A2A's Role enum is serialized by name in proto3 JSON, not "user".
    parts: [{ text: prompt }], // Part is a oneof; "text" is the field name, there is no "kind".
    messageId: randomUUID(),
    ...(contextId ? { contextId } : {}),
    ...(taskId ? { taskId } : {}),
  };
  // SendMessageResponse is itself a oneof { task | message } — unwrap it before normalizing,
  // unlike GetTask/CancelTask which return a bare Task.
  const response = await rpc(card, headers, "message/send", {
    message,
    ...(returnImmediately ? { configuration: { returnImmediately: true } } : {}),
  });
  return normalizeResult(response?.task || response?.message || response);
}

export async function getTaskStatus({ cfg, token, providerTaskId }) {
  const card = await fetchAgentCard(cfg, token);
  const headers = await authHeaders(cfg, token);
  const result = await rpc(card, headers, "tasks/get", { id: providerTaskId });
  return normalizeResult(result);
}

export async function cancelTask({ cfg, token, providerTaskId }) {
  const card = await fetchAgentCard(cfg, token);
  const headers = await authHeaders(cfg, token);
  const result = await rpc(card, headers, "tasks/cancel", { id: providerTaskId });
  return normalizeResult(result);
}

// Normalizes an A2A Message-or-Task result into one shape the MCP tool returns, so the model
// doesn't need to know A2A's wire schema. Result states: direct
// answer, working, input-required, completed, canceled, failed, unknown.
function normalizeResult(result) {
  if (!result) return { kind: "unknown" };

  if (result.kind === "message" || (result.parts && !result.status)) {
    return {
      kind: "message",
      text: (result.parts || []).map((p) => p.text).filter(Boolean).join("\n"),
    };
  }

  // Task shape: { id, contextId, status: { state, message? }, artifacts?: [...] }
  // Proto3 JSON serializes TaskState by its enum name (e.g. "TASK_STATE_COMPLETED"); normalize
  // that down to the lowercase short form ("completed") this tool documents, while still passing
  // through an already-short state untouched (e.g. the test's fake server).
  const rawState = result.status?.state || "unknown";
  const state = rawState.startsWith("TASK_STATE_")
    ? rawState.slice("TASK_STATE_".length).toLowerCase().replace(/_/g, "-")
    : rawState;
  const text =
    result.status?.message?.parts?.map((p) => p.text).filter(Boolean).join("\n") ||
    (result.artifacts || [])
      .flatMap((a) => a.parts || [])
      .map((p) => p.text)
      .filter(Boolean)
      .join("\n");

  return {
    kind: "task",
    taskId: result.id, // A2A's Task.id — the real protocol-level id, used directly (no local alias)
    contextId: result.contextId, // A2A's Task.contextId — echo back on follow_up to continue this context
    state, // submitted | working | input-required | completed | canceled | failed | unknown
    text,
  };
}
