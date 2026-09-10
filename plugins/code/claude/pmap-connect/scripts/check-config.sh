#!/bin/bash
# ProvenMap - Session Start Hook
# Scaffolds .provenmap/config.json (settings skeleton) on first run, then
# reports configuration status. The credential pair lives in
# .provenmap/credentials.json, written by /login (never by this hook).

set -euo pipefail

# Host-agnostic project directory: Claude Code sets CLAUDE_PROJECT_DIR, Codex sets
# CODEX_PROJECT_DIR; fall back to the current working directory otherwise.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-$PWD}}"

PMAP_DIR="$PROJECT_DIR/.provenmap"
CONFIG_FILE="$PMAP_DIR/config.json"
CREDENTIALS_FILE="$PMAP_DIR/credentials.json"
BOARDS_DIR="$PMAP_DIR/boards"
MANIFEST_FILE="$BOARDS_DIR/manifest.json"
GITIGNORE_FILE="$PROJECT_DIR/.gitignore"

output=""

# Write a settings skeleton with sane defaults. An empty boardSlug is treated
# as "not configured" by the config reader, so the skeleton never masquerades
# as a real config; credentials never live in this file.
write_skeleton() {
    mkdir -p "$PMAP_DIR"
    cat > "$CONFIG_FILE" <<'JSON'
{
  "baseUrl": "https://platform.provenmap.com/api",
  "branch": "",
  "boardSlug": "",
  "excludePaths": ["node_modules", "dist", ".git", "coverage"],
  "includeTests": false
}
JSON
}

# Keep credentials out of version control once the user fills them in.
# Only touch .gitignore inside an actual git repo.
ensure_gitignored() {
    [ -d "$PROJECT_DIR/.git" ] || return 0
    if [ -f "$GITIGNORE_FILE" ]; then
        if ! grep -qE '^\.provenmap/?$' "$GITIGNORE_FILE"; then
            printf '\n# ProvenMap local state (contains credentials)\n.provenmap/\n' >> "$GITIGNORE_FILE"
        fi
    else
        printf '# ProvenMap local state (contains credentials)\n.provenmap/\n' > "$GITIGNORE_FILE"
    fi
}

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
    # First run in this project: scaffold a skeleton the user can fill in.
    write_skeleton
    ensure_gitignored
    output="Created .provenmap/config.json. Run /login to connect in your browser, or put your ProvenMap credentials in .provenmap/credentials.json manually and run /configure to verify."
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
        output="$output Board not mirrored yet. Run /sync to pull the authored board and ground it in this repo's documents."
    fi
    if [ ! -d "$BOARDS_DIR" ]; then
        output="$output Local board state is missing — the next ProvenMap command will restore it from the server."
    fi
fi

# Every state ends on the same door: /start reads the real state and offers the next step.
echo "$output Run /start for the guided next step."
exit 0
