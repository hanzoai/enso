---
language:
- en
- multilingual
license: proprietary
library_name: hanzo
pipeline_tag: text-generation
tags:
- intelligent-routing
- router
- dynamic-inference
- llm-orchestration
- api-only
metrics:
- routing_accuracy
- token_savings
- latency_overhead
model-index:
- name: hanzoai/enso-auto
  results:
  - task:
      type: text-generation
      name: Dynamic Model Routing
    metrics:
    - type: accuracy
      value: 0.962
      name: Tier Selection Accuracy
    - type: cost_reduction
      value: 0.684
      name: Average Cost Savings vs Frontier
    - type: latency_ms
      value: 14.8
      name: Router Latency Overhead
---

# Enso: Intelligent Routing & Multi-Tier Intelligence Model Card

> ⚠️ **API-only · Weights not distributed**  
> Enso is Hanzo AI's dynamic routing engine and intelligent multi-tier frontier system.  
> Endpoint: `https://api.hanzo.ai/v1/chat/completions`

---

## 1. Overview & Tier Taxonomy

Enso analyzes incoming prompts (tokens, complexity, intent, tool requirements) and dynamically routes execution to the optimal intelligence tier:

| Model ID | Target Workload | Latency Profile | Relative Cost | Context Window |
|---|---|---|---|---|
| **`enso-ultra`** | Complex multi-step reasoning, theorem proving, architecture synthesis | Standard | Frontier | Up to 1M tokens |
| **`enso-pro`** | Production software engineering, drafting, analytical synthesis | Fast | Balanced (35% of Ultra) | Up to 256K tokens |
| **`enso-flash`** | High-throughput agents, real-time chat, structured extractions | Ultra-Fast (<15ms) | Low (5% of Ultra) | Up to 128K tokens |
| **`enso-auto`** | Autonomous router choosing between Flash, Pro, and Ultra per request | Dynamic | Optimized (~68% savings) | Up to 1M tokens |
| **`enso-free`** | Open community tier across open-weight models | High-Throughput | Zero cost | Up to 32K tokens |

---

## 2. Router Benchmarks & Economics

Evaluated across 50,000 multi-domain requests (MMLU-Pro, SWE-bench, Math, Chat):

| Metric | Enso Auto | Always Frontier (GPT-4o / Claude 3.5 Sonnet) | Always Small (8B) |
|---|---|---|---|
| **Composite Quality Score** | **94.8%** | 95.2% | 71.4% |
| **Average Cost per 1M Tokens** | **$1.14** | $4.85 | $0.20 |
| **Median Time-to-First-Token** | **180 ms** | 620 ms | 140 ms |
| **Router Decision Overhead** | **14.8 ms** | N/A | N/A |

---

## 3. Quickstart Integration

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-hanzo-api-key",
    base_url="https://api.hanzo.ai/v1"
)

response = client.chat.completions.create(
    model="enso-auto",
    messages=[
        {"role": "user", "content": "Analyze the time complexity of this distributed consensus algorithm."}
    ]
)
print(response.choices[0].message.content)
```

---

## 4. Hub & Documentation Links

- **Documentation**: [docs.hanzo.ai/docs/models/enso](https://docs.hanzo.ai/docs/models/enso)
- **Hugging Face Hub**: [`huggingface.co/hanzoai/enso-auto`](https://huggingface.co/hanzoai/enso-auto)
- **Interactive Router Space**: [`huggingface.co/spaces/hanzoai/enso-router`](https://huggingface.co/spaces/hanzoai/enso-router)
