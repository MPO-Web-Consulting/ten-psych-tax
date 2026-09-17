#!/usr/bin/env bash
# Generates .env for deployment. No node/npm dependency by design -- this
# runs before `npm install` in a fresh deploy, so it only uses coreutils.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-"$ROOT_DIR/.env"}"
FORCE="${FORCE:-0}"

for arg in "$@"; do
    if [ "$arg" = "--force" ]; then
        FORCE=1
    fi
done

if [ -e "$ENV_FILE" ] && [ "$FORCE" != "1" ]; then
    echo "Refusing to overwrite existing $ENV_FILE (pass --force to regenerate, which invalidates existing sessions and the current password)." >&2
    exit 1
fi

random_string() {
    # `|| true`: head closing early after -c N sends tr a SIGPIPE, which
    # pipefail would otherwise treat as a pipeline failure.
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c "$1" || true
}

SESSION_SECRET="${SESSION_SECRET:-$(random_string 64)}"
APP_PASSWORD="${APP_PASSWORD:-$(random_string 20)}"
PORT="${PORT:-3000}"
NODE_ENV="${NODE_ENV:-production}"

umask 077
cat > "$ENV_FILE" <<EOF
NODE_ENV=$NODE_ENV
PORT=$PORT
SESSION_SECRET=$SESSION_SECRET
APP_PASSWORD=$APP_PASSWORD
EOF
chmod 600 "$ENV_FILE"

echo "Wrote $ENV_FILE"
echo "APP_PASSWORD=$APP_PASSWORD"
echo "(save this now -- it is the login password and is not printed again)"
