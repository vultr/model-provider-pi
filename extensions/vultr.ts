import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_BASE_URL, loadCatalog } from "@vultr/model-catalog";

import { toPiModels } from "../src/models.ts";

export const PROVIDER = "vultr";
export const API_KEY_ENV = "VULTR_INFERENCE_API_KEY";
export const BASE_URL_ENV = "VULTR_INFERENCE_BASE_URL";

// Goes in front of the catalog library's own User-Agent. pi loads this source from the package.
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
const USER_AGENT = `vultr-model-provider-pi/${version}`;

// pi waits for an async factory, so the models are there for startup and --list-models.
export default async function (pi: ExtensionAPI) {
  const baseUrl = process.env[BASE_URL_ENV] || DEFAULT_BASE_URL;
  try {
    // The catalog asks for no key. One that is set goes with the read, so the list is the one that key gets.
    const key = process.env[API_KEY_ENV];
    const catalog = await loadCatalog({
      baseUrl,
      ...(key ? { apiKey: key } : {}),
      userAgent: USER_AGENT,
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
