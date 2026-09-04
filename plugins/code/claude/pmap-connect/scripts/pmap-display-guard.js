#!/usr/bin/env node
/**
 * PostToolUse display guard (Claude/Codex plugin hook; Cursor with
 * `--dialect cursor`).
 *
 * When a Bash tool call ran a ProvenMap CLI, inject two reminders — the
 * script, not the model, owns user-facing rendering (see command standards
 * in the source repo):
 *   1. when the JSON output carries a `display` field: print it verbatim;
 *   2. for a script that does work: when this command's workflow completes,
 *      close with its `--after <command>` next-steps footer, as the command
 *      body says — and add no next-step suggestions of your own beside it.
 * The display body itself is NOT repeated here; it is already in the tool
 * result — this only pins the behavior.
 *
 * It also writes the per-session TURN MARKER the Stop-hook gate
 * (pmap-next-steps-gate.js) reads: `<tmpdir>/provenmap-turn-<session_id>.json`
 * = { sessionId, at, script, args, pluginRoot } — proof that a plugin script
 * ran this turn, and whose. Temp dir, never the project: the architect plugin has no .provenmap,
 * and a repo must not grow files because a hook fired. Cursor's hooks cannot
 * block a stop, so the cursor dialect writes no marker.
 *
 * Two things it deliberately does NOT do:
 *   - Stamp or remind for a GUIDANCE-NEUTRAL invocation — a script that only
 *     renders guidance or ends the session (`pmap-help`, `pmap-status` in any
 *     mode, `--next`/`--after`, logout, update). Those are exactly what the
 *     opted-out commands (`next-steps: none`) run; stamping there made the
 *     gate nudge after `/start` → Not now, and the model then printed the
 *     ladder a second time as a footer. A test pins the neutral set against
 *     the opted-out command bodies.
 *   - Fire for a script another installed plugin owns. With code, connect and
 *     architect installed, every call used to inject three identical
 *     reminders. An absolute script path is owned by the plugin whose root
 *     contains it — and that root is written into the marker so the gate of
 *     the SAME plugin claims it; a token (`${CLAUDE_PLUGIN_ROOT}/…`) or
 *     relative path resolves to no one plugin from here, so it is owned when
 *     this plugin ships a script of that name (the gate's fallback rule).
 *
 * Dialects: Claude/Codex read `hookSpecificOutput.additionalContext`; Cursor
 * reads a top-level `additional_context` and hands the tool result over as
 * `tool_output`.
 *
 * Fail-open by design: any parse problem exits 0 with no output. Plain node,
 * no dependencies, no build tokens (copied untokenized by build-plugins.js).
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const DISPLAY_REMINDER =
  "The ProvenMap CLI output above includes a `display` field of ready-to-print markdown. Print that display to the user verbatim — do not reformat, reorder, summarise, or rebuild its tables.";
const CLOSING_REMINDER =
  "When this command's workflow completes, close with its `--after <command>` next-steps footer as the command body says, and print that footer verbatim. That footer is the only next-step guidance — add no suggestions of your own beside it.";

/** This plugin's root: the guard ships at `<root>/scripts/`. */
const PLUGIN_ROOT = path.resolve(__dirname, "..");

const hasFlag = (args, flag) => new RegExp(`(^|\\s)${flag}(\\s|$)`).test(args);

/**
 * Invocations that render guidance or end the session — never work that a
 * footer should follow. Keyed by script; the rule reads the args.
 */
const GUIDANCE_NEUTRAL = {
  "pmap-help.js": () => true,
  "pmap-status.js": () => true,
  "pmap-update.js": () => true,
  "pmap-preflight.js": () => true,
  "pmap-login.js": (args) => hasFlag(args, "--logout"),
  "pmap-architect.js": (args) =>
    ["--next", "--after", "--status", "--logout", "--session-start"].some((flag) => hasFlag(args, flag)),
};

function isGuidanceNeutral(invocation) {
  const rule = GUIDANCE_NEUTRAL[invocation.script];
  return Boolean(rule) && rule(invocation.args);
}

/** Tool result shapes vary by host — accept a string or an object carrying stdout. */
function responseText(response) {
  if (typeof response === "string") return response;
  if (response && typeof response.stdout === "string") return response.stdout;
  if (response === undefined || response === null) return "";
  try {
    return JSON.stringify(response);
  } catch {
    return "";
  }
}

