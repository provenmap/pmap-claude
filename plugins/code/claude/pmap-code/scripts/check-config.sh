#!/bin/bash
# ProvenMap - Session Start Hook
# Reports configuration status. It never creates anything: `.provenmap/` is
# written by /login (or by hand for /configure) once a board is bound, so a
# repo that has not connected carries no ProvenMap files at all. The
# credential pair lives in .provenmap/credentials.json, written by /login.

set -euo pipefail

# Host-agnostic project directory: Claude Code sets CLAUDE_PROJECT_DIR, Codex sets
# CODEX_PROJECT_DIR; fall back to the current working directory otherwise.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-$PWD}}"

PMAP_DIR="$PROJECT_DIR/.provenmap"
CONFIG_FILE="$PMAP_DIR/config.json"
CREDENTIALS_FILE="$PMAP_DIR/credentials.json"
BOARDS_DIR="$PMAP_DIR/boards"
MANIFEST_FILE="$BOARDS_DIR/manifest.json"

output=""

# True only when credentials.json holds both fields, non-empty. config.json is
# never consulted: the config reader ignores credential fields there.
has_credentials() {
    [ -f "$CREDENTIALS_FILE" ] || return 1
    local token secret
    token=$(jq -r '.bindingToken // ""' "$CREDENTIALS_FILE" 2>/dev/null || echo "")
    secret=$(jq -r '.apiSecret // ""' "$CREDENTIALS_FILE" 2>/dev/null || echo "")
    [ -n "$token" ] && [ -n "$secret" ]
}

# True when config.json still carries a non-empty credential field from before
# the credential moved — the reader ignores it, so the user must be told why
# the install reads as not connected.
has_legacy_credential_fields() {
    [ -f "$CONFIG_FILE" ] || return 1
    local token secret
    token=$(jq -r '.bindingToken // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
    secret=$(jq -r '.apiSecret // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
    [ -n "$token" ] || [ -n "$secret" ]
}

if [ ! -f "$CONFIG_FILE" ]; then
    # Not connected yet: nothing is written here — /login creates .provenmap/ when it binds a board.
    output="ProvenMap is not connected in this project (no .provenmap/config.json). Run /login to connect in your browser and bind a board, or write .provenmap/credentials.json and config.json by hand and run /configure to verify."
elif ! has_credentials; then
    output="ProvenMap config.json found but credentials are empty. Run /login to connect in your browser, or put bindingToken and apiSecret in .provenmap/credentials.json and run /configure to verify."
    if has_legacy_credential_fields; then
        output="$output config.json still has bindingToken/apiSecret; credentials now live in .provenmap/credentials.json. Run /login, then remove those fields."
    fi
else
    output="ProvenMap configuration found."

    # Check boards directory and manifest
    if [ -f "$MANIFEST_FILE" ]; then
        board_count=$(jq -r '.boards | length // 0' "$MANIFEST_FILE" 2>/dev/null || echo "0")
        output="$output $board_count board(s) tracked locally."
    else
        output="$output No analysis found. Run /analyze to scan your codebase."
    fi
    if [ ! -d "$BOARDS_DIR" ]; then
        output="$output Local board state is missing — the next ProvenMap command will restore it from the server."
    fi
fi

# Every state ends on the same door: /start reads the real state and offers the next step.
echo "$output Run /start for the guided next step."
exit 0
