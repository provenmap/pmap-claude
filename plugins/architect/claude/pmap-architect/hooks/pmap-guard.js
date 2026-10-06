// ProvenMap guard: a Claude Code mod (hooks.json "modules"), shipped as authored.
//
// It enforces two rules the shipped content only states in prose, at the tool call:
//   1. Secrets never enter the chat. No Read, Grep or shell command touches the
//      ProvenMap credential files or the PMAP_* secret variables, and any ProvenMap
//      secret in what a tool returns (a credential pasted into config.json, an MCP
//      entry in a host config) reaches Claude masked to its prefix.
//   2. Script-owned state is written only by the scripts. No Edit, Write or shell
//      write touches the element and evidence stores, the board manifest or the
//      tree plan, whose hashes and records the scripts own.
//
// Claude Code only: Codex and Cursor have no mods, so there the prose is the rule.
// A user-scope plugin's mod runs in every session, ProvenMap repo or not, so each
// rule needs a `.provenmap/` path or a PMAP_ name before it fires. Every deny tells
// Claude what to run instead. A rule that throws lets the call through (fails open),
// like the settings-hook scripts; the output is masked either way (see `recover`).

const SECRET_FILE =
  /(^|\/)\.provenmap\/(credentials\.json|login-state\.json|login-state(\/|$)|architect-mcp\.json)/;
const SECRET_ENV = /\bPMAP_(API_SECRET|BINDING_TOKEN)\b/;
// Every ProvenMap secret names its family up front: pmap_<kind>_<env>_<body> (cp, mcp,
// sess, share, app, …), or the older ck_[<kind>_]live_<body>. This is the platform's
// own redaction pattern (its credential registry): loose enough for a truncated
// secret, while a bare prefix (`pmap_cp_live_…`) or a short fixture stays readable.
const SECRET_VALUE = /\b((?:pmap|ck)_(?:[a-z]+_)?(?:live|test)_)[0-9A-Za-z_-]{16,}/g;
const SCRIPT_OWNED =
  /(^|\/)\.provenmap\/(boards\/manifest\.json|boards\/stores\/[^/]+\.(store|evidence)\.json|tree-plan\.json|plan-run\.json)$/;

// A Grep or shell read rooted at these directories (or a glob in them) reads the
// credential files inside them.
const SECRET_DIR = /(^|\/)\.provenmap(\/login-state)?\/?(\*[^/]*)?$/;

