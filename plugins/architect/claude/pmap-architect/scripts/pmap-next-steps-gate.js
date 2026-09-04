#!/usr/bin/env node
/**
 * Stop-hook next-steps gate (Claude Code plugin hook).
 *
 * Every ProvenMap command closes with a script-rendered next-steps footer
 * (`<cli> --after <command>`, printed verbatim). This hook is the backstop
 * for the turn where the model ran one of the plugin's scripts and stopped
 * without that footer: it blocks the stop ONCE with the instruction to
 * render it, then lets the next stop through.
 *
 * How it knows a plugin script ran this turn: the PostToolUse display guard
 * (pmap-display-guard.js) writes a per-session turn marker in the temp dir
 * after every `scripts/pmap-*` Bash call that does work. The marker is
 * CLAIMED here by an atomic rename, so when sibling plugins are installed
 * and their Stop hooks fire in parallel, exactly one wins and exactly one
 * nudge is sent. WHICH one: the marker carries the owning plugin's root when
 * the guard could tell (an absolute script path) — a marker with another
 * plugin's root is left alone even if this plugin ships a script of that
 * name (common scripts ship everywhere; the architect's gate once claimed a
 * /pmap-code:update turn and nudged with its own CLI). A root-less marker
 * falls back to ships-by-name.
 *
 * Why the footer check is a loose /next steps/i match: the footer heading is
 * `**Next steps**` (core/reporting/next-steps.ts NEXT_STEPS_HEADING — keep the
 * two in sync), and /status's own "## Next steps" section is a legitimate
 * "already guided" answer that must not be nudged.
 *
 * Loop safety: `stop_hook_active` is true when Claude is already continuing
 * because of a Stop-hook block — never nudge again then; a consumed marker
 * cannot re-trigger on a later turn; the host caps consecutive blocks.
 *
 * Fail-open by design: any parse problem exits 0 with no output. Plain node,
 * no dependencies, no build tokens (copied untokenized by build-plugins.js).
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const FOOTER_PRESENT = /next steps/i;

function markerPath(sessionId) {
  return path.join(os.tmpdir(), `provenmap-turn-${sessionId}.json`);
}

/**
 * Atomically take the marker: only one of several parallel Stop hooks can
 * rename it. Called only after this plugin has confirmed it ships the
 * marker's script — a sibling's marker is never claimed, so the plugin that
 * owns it still finds it.
 */
function claimMarker(file) {
  const claimed = `${file}.${process.pid}`;
  try {
    fs.renameSync(file, claimed);
  } catch {
    return false;
  }
  try {
    fs.unlinkSync(claimed);
  } catch {
    /* already gone */
  }
  return true;
}

/** Same root as the guard writes: realpath-tolerant, so a symlinked cache still matches. */
function sameRoot(a, b) {
  const real = (p) => {
    try {
      return fs.realpathSync(p);
    } catch {
      return path.resolve(p);
    }
  };
  return real(a) === real(b);
}

/**
 * Whether this marker is THIS plugin's to act on: the owner's root when the
 * guard recorded one, else (older or by-name marker) whether this plugin
 * ships the script — a sibling's marker is left for the sibling.
 */
function ownsMarker(marker) {
  if (typeof marker.pluginRoot === "string" && marker.pluginRoot) {
    return sameRoot(marker.pluginRoot, path.resolve(__dirname, ".."));
  }
  return fs.existsSync(path.join(__dirname, marker.script));
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return;
  }
  if (!input || input.stop_hook_active === true) return;
  // The session id names a temp file — accept only a plain token.
  const sessionId =
    typeof input.session_id === "string" && /^[A-Za-z0-9._-]+$/.test(input.session_id)
      ? input.session_id
      : null;
  if (!sessionId) return;
  // Subagents still running (Claude Code lists them in `background_tasks`):
  // the orchestrator ended its turn to wait, not to finish — its footer
  // belongs at the join. Stand down WITHOUT claiming the marker, so a join
  // that ends footerless is still nudged.
  if (Array.isArray(input.background_tasks) && input.background_tasks.length > 0) return;

  const file = markerPath(sessionId);
  let marker;
  try {
    marker = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return;
  }
  if (!marker || typeof marker.script !== "string") return;
  if (!ownsMarker(marker)) return;
  if (!claimMarker(file)) return;
  if (FOOTER_PRESENT.test(String(input.last_assistant_message || ""))) return;

  const cli = fs.existsSync(path.join(__dirname, "pmap-status.js"))
    ? "pmap-status.js"
    : "pmap-architect.js";
  const root = path.resolve(__dirname, "..");
  const ran =
    typeof marker.args === "string" && marker.args
      ? `${marker.script} ${marker.args}`
      : marker.script;
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        `You ran a ProvenMap command this turn (${ran}) but did not close with its next-steps footer. ` +
        `Run \`node ${root}/scripts/${cli} --after <the command you ran>\` — the command body's closing line names its --after (and --facts) — ` +
        "and print its output verbatim, then stop.",
    }),
  );
}

main();
