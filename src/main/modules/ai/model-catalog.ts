/**
 * Model Catalog
 *
 * Single source of truth for the providers and models the app offers, with
 * verified metadata (IDs, pricing, context windows, capabilities). Providers,
 * the AI service, and the settings UI all read model data from here so the
 * picker, the persisted selection, and the request path can never disagree.
 *
 * Pure module: no electron imports, no network.
 */

import type { ModelMetadata } from "./providers/base-provider";

/** Providers a model can be selected for. 'local' has no models. */
export type ApiProviderId = "openai" | "anthropic";

/** The provider vocabulary accepted from settings ('claude' is legacy for 'anthropic'). */
export type SettingsProviderId = "openai" | "claude" | "anthropic" | "local";

/**
 * Normalize the settings provider vocabulary to registry provider IDs.
 * 'claude' (legacy persisted value) resolves to 'anthropic'.
 */
export function normalizeProviderId(provider: string): "openai" | "anthropic" | "local" {
  if (provider === "claude") return "anthropic";
  if (provider === "openai" || provider === "anthropic" || provider === "local") return provider;
  return "local";
}

/** Whether the given settings provider value is part of the accepted vocabulary. */
export function isKnownProvider(provider: unknown): provider is SettingsProviderId {
  return provider === "openai" || provider === "claude" || provider === "anthropic" || provider === "local";
}

/** All catalog models for an API provider. */
export function getCatalogModels(provider: ApiProviderId): ModelMetadata[] {
  return CATALOG[provider] ?? [];
}

/** The default model id for a provider ('' for local — it takes no model). */
export function getDefaultModelId(provider: SettingsProviderId): string {
  const normalized = normalizeProviderId(provider);
  if (normalized === "local") return "";
  const models = getCatalogModels(normalized);
  const tagged = models.find((m) => m.tags.includes("default"));
  return (tagged ?? models[0])?.id ?? "";
}

/** Whether a model id belongs to the given provider's catalog. */
export function isCatalogModel(provider: SettingsProviderId, modelId: string): boolean {
  const normalized = normalizeProviderId(provider);
  if (normalized === "local") return false;
  return getCatalogModels(normalized).some((m) => m.id === modelId);
}

/**
 * Resolve a (provider, model) pair from settings into a valid selection.
 * Recovery rules: local never carries a model; a missing, unknown, or
 * cross-provider model resolves to the provider's default.
 */
export function resolveSelection(
  provider: SettingsProviderId,
  modelId: string | undefined
): { provider: "openai" | "anthropic" | "local"; model?: string } {
  const normalized = normalizeProviderId(provider);
  if (normalized === "local") return { provider: "local" };
  if (modelId && isCatalogModel(normalized, modelId)) {
    return { provider: normalized, model: modelId };
  }
  return { provider: normalized, model: getDefaultModelId(normalized) };
}

// ---------------------------------------------------------------------------
// Catalog data
// ---------------------------------------------------------------------------

function model(partial: Partial<ModelMetadata> & { id: string; provider: string }): ModelMetadata {
  return {
    name: partial.id,
    description: "",
    contextWindow: 0,
    pricing: { inputCostPerMillion: 0, outputCostPerMillion: 0 },
    capabilities: { vision: false, functionCalling: false, streaming: false, batchProcessing: false },
    limits: { maxTokensPerRequest: 0, requestsPerMinute: 0, tokensPerMinute: 0 },
    tags: [],
    ...partial
  } as ModelMetadata;
}

