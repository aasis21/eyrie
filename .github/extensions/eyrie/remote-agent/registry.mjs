// Loads and validates <hq>/remote-agents.json. The model only ever sees agent aliases
// (object keys) + name/description; this module is the only place that resolves an alias to a
// real endpoint and credential.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { eyrieRoot } from "../projects/registry.mjs";
import { resolveToken } from "./auth-resolver.mjs";

export async function loadRegistry(configPath = process.env.EYRIE_REMOTE_AGENTS_CONFIG || join(eyrieRoot(), "remote-agents.json")) {
  let raw;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      return { configPath, agents: {} };
    }
    throw err;
  }

  const parsed = JSON.parse(raw);
  const agents = parsed.agents || {};

  for (const [alias, cfg] of Object.entries(agents)) {
    if (!cfg.agentCardUrl) {
      throw new Error(`remote-agents.json: agent "${alias}" is missing agentCardUrl`);
    }
    if (!cfg.auth || !cfg.auth.token || !cfg.auth.header) {
      throw new Error(
        `remote-agents.json: agent "${alias}" is missing auth.token/auth.header ` +
          `(see .github/extensions/eyrie/remote-agent/README.md)`
      );
    }
    if (!["env", "command"].includes(cfg.auth.token.source)) {
      throw new Error(
        `remote-agents.json: agent "${alias}" has unsupported auth.token.source "${cfg.auth.token.source}" ` +
          `("env" or "command" only)`
      );
    }
    if (cfg.auth.token.source === "env" && !cfg.auth.token.envVar) {
      throw new Error(`remote-agents.json: agent "${alias}" auth.token.source="env" is missing envVar`);
    }
    if (cfg.auth.token.source === "command" && !cfg.auth.token.command) {
      throw new Error(`remote-agents.json: agent "${alias}" auth.token.source="command" is missing command`);
    }
  }

  return { configPath, agents };
}

export function resolveAgent(registry, alias) {
  const cfg = registry.agents[alias];
  if (!cfg) {
    const known = Object.keys(registry.agents);
    throw new Error(
      `Unknown remote agent "${alias}". Approved agents: ${known.length ? known.join(", ") : "(none configured)"}`
    );
  }
  if (cfg.enabled === false) {
    throw new Error(`Remote agent "${alias}" is registered but disabled.`);
  }
  return cfg;
}

export async function resolveCredential(cfg, alias) {
  try {
    return await resolveToken(cfg.auth.token, { cacheKey: alias });
  } catch (err) {
    throw new Error(`Remote agent "${alias}" credential resolution failed: ${err.message}`);
  }
}

// Compact, protocol-neutral catalog the model is allowed to see. Never includes
// agentCardUrl, auth scheme/envVar, or anything else that leaks connection internals.
export function describeCatalog(registry) {
  return Object.entries(registry.agents)
    .filter(([, cfg]) => cfg.enabled !== false)
    .map(([alias, cfg]) => ({
      agent: alias,
      name: cfg.name,
      description: cfg.description || "",
    }));
}