// Programs that can name a credential path without printing the file.
const SAFE_PROGRAM = /^(ls|stat|test|\[|chmod|find|mkdir|cd|touch|echo|printf|true|false)$/;
const SECRET_NAME = /credentials\.json|login-state|architect-mcp\.json/;

function normalise(p) {
  return typeof p === "string" ? p.replace(/\\/g, "/") : "";
}

function unquote(word) {
  return normalise(word.replace(/^["']|["']$/g, ""));
}

function shellSegments(command) {
  return command.split(/&&|\|\||[;|\n]/);
}

function secretDeny(target) {
  const architect = /architect-mcp\.json/.test(target);
  return [
    `ProvenMap guard: ${target} holds a ProvenMap credential, and credentials never enter the chat.`,
    architect
      ? "Run /pmap-architect:status to check the token, or /pmap-architect:login to replace it."
      : "Run /pmap-code:configure to check the credentials (its script reports each field's shape and the masked secret), or /pmap-code:login to replace them. The user edits the file by hand, never through the chat.",
  ].join(" ");
}

function scriptOwnedDeny(target) {
  const store = /\.(store|evidence)\.json$/.test(target);
  return [
    `ProvenMap guard: ${target} is written only by the ProvenMap scripts, and a hand edit breaks the record they verify.`,
    store
      ? "Run /pmap-code:sync to update the element store, or /pmap-code:ground for the evidence store."
      : "Change the board files instead and let the scripts rewrite it; run /pmap-code:analyze to rebuild the plan (--clean starts over).",
  ].join(" ");
}

function mentionsSecret(text) {
  return (
    (/\.provenmap/.test(normalise(text)) && SECRET_NAME.test(text)) ||
    text.split(/[\s;&|<>()`]+/).some((w) => SECRET_DIR.test(unquote(w)))
  );
}

// A shell command that could print a credential: a substitution around one, or a
// segment naming one whose program reads files (or reads it through `<`). Once the
// command names .provenmap, a bare file name counts too (`cd .provenmap && cat …`).
function shellReadsSecret(command) {
  if (!mentionsSecret(command)) return false;
  if (/`|\$\(/.test(command)) return true;
  return shellSegments(command).some((segment) => {
    if (!SECRET_NAME.test(segment) && !mentionsSecret(segment)) return false;
    const [program, ...args] = segment.trim().split(/\s+/);
    if (program === "git") return args[0] !== "check-ignore";
    return !SAFE_PROGRAM.test(program) || segment.includes("<");
  });
}

// A shell write into a script-owned file: a redirect target, or an argument of a
// program that changes the files it names (cp only writes its last one).
function shellWriteTarget(command) {
  for (const m of command.matchAll(/>>?\s*["']?([^\s;&|"'<>]+)/g)) {
    if (SCRIPT_OWNED.test(normalise(m[1]))) return normalise(m[1]);
  }
  for (const segment of shellSegments(command)) {
    const [program, ...args] = segment.trim().split(/\s+/).map(unquote);
    const inPlace = /^(sed|perl)$/.test(program) && args.some((a) => /^-[a-zA-Z]*i/.test(a));
    const targets =
      program === "cp" ? args.slice(-1) : ["rm", "mv", "tee", "truncate"].includes(program) || inPlace ? args : [];
    const hit = targets.find((w) => SCRIPT_OWNED.test(w));
    if (hit) return hit;
  }
  return null;
}

/**
 * The deny text for one tool call, or null to let it through. Exported for the
 * plugin repo's tests; the engine only calls `register`.
 */
export function guard(tool, input) {
  if (!input || typeof input !== "object") return null;
  if (tool === "Read") {
    const p = normalise(input.file_path);
    return SECRET_FILE.test(p) ? secretDeny(p) : null;
  }
  if (tool === "Grep") {
    const p = normalise(input.path);
    return SECRET_FILE.test(p) || SECRET_DIR.test(p) ? secretDeny(p) : null;
  }
  if (tool === "Edit" || tool === "Write" || tool === "NotebookEdit") {
    const p = normalise(input.file_path ?? input.notebook_path);
    if (SECRET_FILE.test(p)) return secretDeny(p);
    return SCRIPT_OWNED.test(p) ? scriptOwnedDeny(p) : null;
  }
  if (tool === "Bash" || tool === "PowerShell") {
    const command = typeof input.command === "string" ? input.command : "";
    if (SECRET_ENV.test(command)) return secretDeny(command.match(SECRET_ENV)[0]);
    if (shellReadsSecret(command)) return secretDeny((command.match(SECRET_NAME) ?? [".provenmap/"])[0]);
    const written = shellWriteTarget(command);
    return written ? scriptOwnedDeny(written) : null;
  }
  return null;
}

function redactText(text) {
  return text.replace(SECRET_VALUE, "$1****");
}

function redactDeep(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  }
  return value;
}

/**
 * What a tool call resolved to, with every ProvenMap secret masked, or the same
 * object when it holds none (so core keeps its own rendering). A rewritten result
 * drops `ref` and `text`, which name the unmasked output, and core re-renders it.
 */
export function redact(outcome) {
  if (!outcome || outcome.deny !== undefined) return outcome;
  const seen = typeof outcome.text === "string" ? outcome.text : JSON.stringify(outcome.result) ?? "";
  if (!seen.match(SECRET_VALUE)) return outcome;
  if (outcome.isError) return { deny: redactText(seen) };
  return {
    result: redactDeep(outcome.result),
    ...(outcome.context ? { context: outcome.context.map(redactText) } : {}),
  };
}

/**
 * When the hook fails, the call goes through (a broken rule must not block every
 * tool in every session), but its output is still masked, and output that cannot
 * be masked is masked as text or withheld. `next` here replays a call already made.
 */
export async function recover($, e, next) {
  const outcome = await next(e);
  try {
    return redact(outcome);
  } catch {
    return typeof outcome?.text === "string"
      ? { deny: redactText(outcome.text) }
      : { deny: "ProvenMap guard could not check this output for ProvenMap secrets, so it was withheld." };
  }
}

/** @type {import('claude-code').Register} */
export const register = (on) => {
  on("tool.call", async ($, e, next) => {
    const deny = guard(e.tool, e);
    return deny ? { deny } : redact(await next(e));
  }).catch(recover);
};
