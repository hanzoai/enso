# Enso — Hanzo's proprietary frontier model family (family-as-data)

Enso is served by the zen-svc engine (`hanzoai/zen`) with `ZEN_FAMILY=enso`: the SAME
binary, this family as data. This repo is the family's source of truth:

- `catalog.yaml` — providers + the three SKUs. `enso` = ladder (opus-class 200K rung →
  deepseek-v4-pro 1M overflow). `enso-flash` = cheap/fast single-arm ladder (2→6 $/MTok,
  262K rung → 1M overflow). `enso-ultra` = ADAPTIVE fan-out — it PROBES on one
  task-appropriate arm (`escalate.rank[task][0]`) and escalates to the top-`panel` arms
  + verify-then-select ONLY when the probe is low-confidence, so a confident request
  bills ONE arm, not six. All arms/rungs via the DO gateway.
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

Deploy source of truth: **NOT this repo — editing `catalog.yaml` here deploys nothing.**
What serves is a ConfigMap, `enso-catalog` in namespace `enso`, whose body is inline in
universe at `charts/app/values/enso/enso.yaml`. The Deployment mounts it at
`/etc/enso-catalog/` and sets `ZEN_CATALOG=/etc/enso-catalog/catalog.yaml`, OVERRIDING the
`/etc/enso/catalog.yaml` the Dockerfile bakes — so this repo's copy is still built into
the image and is never the one read. Change the catalog in universe. Measured, not
inferred:

    kubectl -n enso get deploy enso -o jsonpath='{.spec.template.spec.containers[0].env[*]}'
    kubectl -n enso get cm enso-catalog -o jsonpath='{.data.catalog\.yaml}'

This paragraph claimed the opposite, and the drift is what that cost: `catalog.yaml` here
was edited into a different design — a `funding` axis separating grant-funded from prepaid
providers, plus a Moonshot arm — that never reached a pod, while the catalog that actually
serves moved on independently in universe. Two files diverging, one of them inert, neither
aware of the other. When they disagree, the ConfigMap answers the request.

zen-svc's embedded `catalog-enso.yaml` + `prompts/enso*.md` remain the FALLBACK default
(what a bare zen image serves with `ZEN_FAMILY=enso` and no path overrides). One mechanism,
N families — see zen-svc CLAUDE.md.

Bench + paper: `hanzoai/enso-bench` (measured GPQA: enso 87.9, enso-ultra 89.9),
`papers/enso` (LaTeX), blog PR "Introducing Enso".

Naming: the Zen-Browser fork formerly at hanzoai/enso now lives at hanzoai/enso-browser.
