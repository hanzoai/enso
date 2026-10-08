# Enso

Enso is Hanzo AI's frontier model family and the router behind `auto`: every request is
classified, priced against what your org can serve, and answered by the model that should answer
it. Three tiers keep their order on quality and price as the models under them change.

| Model | For |
|---|---|
| `enso-ultra` | the hardest problems, top-tier accuracy |
| `enso-pro` | everyday work at frontier quality |
| `enso-flash` | high volume, low latency, low cost |
| `enso-auto` | let the router pick for each request |

Enso is a Hanzo AI original: proprietary and closed source. There is no code or weights here;
it is served only through the Hanzo API.

- Benchmarks, measured on one harness: [hanzo.ai/models/enso](https://hanzo.ai/models/enso)
- Docs: [docs.hanzo.ai/docs/models/enso](https://docs.hanzo.ai/docs/models/enso)

## Use Enso through the Hanzo API

```bash
curl https://api.hanzo.ai/v1/chat/completions \
  -H "Authorization: Bearer $HANZO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "enso-auto", "messages": [{"role": "user", "content": "Hello"}]}'
```

The API speaks the OpenAI wire format, so any OpenAI SDK works with
`base_url="https://api.hanzo.ai/v1"`.

## Examples

Runnable client examples in this repository:

- **Python**: [`examples/python/client.py`](examples/python/client.py)
  ```bash
  pip install -r examples/python/requirements.txt
  export HANZO_API_KEY="your-api-key"
  python examples/python/client.py
  ```

- **TypeScript**: [`examples/typescript/client.ts`](examples/typescript/client.ts)
  ```bash
  cd examples/typescript
  npm install
  export HANZO_API_KEY="your-api-key"
  npm start
  ```

- **cURL**: [`examples/curl/chat.sh`](examples/curl/chat.sh)
  ```bash
  export HANZO_API_KEY="your-api-key"
  ./examples/curl/chat.sh
  ```

