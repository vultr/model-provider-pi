import type { ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { acceptsInput, isAgentModel, pricePerMillion, type CatalogModel } from "@vultr/model-catalog";

type ThinkingLevelMap = NonNullable<ProviderModelConfig["thinkingLevelMap"]>;

// pi's levels that travel as reasoning_effort. "off" is handled apart.
const LEVELS = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;

// A level the model does not list is hidden (null). Without an allowlist pi's own
// defaults stand. "off" sends "none", unless the model cannot stop reasoning.
export function thinkingLevelMap(model: CatalogModel): ThinkingLevelMap | undefined {
  const reasoning = model.reasoning;
  if (!reasoning) {
    return undefined;
  }
  const map: ThinkingLevelMap = { off: reasoning.mandatory ? null : "none" };
  if (reasoning.supportedEfforts) {
    for (const level of LEVELS) {
      map[level] = reasoning.supportedEfforts.includes(level) ? level : null;
    }
  }
  return map;
}

// pi drives tools and budgets a turn against the context window: a model without tool calling or a
// context window is not offered.
export function isUsable(model: CatalogModel): boolean {
  return isAgentModel(model);
}

export function toPiModel(model: CatalogModel): ProviderModelConfig {
  const price = pricePerMillion(model);
  const levels = thinkingLevelMap(model);
  const contextWindow = model.contextWindow ?? 0;
  return {
    id: model.id,
    name: model.name,
    reasoning: model.reasoning !== null,
    ...(levels ? { thinkingLevelMap: levels } : {}),
    input: acceptsInput(model, "image") ? ["text", "image"] : ["text"],
    cost: {
      input: price.prompt ?? 0,
      output: price.completion ?? 0,
      cacheRead: price.cachedPrompt ?? 0,
      cacheWrite: price.cacheWrite ?? 0,
    },
    contextWindow,
    // pi clamps a request's max tokens to the context that is left.
    maxTokens: model.maxOutputTokens ?? contextWindow,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: model.reasoning !== null,
      maxTokensField: "max_tokens",
    },
  };
}

export function toPiModels(models: CatalogModel[]): ProviderModelConfig[] {
  return models.filter(isUsable).map(toPiModel);
}
