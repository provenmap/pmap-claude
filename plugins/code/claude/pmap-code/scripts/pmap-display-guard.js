#!/usr/bin/env node
/**
 * PostToolUse display guard (Claude/Codex plugin hook; Cursor with
 * `--dialect cursor`).
 *
 * When a Bash tool call ran a ProvenMap CLI, inject two reminders — the
 * script, not the model, owns user-facing rendering (see command standards
 * in the source repo):
 *   1. when the JSON output carries a `display` field: print it verbatim;
 *   2. always: when this command's workflow completes, close with its
 *      `--after <command>` next-steps footer, as the command body says.
 * The display body itself is NOT repeated here; it is already in the tool
 * result — this only pins the behavior.
 *
 * It also writes the per-session TURN MARKER the Stop-hook gate
 * (pmap-next-steps-gate.js) reads: `<tmpdir>/provenmap-turn-<session_id>.json`
 * = { sessionId, at, script, args } — proof that a plugin script ran this
 * turn. Temp dir, never the project: the architect plugin has no .provenmap,
 * and a repo must not grow files because a hook fired. Cursor's hooks cannot
 * block a stop, so the cursor dialect writes no marker.
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
  "When this command's workflow completes, close with its `--after <command>` next-steps footer as the command body says, and print that footer verbatim.";

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

function writeTurnMarker(input, command) {
  // The session id names a temp file — accept only a plain token.
  const sessionId =
    typeof input.session_id === "string" && /^[A-Za-z0-9._-]+$/.test(input.session_id)
      ? input.session_id
      : null;
  if (!sessionId) return;
  const m = command.match(/scripts\/(pmap-[A-Za-z0-9-]+\.js)\s*([^\n|;&]*)/);
  if (!m) return;
  const record = {
    sessionId,
    at: new Date().toISOString(),
    script: m[1],
    args: m[2].trim().slice(0, 200),
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
  if (!command.includes("scripts/pmap-")) return;

  const reminders = [];
  if (carriesDisplay(responseText(input.tool_response !== undefined ? input.tool_response : input.tool_output))) {
    reminders.push(DISPLAY_REMINDER);
  }
  reminders.push(CLOSING_REMINDER);

  if (dialect === "cursor") {
    console.log(JSON.stringify({ additional_context: reminders.join(" ") }));
    return;
  }

  writeTurnMarker(input, command);
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
