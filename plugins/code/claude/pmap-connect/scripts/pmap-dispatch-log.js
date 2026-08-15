#!/usr/bin/env node
/**
 * PostToolUse dispatch log (Claude/Codex plugin hook, matcher: Task).
 * Appends one JSONL record per subagent dispatch — agent type, requested
 * model, prompt head — to `.provenmap/dispatch-log.jsonl`. This is the
 * deterministic ground truth for "did /analyze actually use subagents, and
 * with what model": the HOST fires it, not the model's discipline. (Born
 * from the 2026-08-15 portal run: `analysis.subagentModel` was configured,
 * zero agents ran, and nothing on any screen said so.)
 *
 * The model recorded is the one REQUESTED at the dispatch boundary — no
 * layer downstream can verify what actually served the agent.
 *
 * Observability only: emits no hook output and never blocks the tool call.
 * Writes only where `.provenmap` already exists — a repo that never opted
 * into ProvenMap must not grow files because a hook fired. Fail-open by
 * design: any problem exits 0 silently. Plain node, no dependencies, no
 * build tokens (copied untokenized by build-plugins.js).
 */

"use strict";

const fs = require("fs");
const path = require("path");

const MAX_LINES = 400;
const KEEP_LINES = 200;

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return;
  }
  const toolInput =
    input && typeof input.tool_input === "object" && input.tool_input !== null
      ? input.tool_input
      : null;
  if (!toolInput) return;

  // Hook payload cwd first (authoritative for the session), then the env vars
  // the hosts export for hook commands (same cascade as check-config.sh).
  const projectDir =
    (typeof input.cwd === "string" && input.cwd) ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.CODEX_PROJECT_DIR ||
    process.cwd();
  const pmapDir = path.join(projectDir, ".provenmap");
  if (!fs.existsSync(pmapDir)) return;

  const record = {
    at: new Date().toISOString(),
    agentType: typeof toolInput.subagent_type === "string" ? toolInput.subagent_type : null,
    model: typeof toolInput.model === "string" ? toolInput.model : null,
    promptHead: typeof toolInput.prompt === "string" ? toolInput.prompt.slice(0, 160) : null,
  };

  const file = path.join(pmapDir, "dispatch-log.jsonl");
  try {
    fs.appendFileSync(file, JSON.stringify(record) + "\n");
    // Cap unbounded growth: once past MAX_LINES, keep only the newest KEEP_LINES.
    const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
    if (lines.length > MAX_LINES) {
      fs.writeFileSync(file, lines.slice(-KEEP_LINES).join("\n") + "\n");
    }
  } catch {
    return;
  }
}

main();
