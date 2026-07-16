# Enso — Hanzo's proprietary frontier model family (family-as-data)

Enso is served by the zen-svc engine (`hanzoai/zen`) with `ZEN_FAMILY=enso`: the SAME
binary, this family as data. This repo is the family's source of truth:

- `catalog.yaml` — providers + the two SKUs. `enso` = ladder (opus-class 200K rung →
  deepseek-v4-pro 1M overflow). `enso-ultra` = fan-out (same request to every arm
  concurrently → one synthesizer folds the best answer). All arms via the DO gateway.
- `prompts/` — identity (never reveals upstreams; a closed family).

Serving: `universe/infra/k8s/enso/` (zen image + ZEN_FAMILY=enso). ai discovers via
GET $ENSO_URL/v1/models and gates access (ModelAccess waitlist; granted preview is
COMPED — bypasses the balance gates, still metered).

Sync rule: edits here land by updating zen-svc's embedded `catalog-enso.yaml` (or via
the ZEN_CATALOG path knob) — one mechanism, N families. See zen-svc CLAUDE.md.

Bench + paper: `hanzoai/enso-bench` (measured GPQA: enso 87.9, enso-ultra 89.9),
`papers/enso` (LaTeX), blog PR "Introducing Enso".

Naming: the Zen-Browser fork formerly at hanzoai/enso now lives at hanzoai/enso-browser.
