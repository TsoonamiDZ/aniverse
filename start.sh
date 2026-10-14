#!/bin/bash
set -e
# Persistent storage path (mount a volume here on Render/Fly/Railway).
# On first run the volume is empty → seed it from the bundled DB file, so the site
# has data immediately AND writes (sync tool) persist across redeploys.
PERSIST_DIR="${PERSIST_DIR:-/data}"
mkdir -p "$PERSIST_DIR"
PERSIST_DB="$PERSIST_DIR/custom.db"

if [ ! -f "$PERSIST_DB" ]; then
  echo "[start] seeding persistent DB at $PERSIST_DB from bundled file..."
  for seed in "/app/db/custom.db" "./db/custom.db" ".next/standalone/db/custom.db"; do
    if [ -f "$seed" ]; then
      cp "$seed" "$PERSIST_DB"
      echo "[start] seeded from $seed"
      break
    fi
  done
fi

export DATABASE_URL="file:$PERSIST_DB"
export PORT="${PORT:-3000}"
echo "[start] DATABASE_URL=$DATABASE_URL  PORT=$PORT"

# Next.js standalone server (runs on Node or Bun).
exec node server.js
