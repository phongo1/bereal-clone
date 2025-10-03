#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

cd "$ROOT_DIR"

install_dependencies() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required but not found in PATH" >&2
    exit 1
  fi

  if [ -d "node_modules" ]; then
    echo "Dependencies already installed. Skipping npm install."
  else
    echo "Installing npm dependencies..."
    npm install
  fi
}

install_dependencies

echo "Setting up database and directories..."
node setup.js

pids=()

cleanup() {
  echo "\nStopping services..."
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait
}

trap cleanup SIGINT SIGTERM

echo "Starting backend (Express)..."
node server.js &
pids+=("$!")

echo "Starting Expo web client..."
npx expo start --web &
pids+=("$!")

wait
