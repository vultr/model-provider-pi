import { join } from "node:path";

import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_BASE_URL, loadCatalog } from "@vultr/model-catalog";

import { toPiModels } from "../src/models.ts";

export const PROVIDER = "vultr";
export const API_KEY_ENV = "VULTR_INFERENCE_API_KEY";
export const BASE_URL_ENV = "VULTR_INFERENCE_BASE_URL";

// pi waits for an async factory, so the models are there for startup and --list-models.
export default async function (pi: ExtensionAPI) {
  const baseUrl = process.env[BASE_URL_ENV] || DEFAULT_BASE_URL;
  try {
    // The catalog is public: no key is needed to list models, only to call them.
    const catalog = await loadCatalog({
      baseUrl,
      timeoutMs: 5_000,
      cachePath: join(getAgentDir(), "cache", "vultr-model-catalog.json"),
    });
    pi.registerProvider(PROVIDER, {
      name: "Vultr",
      baseUrl,
      apiKey: `$${API_KEY_ENV}`,
      api: "openai-completions",
      models: toPiModels(catalog.models),
    });
  } catch (error) {
    // No network and no cache: start pi without the provider instead of failing startup.
    console.error(`vultr: model catalog unavailable, provider not registered (${(error as Error).message})`);
  }
}
