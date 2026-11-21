# remote-agent

Backs the `remote_agent` tool, defined in `../extension.mjs` and registered through
`joinSession({ tools: [...] })` like every other Eyrie tool. There is no separate MCP
server. It lets Copilot delegate work to approved remote agents over
**A2A (Agent2Agent) 1.0.1**.

The model selects only an **approved logical agent alias**, never a URL, protocol or
credential. This module resolves the alias, handles authentication and runs bounded
polling. No local state is kept.

## Tool contract

```ts
remote_agent({
  operation: "request" | "follow_up" | "get_result" | "cancel",
  agent: string,           // approved alias, required on every operation
  prompt?: string,         // request/follow_up only
  contextId?: string,      // follow_up only: A2A Task.contextId, echoed back
  taskId?: string,         // follow_up (optional) / get_result / cancel: A2A Task.id
})
```

| Operation | Required args | A2A op underneath |
|---|---|---|
| `request` | `agent`, `prompt` | `message/send` (new context) |
| `follow_up` | `agent`, `contextId`, `prompt` (+ `taskId` if continuing) | `message/send` (existing context) |
| `get_result` | `agent`, `taskId` | `tasks/get` |
| `cancel` | `agent`, `taskId` | `tasks/cancel` |

`request` and `follow_up` ask the remote agent to admit the task and return immediately
(A2A `configuration.returnImmediately`). The client then polls until the task reaches a
terminal or `input-required` state, or until the connection's `timeoutMs` (default
10 minutes) lapses. Lapsing returns the current state and handles without cancelling
the remote task, so a later `get_result` or `cancel` works on the same task.

Waiting happens in this polling loop, never in a held-open HTTP request, because
gateways and proxies cut off long blocking requests and lose the `taskId`. Servers that
do not implement `returnImmediately` ignore it and block as before.

## Configuration: `remote-agents.json` (HQ root)

```json
{
  "agents": {
    "research-agent": {
      "name": "Research agent",
      "description": "Literature and web research",
      "agentCardUrl": "https://agent.example.com/.well-known/agent-card.json",
      "auth": {
        "token": { "source": "env", "envVar": "RESEARCH_AGENT_TOKEN" },
        "header": "bearer"
      },
      "timeoutMs": 600000
    }
  }
}
```

Set `EYRIE_REMOTE_AGENTS_CONFIG` to load a different file.

Auth resolution (`auth-resolver.mjs`) uses two independent settings:

- `auth.token.source`: `"env"` reads a secret from an environment variable;
  `"command"` runs a trusted local command (for example `gh auth token`) and uses its
  trimmed stdout, optionally cached for `cacheSeconds`. Use `command` for short-lived
  OAuth tokens.
- `auth.header`: `"bearer"` (`Authorization: Bearer <token>`) or
  `{"type": "api_key", "name": "X-Api-Key"}`.

Never store credentials in the config, only an environment variable name or a
command. Validate against `remote-agents.schema.json` in this folder.

## Scope

- A2A 1.0.1 over HTTPS/JSON (both the `JSONRPC` and `HTTP+JSON` transport bindings),
  text-only messages, polling (no streaming, no push notifications).
- Outbound only: this is a client, not an A2A server.
- One flat catalog of approved agents.

## No local state

Every operation takes `agent`, and `contextId`/`taskId` are the real A2A protocol ids.
There is no local mapping file.

## Files

```
remote-agent/
  operations.mjs              # request/follow_up/get_result/cancel + bounded polling
  registry.mjs                # load + validate remote-agents.json, alias resolution
  auth-resolver.mjs           # token source x header shape credential resolution
  a2a-client.mjs              # A2A 1.0.1 wire client (JSON-RPC + HTTP+JSON bindings)
  remote-agents.schema.json   # JSON Schema for remote-agents.json
  remote-agent.test.mjs       # colocated Node test (fake in-process A2A server)
  README.md                   # this file
```

## Testing

From the HQ root:

```sh
node --test ".github/extensions/eyrie/**/*.test.mjs"
```
