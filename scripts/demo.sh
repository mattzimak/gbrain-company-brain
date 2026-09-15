#!/usr/bin/env bash
# demo.sh - load the fictional sample brain into a throwaway gbrain twice:
# once on the default pack, once with company-brain, and show the difference.
# Needs bun and gbrain on PATH. Touches nothing outside a temp GBRAIN_HOME.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAIN="$ROOT/fixtures/sample-brain"
say() { printf '\n\033[1m$ %s\033[0m\n' "$*"; }

say "bun src/cli.ts lint fixtures/sample-brain"
bun "$ROOT/src/cli.ts" lint "$BRAIN"

run_brain() {
  local home="$1"
  export GBRAIN_HOME="$home"
  gbrain init --pglite >/dev/null 2>&1
  if [ "${2:-}" = "with-pack" ]; then
    mkdir -p "$home/.gbrain/schema-packs/company-brain"
    cp "$ROOT/schema/company-brain.yaml" "$home/.gbrain/schema-packs/company-brain/pack.yaml"
    gbrain schema use company-brain >/dev/null 2>&1
  fi
  gbrain import "$BRAIN" --no-embed >/dev/null 2>&1
  gbrain extract links --source db --include-frontmatter >/dev/null 2>&1
}

edges() {
  gbrain graph "$1" --depth 1 2>/dev/null | jq -r --arg s "$1" \
    '.[] | select(.slug == $s) | .links[] | "  \(.link_type) -> \(.to_slug)"' | sort -u
}

DEFAULT_HOME="$(mktemp -d)"; PACK_HOME="$(mktemp -d)"
trap 'rm -rf "$DEFAULT_HOME" "$PACK_HOME"' EXIT

echo; echo "=== 1. Default gbrain (gbrain-base-v2) ==="
run_brain "$DEFAULT_HOME"
say "gbrain jobs submit unify-types --params '{\"target_pack\":\"gbrain-base-v2\",\"apply\":false}' --follow"
gbrain jobs submit unify-types --allow-protected --follow \
  --params '{"target_pack":"gbrain-base-v2","apply":false}' 2>/dev/null \
  | sed -n 's/^Result: //p' \
  | jq -r '"  would retype \(.per_phase.retype_catch_all.would_apply) pages to note and \(.per_phase.retype_explicit.would_apply) by explicit rule, of \(.stats_before.total_pages)"'
say "gbrain graph decisions/2026-08-20-focus-3pl --depth 1"
edges decisions/2026-08-20-focus-3pl

echo; echo "=== 2. With the company-brain pack ==="
run_brain "$PACK_HOME" with-pack
say "gbrain schema active"
gbrain schema active 2>/dev/null | head -3
say "gbrain graph decisions/2026-08-20-focus-3pl --depth 1"
edges decisions/2026-08-20-focus-3pl
say "gbrain graph customers/acme-logistics --depth 1"
edges customers/acme-logistics
say "gbrain graph competitors/orbit-picking --depth 1"
edges competitors/orbit-picking
