# Enso — Hanzo's proprietary frontier model family, served by the SAME binary as
# zen (hanzoai/zen). This image is a COPY-only overlay on the prod zen image: no
# Go build, no source — it bakes THIS repo's family-as-data (catalog + identity
# prompts) into the base and points the binary at it by env.
#
# The base is pinned by DIGEST to the live prod zen image (the exact bytes running
# in-cluster), so the serving binary is byte-identical to zen's release; only the
# family data differs. Bump the digest when zen ships a new binary you want under
# Enso — never a floating tag.
#
# The base is gcr.io/distroless/static-debian12:nonroot with ENTRYPOINT ["/zen"];
# both are inherited unchanged (distroless has no shell — do not add RUN steps).
# COPYed files land root:root 0644 / dirs 0755 — world-readable, so the nonroot
# (65532) runtime user reads them.
FROM ghcr.io/hanzoai/zen@sha256:588ccc24f0c19c8a8b1f4a4e21e5e4e292276bc22852a979a6de64fb4148a9ba

# The Enso family as data: this repo is the deploy source of truth (zen-svc's
# embedded catalog-enso.yaml + prompts/enso*.md are only the fallback default).
COPY catalog.yaml /etc/enso/catalog.yaml
COPY prompts/ /etc/enso/prompts/

# ZEN_FAMILY selects the shared Enso identity context (ensoContext, never reveals
# upstreams); ZEN_CATALOG loads THIS catalog from disk over the embedded bytes;
# ZEN_PROMPTS overlays THIS repo's per-SKU identity prompts. Exact env names read
# by the binary: family.go (ZEN_FAMILY, ZEN_CATALOG) + identity.go (ZEN_PROMPTS).
ENV ZEN_FAMILY=enso \
    ZEN_CATALOG=/etc/enso/catalog.yaml \
    ZEN_PROMPTS=/etc/enso/prompts
