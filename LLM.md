# Enso — Hanzo's proprietary frontier model family (family-as-data)

Enso is served by the zen-svc engine (`hanzoai/zen`) with `ZEN_FAMILY=enso`: the SAME
binary, this family as data. This repo carries the family's data, and what SERVES is
split — see "Deploy source of truth" below before editing either file:

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
at them (`ZEN_FAMILY=enso ZEN_CATALOG=… ZEN_PROMPTS=…`).

**Nothing builds this image right now.** `.github/workflows/build.yml` was retired
here, and the replacement under `.hanzo/workflows/` was described in a commit message
but never committed. A second copy of the repo went on carrying the old workflow and
pushing the same tag from a lineage that lacked `router/`; that copy is archived, so
the last build of `ghcr.io/hanzoai/enso` remains the one from the old lane. The base
bumps below are committed but unbuilt — the tag serving today is behind this tree.
Restoring a lane is an open decision, not an oversight to paper over.

Serving: `universe/infra/k8s/enso/deployment.yaml` pins `ghcr.io/hanzoai/enso@<digest>`
(namespace `enso`, Service `:8080`, `enso-secrets`). The image is PRIVATE, so the enso
namespace pulls it with the cluster `ghcr-secret` (hanzo-dev). ai discovers via
GET $ENSO_URL/v1/models and gates access (ModelAccess waitlist; granted preview is
COMPED — bypasses the balance gates, still metered).

Deploy source of truth, and it SPLITS — the two halves have different owners.

- `prompts/` is this repo's. The deployment sets no `ZEN_PROMPTS`, so the image's own
  `ENV ZEN_PROMPTS=/etc/enso/prompts` stands and these files are what serves. Ship a
  prompt change by rebuilding this image.
- `catalog.yaml` is NOT. The deployment sets
  `ZEN_CATALOG=/etc/enso-catalog/catalog.yaml` — a ConfigMap declared in universe
  (`charts/app/values/enso/enso.yaml`, `configMaps:`) and applied by Hanzo CD — so the
  copy this image bakes at `/etc/enso/catalog.yaml` is never read. Ship a catalog change
  in universe.

The env override is invisible from here: editing this `catalog.yaml`, rebuilding and
rolling changes nothing that serves, and the file keeps reading like the live one. The
two have already diverged on provider, upstreams and retail — universe is the one that
answers a request.

    kubectl -n enso get deploy enso -o jsonpath='{.spec.template.spec.containers[0].env[*]}'
    kubectl -n enso get cm enso-catalog -o jsonpath='{.data.catalog\.yaml}'

This paragraph claimed the opposite, and the drift is what that cost: `catalog.yaml` here
was edited into a different design — a `funding` axis separating grant-funded from prepaid
providers, plus a Moonshot arm — that never reached a pod, while the catalog that actually
serves moved on independently in universe. Two files diverging, one of them inert, neither
aware of the other. When they disagree, the ConfigMap answers the request.

zen-svc's embedded `catalog-enso.yaml` + `prompts/enso*.md` are the FALLBACK default
underneath both (what a bare zen image serves with `ZEN_FAMILY=enso` and no path
overrides). One mechanism, N families — see zen-svc CLAUDE.md.

