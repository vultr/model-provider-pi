# @vultr/model-provider-pi

Vultr Inference as a model provider for [pi](https://pi.dev). The model list, context windows, prices, image input and reasoning levels come from the live `GET /v1/models` catalog on every start.

## Install

```bash
pi install git:github.com/vultr/model-provider-pi
export VULTR_INFERENCE_API_KEY=...
pi --list-models vultr
pi --model vultr/glm-5.3:high
```

From a local checkout, pi references the directory in place (it does not copy
or clone it), so the checkout needs its own `node_modules`:

```bash
cd ~/src/vultr/model-provider-pi && npm install
pi install ~/src/vultr/model-provider-pi
```

To load the working tree for one run without installing:

```bash
pi -ne -e ./extensions/vultr.ts --list-models vultr
```

## How it works

`extensions/vultr.ts` is an async extension factory. pi waits for it, so the
provider is registered before startup finishes and before `--list-models`
answers. It calls `loadCatalog` and registers provider `vultr` with
`api: "openai-completions"` and `apiKey: "$VULTR_INFERENCE_API_KEY"`.

The catalog is public: no key is needed to list models, only to call them.
pi only lists providers that have credentials, so `--list-models` shows
nothing until `VULTR_INFERENCE_API_KEY` is set.

The last good catalog is kept in `<pi agent dir>/cache/vultr-model-catalog.json`
and served when the network fails. With neither, pi starts without the
provider and prints one line to stderr.

## Mapping

| pi | Catalog |
| --- | --- |
| `contextWindow`, `maxTokens` | `contextWindow`, `maxOutputTokens` |
| `cost` (USD per million) | `pricePerMillion`: prompt, completion, cached prompt, cache write |
| `input` | `text`, plus `image` when the model accepts it |
| `reasoning` | the model has a `reasoning` block |
| `thinkingLevelMap` | each pi level is itself when listed in `supportedEfforts`, else `null` (hidden). `off` is `"none"`, or `null` when reasoning is mandatory. No allowlist: only `off` is set |
| `compat` | `maxTokensField: "max_tokens"`, `supportsDeveloperRole: false`, `supportsStore: false`, `supportsReasoningEffort` |

pi clamps a request's `max_tokens` to the context that is left (minus 4096),
so the published output limit is passed through unchanged.

## Environment

| Variable | Meaning |
| --- | --- |
| `VULTR_INFERENCE_API_KEY` | Sent as the Bearer token on chat requests |
| `VULTR_INFERENCE_BASE_URL` | Overrides `https://api.vultrinference.com/v1` for the catalog and for requests |

## Development

```bash
npm install
npm run typecheck
npm test
```

Verifying against the real harness needs no API key: serve
`model-catalog-typescript/fixtures/vultr-catalog.json` at `/v1/models` from a
local server that records `POST /v1/chat/completions` and answers with a short
SSE stream, then set `VULTR_INFERENCE_BASE_URL` to it and `VULTR_INFERENCE_API_KEY` to
any value. Read the recorded request body: that is what Vultr would receive.
