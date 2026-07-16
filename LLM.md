# Enso — Hanzo's proprietary frontier model family (family-as-data)

Enso is served by the zen-svc engine (`hanzoai/zen`) with `ZEN_FAMILY=enso`: the SAME
binary, this family as data. This repo is the family's source of truth:

- `catalog.yaml` — providers + the two SKUs. `enso` = ladder (opus-class 200K rung →
  deepseek-v4-pro 1M overflow). `enso-ultra` = fan-out (same request to every arm
  concurrently → one synthesizer folds the best answer). All arms via the DO gateway.
- `prompts/` — identity (never reveals upstreams; a closed family).

Build: `Dockerfile` is a COPY-only overlay on the prod `ghcr.io/hanzoai/zen` image
(pinned by digest — byte-identical serving binary), baking this repo's `catalog.yaml`
→ `/etc/enso/catalog.yaml` + `prompts/` → `/etc/enso/prompts/` and pointing the binary
at them (`ZEN_FAMILY=enso ZEN_CATALOG=… ZEN_PROMPTS=…`). CI (`.github/workflows/build.yml`,
runner `hanzo-build-linux-amd64`) pushes `ghcr.io/hanzoai/enso` on `main` +
`workflow_dispatch` — no Go build, no GH_PAT (the base is public; push uses GITHUB_TOKEN).

Serving: `universe/infra/k8s/enso/deployment.yaml` pins `ghcr.io/hanzoai/enso@<digest>`
(namespace `enso`, Service `:8080`, `enso-secrets`). The image is PRIVATE, so the enso
namespace pulls it with the cluster `ghcr-secret` (hanzo-dev). ai discovers via
GET $ENSO_URL/v1/models and gates access (ModelAccess waitlist; granted preview is
COMPED — bypasses the balance gates, still metered).

Deploy source of truth: THIS repo is now the deploy source — the image loads this
`catalog.yaml` + `prompts/` at runtime (`ZEN_CATALOG`/`ZEN_PROMPTS`). zen-svc's embedded
`catalog-enso.yaml` + `prompts/enso*.md` are only the FALLBACK default (what a bare zen
image serves with `ZEN_FAMILY=enso` and no path overrides); keep them in sync as the
fallback, but ship changes by rebuilding this image. One mechanism, N families — see
zen-svc CLAUDE.md.

Bench + paper: `hanzoai/enso-bench` (measured GPQA: enso 87.9, enso-ultra 89.9),
`papers/enso` (LaTeX), blog PR "Introducing Enso".

Naming: the Zen-Browser fork formerly at hanzoai/enso now lives at hanzoai/enso-browser.
