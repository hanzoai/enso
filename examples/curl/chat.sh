#!/usr/bin/env bash
set -euo pipefail

# Check for HANZO_API_KEY
if [[ -z "${HANZO_API_KEY:-}" ]]; then
  echo "Error: HANZO_API_KEY is not set" >&2
  exit 1
fi

BASE_URL="${HANZO_BASE_URL:-https://api.hanzo.ai/v1}"

echo "=== 1. Non-streaming call with enso-auto ==="
curl -s -X POST "${BASE_URL}/chat/completions" \
  -H "Authorization: Bearer ${HANZO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "enso-auto",
    "messages": [
      {"role": "system", "content": "You are a concise decision assistant."},
      {"role": "user", "content": "What are the core components of Hanzo Enso?"}
    ],
    "temperature": 0.7
  }' | jq .

echo ""
echo "=== 2. Streaming call with enso-flash ==="
curl -N -s -X POST "${BASE_URL}/chat/completions" \
  -H "Authorization: Bearer ${HANZO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "enso-flash",
    "messages": [
      {"role": "user", "content": "List 3 advantages of pure Rust over Python for production inference."}
    ],
    "stream": true
  }'
echo ""