function carriesDisplay(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return false;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Boolean(parsed) && typeof parsed.display === "string";
  } catch {
    return false;
  }
}

/**
 * A ProvenMap CLI *invocation* — `node …/scripts/pmap-<name>.js <args>` — as
 * opposed to a command that merely names a script file (`cat`, `sed`, `grep`
 * over the hook sources matched the old bare-filename test and nudged a
 * turn that ran nothing). Returns { path, script, args } or null.
 */
function matchInvocation(command) {
  const m = command.match(/\bnode\s+((?:\S*\/)?scripts\/(pmap-[A-Za-z0-9-]+\.js))\s*([^\n|;&]*)/);
  return m ? { path: m[1], script: m[2], args: m[3].trim().slice(0, 200) } : null;
}

/**
 * Whether the invoked script is THIS plugin's to remind and stamp for, and
 * how we know: "root" when the absolute path lies under this plugin's root
 * (Claude Code resolves the plugin-root token before the model runs it, so
 * this is the common case there), "name" when a token or relative path
 * cannot name an owner and this plugin ships a script of that name, null
 * when it is not ours.
 */
function ownership(invocation) {
  if (path.isAbsolute(invocation.path)) {
    let target = path.resolve(invocation.path);
    let root = PLUGIN_ROOT;
    try {
      target = fs.realpathSync(target);
      root = fs.realpathSync(root);
    } catch {
      /* compare as given */
    }
    return target.startsWith(root + path.sep) ? "root" : null;
  }
  return fs.existsSync(path.join(__dirname, invocation.script)) ? "name" : null;
}

function writeTurnMarker(input, invocation, owned) {
  // A subagent's tool calls carry the parent's session_id plus an agent_id.
  // Its script runs are the agent's own workflow — the orchestrator's footer
  // comes at the join — so they must not stamp the parent's turn marker
  // (the 2026-09-02 portal run: every nudge named a --skeleton/--detail the
  // orchestrator never ran, and the footer it then printed was stale).
  if (typeof input.agent_id === "string" && input.agent_id !== "") return;
  // The session id names a temp file — accept only a plain token.
  const sessionId =
    typeof input.session_id === "string" && /^[A-Za-z0-9._-]+$/.test(input.session_id)
      ? input.session_id
      : null;
  if (!sessionId) return;
  // `pluginRoot` tells the Stop gate WHICH plugin's turn this was — common
  // scripts (pmap-update, pmap-insights, …) ship in every plugin, and the
  // gate of the wrong one used to win the claim and nudge with its own CLI
  // (an architect footer under /pmap-code:update). Null when owned by name:
  // the gate then falls back to ships-by-name.
  const record = {
    sessionId,
    at: new Date().toISOString(),
    script: invocation.script,
    args: invocation.args,
    pluginRoot: owned === "root" ? PLUGIN_ROOT : null,
  };
  try {
    fs.writeFileSync(
      path.join(os.tmpdir(), `provenmap-turn-${sessionId}.json`),
      JSON.stringify(record),
    );
  } catch {
    /* fail open */
  }
}

function main() {
  const argv = process.argv.slice(2);
  const dialect = argv[argv.indexOf("--dialect") + 1] || "claude";

  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return;
  }

  const command =
    input && input.tool_input && typeof input.tool_input.command === "string"
      ? input.tool_input.command
      : "";
  const invocation = matchInvocation(command);
  const owned = invocation ? ownership(invocation) : null;
  if (!owned) return;
  const neutral = isGuidanceNeutral(invocation);

  const reminders = [];
  if (carriesDisplay(responseText(input.tool_response !== undefined ? input.tool_response : input.tool_output))) {
    reminders.push(DISPLAY_REMINDER);
  }
  if (!neutral) reminders.push(CLOSING_REMINDER);

  if (dialect === "cursor") {
    if (reminders.length) console.log(JSON.stringify({ additional_context: reminders.join(" ") }));
    return;
  }

  if (!neutral) writeTurnMarker(input, invocation, owned);
  if (!reminders.length) return;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: reminders.join(" "),
      },
    }),
  );
}

main();