// Verified 2026-10-09. Anthropic: claude-api skill catalog (cached 2026-10-06).
// OpenAI: developers.openai.com /api/docs/models, /pricing, /deprecations
// (accessed 2026-10-09). Rate limits are org-tier dependent and not displayed,
// so they are left at 0 rather than invented.
//
// Curation rule (requested 2026-10-10): offer only the least expensive model
// in each size/tier class. Anthropic classes: Haiku / Sonnet / Opus. OpenAI
// classes: Luna / Sol / Terra / Astra / Pro / base / mini / nano. Ties go to
// the newest release.
const CATALOG: Record<ApiProviderId, ModelMetadata[]> = {
  anthropic: [
    model({
      id: "claude-haiku-5-5",
      provider: "anthropic",
      name: "Claude Haiku 5.5",
      description: "Fastest and cheapest Claude — ideal for bulk bookmark analysis",
      contextWindow: 1_000_000,
      pricing: { inputCostPerMillion: 0.1, outputCostPerMillion: 0.5 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["default", "recommended", "budget", "fast"]
    }),
    model({
      id: "claude-sonnet-5-5",
      provider: "anthropic",
      name: "Claude Sonnet 5.5",
      description: "Balanced speed and capability for everyday analysis",
      contextWindow: 1_000_000,
      pricing: { inputCostPerMillion: 2, outputCostPerMillion: 10, cacheCostPerMillion: 0.2, cacheDiscountPercent: 90 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["balanced", "vision"]
    }),
    model({
      id: "claude-opus-5-5",
      provider: "anthropic",
      name: "Claude Opus 5.5",
      description: "Most capable Claude for hard categorization calls",
      contextWindow: 1_000_000,
      pricing: { inputCostPerMillion: 4, outputCostPerMillion: 20, cacheCostPerMillion: 0.2, cacheDiscountPercent: 95 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["powerful", "vision"]
    })
  ],
  openai: [
    model({
      id: "gpt-6-luna",
      provider: "openai",
      name: "GPT-6 Luna",
      description: "Cheapest current GPT — ideal for bulk bookmark analysis",
      contextWindow: 1_050_000,
      pricing: {
        inputCostPerMillion: 0.1,
        outputCostPerMillion: 0.5,
        cacheCostPerMillion: 0.01,
        cacheDiscountPercent: 90
      },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["default", "recommended", "budget", "fast"]
    }),
    model({
      id: "gpt-6.1-sol",
      provider: "openai",
      name: "GPT-6.1 Sol",
      description: "Mid-tier GPT-6 balancing intelligence and cost",
      contextWindow: 1_050_000,
      pricing: { inputCostPerMillion: 2, outputCostPerMillion: 10, cacheCostPerMillion: 0.1, cacheDiscountPercent: 95 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["balanced", "vision"]
    }),
    model({
      id: "gpt-5.6-terra",
      provider: "openai",
      name: "GPT-5.6 Terra",
      description: "Terra-class mid-tier, still fully served",
      contextWindow: 1_050_000,
      pricing: { inputCostPerMillion: 2, outputCostPerMillion: 12 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["vision"]
    }),
    model({
      id: "gpt-6-astra",
      provider: "openai",
      name: "GPT-6 Astra",
      description: "Top OpenAI flagship for the hardest analysis",
      contextWindow: 1_050_000,
      pricing: { inputCostPerMillion: 10, outputCostPerMillion: 50, cacheCostPerMillion: 1, cacheDiscountPercent: 90 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["powerful", "vision"]
    }),
    model({
      id: "gpt-5.5-pro",
      provider: "openai",
      name: "GPT-5.5 Pro",
      description: "Highest-effort GPT-5.5 tier",
      contextWindow: 1_050_000,
      pricing: { inputCostPerMillion: 30, outputCostPerMillion: 180 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["powerful", "vision"]
    }),
    model({
      id: "gpt-5",
      provider: "openai",
      name: "GPT-5",
      description: "Legacy flagship — snapshots shut down 2026-12-11",
      contextWindow: 400_000,
      pricing: { inputCostPerMillion: 1.25, outputCostPerMillion: 10 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["vision"],
      deprecatedAt: new Date("2026-12-11"),
      replacedBy: "gpt-6-astra"
    }),
    model({
      id: "gpt-4o-mini",
      provider: "openai",
      name: "GPT-4o Mini",
      description: "Legacy GPT-4-era budget model, still callable",
      contextWindow: 128_000,
      pricing: { inputCostPerMillion: 0.15, outputCostPerMillion: 0.6 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 16_384, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["budget"]
    }),
    model({
      id: "gpt-5-nano",
      provider: "openai",
      name: "GPT-5 Nano",
      description: "Legacy budget tier — snapshots shut down 2026-12-11",
      contextWindow: 400_000,
      pricing: { inputCostPerMillion: 0.05, outputCostPerMillion: 0.4 },
      capabilities: { vision: true, functionCalling: true, streaming: true, batchProcessing: true },
      limits: { maxTokensPerRequest: 128_000, requestsPerMinute: 0, tokensPerMinute: 0 },
      tags: ["budget", "fast"],
      deprecatedAt: new Date("2026-12-11"),
      replacedBy: "gpt-6-luna"
    })
  ]
};
