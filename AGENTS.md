# AGENTS.md - vultr/model-provider-pi

A pi package: one extension that registers Vultr Inference as a model provider from the live catalog. `extensions/vultr.ts` is the entry pi loads; `src/models.ts` is the mapping and is what the tests cover.

Human overview, mapping table and install: `README.md`.

## What holds the design up

- **The catalog library does the reading.** `@vultr/model-catalog` fetches
  `GET /v1/models`, parses Model Document 2.4 and normalizes it. This repo
  only maps a normalized model onto what pi has a place for. A parsing
  or normalization fix belongs in the library, not here
- **Nothing static.** No model id, context window or price is written in this
  repo. A model Vultr adds shows up without a release
- **Never break the host.** No network and no cache means the provider is
  absent or keeps what pi already had. Startup, listing and requests
  must not raise because the catalog is down
- **Only usable models are offered:** text output, `is_ready`, and a context
  window. Rerankers, image generators and unready models are dropped
- **Requests must be accepted by the engine.** Vultr publishes `max_length`
  equal to the context window for most models. Sent as `max_tokens` that is
  always rejected (prompt + max_tokens > context). Check what pi does
  with the output limit before changing how it is mapped
- **Reasoning travels as top-level `reasoning_effort`,** limited to the
  model's `supported_efforts`; `none` switches it off unless reasoning is
  mandatory.
- **Siblings:** `model-provider-openclaw` maps onto almost the same model type (OpenClaw is built on pi). A mapping fix here usually applies there too

## Working here

- `npm run typecheck` and `npm test` must pass. Types come from the real
  `@earendil-works/pi-coding-agent` package; do not redeclare them
- pi loads the `.ts` sources through jiti and the tests run them on Node's type
  stripping: keep the source erasable and keep `.ts` on relative imports
- `@earendil-works/*` packages are provided by pi: `peerDependencies` with
  `"*"`, never bundled. `@vultr/model-catalog` is a git dependency pinned to a
  commit; bump the sha on purpose
- pi's behavior is in the installed package, not in web summaries:
  `docs/custom-provider.md`, `docs/packages.md`, and
  `pi-ai/dist/api/openai-completions.js` for what a compat flag sends
- Verify against the installed pi, not only the unit tests. The
  README describes the key-free capture setup
- Put lasting explanation in `docs/` or the README, not in the source. If a
  comment is needed, make it short. Docs describe current behavior, not history
- Write commit messages to the Conventional Commits spec
- No em dashes or en dashes anywhere: prose, comments, commit messages and
  docs use plain hyphens, `·`, or `:`
- No AI trailers on commits (`Co-Authored-By`, `Generated with`, ...)
- Never force-push; never rewrite pushed history
