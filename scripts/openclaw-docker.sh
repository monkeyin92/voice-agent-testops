#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLAW_REPO_URL="${OPENCLAW_REPO_URL:-https://github.com/openclaw/openclaw.git}"
OPENCLAW_DIR="${OPENCLAW_DIR:-$ROOT_DIR/.vendor/openclaw}"
OPENCLAW_DOCKER_PROJECT="${OPENCLAW_DOCKER_PROJECT:-voiceai-openclaw}"
OPENCLAW_DOCKER_GATEWAY_PORT="${OPENCLAW_DOCKER_GATEWAY_PORT:-18889}"
OPENCLAW_DOCKER_BRIDGE_PORT="${OPENCLAW_DOCKER_BRIDGE_PORT:-18890}"
OPENCLAW_DOCKER_HOME="${OPENCLAW_DOCKER_HOME:-$ROOT_DIR/.openclaw-docker}"
OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-$OPENCLAW_DOCKER_HOME/config}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$OPENCLAW_DOCKER_HOME/workspace}"
OPENCLAW_ENV_FILE="$OPENCLAW_DOCKER_HOME/openclaw.env"
OPENCLAW_TOKEN_FILE="$OPENCLAW_DOCKER_HOME/gateway-token"

clone_openclaw() {
  if [[ -d "$OPENCLAW_DIR/.git" ]]; then
    git -C "$OPENCLAW_DIR" fetch --depth 1 origin
    git -C "$OPENCLAW_DIR" checkout --detach origin/main
    return
  fi

  mkdir -p "$(dirname "$OPENCLAW_DIR")"
  git clone --depth 1 "$OPENCLAW_REPO_URL" "$OPENCLAW_DIR"
}

compose() {
  docker compose \
    --env-file "$OPENCLAW_ENV_FILE" \
    -p "$OPENCLAW_DOCKER_PROJECT" \
    -f "$OPENCLAW_DIR/docker-compose.yml" \
    "$@"
}

check_port() {
  local port="$1"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Set OPENCLAW_DOCKER_GATEWAY_PORT or OPENCLAW_DOCKER_BRIDGE_PORT to avoid conflicts." >&2
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >&2
    exit 1
  fi
}

write_env() {
  mkdir -p "$OPENCLAW_DOCKER_HOME" "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE_DIR"
  ensure_token
  write_config
  cat >"$OPENCLAW_ENV_FILE" <<EOF
OPENCLAW_GATEWAY_PORT=$OPENCLAW_DOCKER_GATEWAY_PORT
OPENCLAW_BRIDGE_PORT=$OPENCLAW_DOCKER_BRIDGE_PORT
OPENCLAW_GATEWAY_TOKEN=$(cat "$OPENCLAW_TOKEN_FILE")
OPENCLAW_CONFIG_DIR=$OPENCLAW_CONFIG_DIR
OPENCLAW_WORKSPACE_DIR=$OPENCLAW_WORKSPACE_DIR
OPENCLAW_DISABLE_BONJOUR=1
EOF
  if [[ -n "${OPENAI_API_KEY:-}" ]]; then
    printf "OPENAI_API_KEY=%s\n" "$OPENAI_API_KEY" >>"$OPENCLAW_ENV_FILE"
  fi
}

write_config() {
  local config_file="$OPENCLAW_CONFIG_DIR/openclaw.json"
  if [[ -s "$config_file" ]]; then
    ensure_responses_endpoint "$config_file"
    return
  fi

  cat >"$config_file" <<EOF
{
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "$(cat "$OPENCLAW_TOKEN_FILE")"
    },
    "http": {
      "endpoints": {
        "responses": {
          "enabled": true
        }
      }
    },
    "controlUi": {
      "enabled": true,
      "basePath": "/openclaw"
    }
  }
}
EOF
  chmod 600 "$config_file"
}

ensure_responses_endpoint() {
  local config_file="$1"
  node - "$config_file" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const original = fs.readFileSync(file, "utf8");
const config = JSON.parse(fs.readFileSync(file, "utf8"));
config.gateway ??= {};
config.gateway.http ??= {};
config.gateway.http.endpoints ??= {};
config.gateway.http.endpoints.responses ??= {};
config.gateway.http.endpoints.responses.enabled = true;
const next = `${JSON.stringify(config, null, 2)}\n`;
if (next !== original) {
  fs.writeFileSync(file, next);
}
NODE
  chmod 600 "$config_file"
}

ensure_token() {
  mkdir -p "$OPENCLAW_DOCKER_HOME"
  if [[ -s "$OPENCLAW_TOKEN_FILE" ]]; then
    return
  fi

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32 >"$OPENCLAW_TOKEN_FILE"
  else
    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))" >"$OPENCLAW_TOKEN_FILE"
  fi
  chmod 600 "$OPENCLAW_TOKEN_FILE"
}

main() {
  local cmd="${1:-help}"

  case "$cmd" in
    clone)
      clone_openclaw
      ;;
    up)
      clone_openclaw
      write_env
      if ! compose ps --status running --services 2>/dev/null | grep -qx "openclaw-gateway"; then
        check_port "$OPENCLAW_DOCKER_GATEWAY_PORT"
        check_port "$OPENCLAW_DOCKER_BRIDGE_PORT"
      fi
      compose up -d --build --force-recreate openclaw-gateway
      ;;
    down)
      compose down
      ;;
    status)
      write_env
      compose ps
      ;;
    logs)
      write_env
      compose logs -f openclaw-gateway
      ;;
    health)
      curl -fsS "http://127.0.0.1:$OPENCLAW_DOCKER_GATEWAY_PORT/healthz"
      printf "\n"
      ;;
    token)
      ensure_token
      cat "$OPENCLAW_TOKEN_FILE"
      printf "\n"
      ;;
    responses-smoke)
      ensure_token
      curl --fail-with-body -sS "http://127.0.0.1:$OPENCLAW_DOCKER_GATEWAY_PORT/v1/responses" \
        -H "Authorization: Bearer $(cat "$OPENCLAW_TOKEN_FILE")" \
        -H "x-openclaw-agent-id: main" \
        -H "Content-Type: application/json" \
        -d '{"model":"openclaw","input":"Say hello in Chinese."}'
      printf "\n"
      ;;
    *)
      cat <<EOF
Usage: scripts/openclaw-docker.sh <command>

Commands:
  clone             Clone OpenClaw into .vendor/openclaw
  up                Start isolated OpenClaw Gateway on 127.0.0.1:${OPENCLAW_DOCKER_GATEWAY_PORT}
  down              Stop the OpenClaw Docker stack
  status            Show Docker Compose status
  logs              Follow OpenClaw Gateway logs
  health            Check /healthz
  token             Print the generated gateway token
  responses-smoke   POST a minimal request to /v1/responses

Environment overrides:
  OPENCLAW_DIR
  OPENCLAW_DOCKER_PROJECT
  OPENCLAW_DOCKER_GATEWAY_PORT
  OPENCLAW_DOCKER_BRIDGE_PORT
  OPENCLAW_CONFIG_DIR
  OPENCLAW_WORKSPACE_DIR
EOF
      ;;
  esac
}

main "$@"
