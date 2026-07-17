# Enso — the learned router for LLM hosting

**Enso picks the best model for every request, and gets better as you use it.**
It is the routing layer that powers [Hanzo Cloud](https://hanzo.ai): every
`model=auto` request is classified, priced, and sent to the model that will serve
it best — across any provider you enable and your own hosted models. Routing costs
**microseconds on a CPU**. The router **learns from feedback in your app** and an
**LLM-as-judge quality signal**, so your routing improves without you touching a
dial.

This repo is the source of truth for the **Enso model family** (the managed
frontier SKUs below). The **router** that selects among them lives in
[`hanzoai/engine`](https://github.com/hanzoai/engine) (`engine/enso`,
`engine/hanzo-router`) and ships inside every Hanzo gateway.

---

## Why this is different

Frontier models trade the lead benchmark-to-benchmark — the best coder is not the
best reasoner is not the cheapest capable chat model. Picking one model for
everything leaves quality *and* money on the table. Enso makes the choice
per-request, and makes **cost a first-class, transparent axis**: it optimizes
`quality − λ·cost − μ·latency` over your whole pool.

Three properties make it a real step change, not a wrapper:

1. **Routing is free.** The decision is keyword-classify + a tiny learned matrix
   multiply — **~300 ns (heuristic) to ~12 µs (learned), CPU-only**, ~6 orders of
   magnitude below the model call it precedes. **You never need a GPU to route** —
   only the model it picks needs one.
2. **It tiers, heuristic → learned.** Cold-start uses a transparent rule router.
   Once you have eval data, a learned policy (`xᵀWp`, closed-form ridge fit + online
   LinUCB) takes over per-request — and **falls back to the rules whenever it is
   unsure.** No cold-start cliff, no black box.
3. **It learns from your traffic.** In-app feedback and an automatic LLM-judge
   quality score become rewards; the reward ledger is **content-free** (features +
   score, never your prompt text); your policy `W` updates online. Your router is
   *yours* — trained on your workloads, your enabled providers, your models.

---

## Two ways to use Enso

### 1. Enso Router — route across *your* models (metered, 1%)

Point your app at one endpoint, enable the providers and internal models you want,
and route `model=auto`. Enso classifies each request and picks the best-value
capable model; your feedback + the LLM-judge tune it continuously.

**Price: 1% of the LLM spend it routes.** That is the whole runtime fee. It is
bounded above by the value it creates (routing away from over-provisioned models
typically saves *far* more than 1% — see the benchmark below) and above what it
costs us to run (microsecond CPU decisions + a sampled judge call). **We win when
you save** — the incentive is aligned by construction. The economics are derived in
full in the [paper](https://github.com/hanzoai/papers/tree/main/enso).

### 2. Enso family — managed frontier intelligence (fixed $/MTok)

Don't want to manage a pool? Call the Enso SKUs directly. Each is a ladder:
opus-class quality by default, automatic overflow to a 1M-context rung, one meter,
one bill.

| SKU | Headline retail ($/MTok in → out) | What it is |
|---|---|---|
| **`enso`** | 20 → 60 | Opus-class default (200K), DeepSeek 1M overflow |
| **`enso-flash`** | 2 → 6 | Cheap, fast, single-arm ladder for high-volume work |
| **`enso-ultra`** | 40 → 120 | **Adaptive fan-out**: probes one arm, escalates to a top-3 panel + verify-then-select *only* when the probe is low-confidence — a confident request bills one arm, not six |

Every rung bills strictly above its upstream cost; a request bills the rung that
actually served it. Identity is a closed family — the SKUs never reveal upstreams.

---

## The proof (measured, not marketed)

We replicate Sakana's Fugu methodology in [`enso-bench`](https://github.com/hanzoai/enso-bench):
every number is executed against live model APIs, nothing is copied from a provider
card. Headline measured results:

- **LiveCodeBench:** `enso` **91.4%** — matching the best single arm (GPT-5.5) at
  **~1/7.5 the cost of routing everything to Opus**. That is the value story: best-arm
  quality at best-arm cost, because the router picked correctly.
- **GPQA-Diamond:** `enso` **87.9%**, `enso-ultra` **89.9%** — within noise of the
  best frontier arm, at a transparent per-request cost.

The full suite (GPQA, LiveCodeBench, HLE, plus the agentic SWE-Bench Pro trials)
and the cost-per-1,000-tasks column are in the paper. The router itself is the
production path — the same `model=auto` that serves Hanzo Cloud produced these
rows, metered on one plane.

---

## How it fits together

```
your app ──model=auto──▶ Hanzo gateway
                          │
                          ├─ enso router  (engine/enso)   ← 12 µs, CPU, learns
                          │    classify → xᵀWp → best model, SLO-gated
                          │
                          ├─ your enabled providers + internal models
                          │
                          └─ reward loop: in-app feedback + LLM-judge
                               → content-free ledger → online W update
```

- **Router (mechanism + policy):** `hanzoai/engine` — `hanzo-router` owns the
  registry, SLO gate, and dispatch; `enso` is the learnable policy.
- **Family (this repo):** `catalog.yaml` (the SKUs + rungs) + `prompts/` (identity),
  served by `hanzoai/zen` with `ZEN_FAMILY=enso`.
- **Benchmarks:** `hanzoai/enso-bench` — the eval harness whose JSONL both *ranks*
  the models and *trains* the router (`profile::parse_jsonl` → `fit_base`).

---

## Get started

- **Route through Enso:** enable Enso Router on your Hanzo Cloud org and send
  `model=auto`. Configure your pool + cost ceiling in the console's Router page.
- **Call the family directly:** `POST /v1/chat/completions` with `model: enso`
  (or `enso-flash` / `enso-ultra`) against `api.hanzo.ai/v1`.
- **Read the math:** the routing-overhead measurements, the learned-policy
  derivation, and the 1%-pricing economics are in
  [`hanzoai/papers/enso`](https://github.com/hanzoai/papers/tree/main/enso).

Enso is the routing layer we run our own platform on. It is the difference between
paying for one model and paying for the right one.
