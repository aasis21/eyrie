// Credential resolver for the remote_agent tool.
//
// Design: two independent axes, not a per-vendor scheme enum.
//   - token source: HOW a credential is obtained ("env" | "command")
//   - header shape: HOW the resolved token is attached to a request ("bearer" | api_key)
// Any source can pair with any header shape. Adding a new agent's auth style should mean
// adding a registry entry, not new code here, unless it needs a genuinely new source/shape.
//
// This lives alongside remote-agent (its only consumer) rather than in a shared location.
// If a second Eyrie connector later needs the same resolver, extract it then — not before.
//
// Trust boundary: authConfig (env var names, commands) comes from operator-controlled registry
// files (e.g. remote-agents.json), never from the model. Never log/return the resolved token.

import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCb);

// cacheKey -> { token, expiresAt } for source="command" with cacheSeconds set.
const commandTokenCache = new Map();

/**
 * Resolve a credential value from an authConfig.token descriptor.
 * @param {{source: "env", envVar: string} | {source: "command", command: string, cacheSeconds?: number}} tokenCfg
 * @param {{cacheKey?: string}} [opts] cacheKey scopes the command-result cache (e.g. the agent alias).
 * @returns {Promise<string>}
 */
export async function resolveToken(tokenCfg, opts = {}) {
  if (!tokenCfg || !tokenCfg.source) {
    throw new Error('auth.token is missing a "source" ("env" or "command").');
  }

  if (tokenCfg.source === "env") {
    if (!tokenCfg.envVar) throw new Error('auth.token.source="env" requires "envVar".');
    const value = process.env[tokenCfg.envVar];
    if (!value) {
      throw new Error(`credential env var "${tokenCfg.envVar}" is not set.`);
    }
    return value;
  }

  if (tokenCfg.source === "command") {
    if (!tokenCfg.command) throw new Error('auth.token.source="command" requires "command".');
    const cacheKey = opts.cacheKey || tokenCfg.command;
    const cached = commandTokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    let stdout;
    try {
      ({ stdout } = await exec(tokenCfg.command, { windowsHide: true }));
    } catch (err) {
      // err.stderr may contain useful diagnostics (e.g. "az: not logged in") and is not expected
      // to contain the credential itself, since the command hasn't produced one on failure.
      const detail = (err.stderr || err.message || "").toString().trim().split("\n")[0];
      throw new Error(`auth.token command failed: ${detail}`);
    }

    const token = stdout.toString().trim();
    if (!token) {
      throw new Error("auth.token command produced no output.");
    }

    if (tokenCfg.cacheSeconds > 0) {
      commandTokenCache.set(cacheKey, { token, expiresAt: Date.now() + tokenCfg.cacheSeconds * 1000 });
    }
    return token;
  }

  throw new Error(`Unsupported auth.token.source "${tokenCfg.source}".`);
}

/**
 * Build the HTTP header(s) carrying a resolved token.
 * @param {"bearer" | {type: "api_key", name?: string}} header
 * @param {string} token
 * @returns {Record<string, string>}
 */
export function applyAuthHeader(header, token) {
  if (header === "bearer" || header?.type === "bearer") {
    return { Authorization: `Bearer ${token}` };
  }
  if (header?.type === "api_key") {
    return { [header.name || "X-Api-Key"]: token };
  }
  throw new Error(`Unsupported auth.header "${JSON.stringify(header)}".`);
}
