/**
 * Provider Registry
 *
 * Centralized management of LLM providers. Handles provider registration,
 * configuration, and model lookup. Configuring a provider only re-keys the
 * instance — it never issues a provider request; explicit connection checks
 * go through SelectionCore.testConnection.
 */

import { LLMProvider, ProviderMetadata, ModelMetadata } from "./providers/base-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { AnthropicProvider } from "./providers/anthropic-provider";

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  /** Optional per-provider base URL overrides (used by the test harness). */
  constructor(private options: { baseUrls?: Partial<Record<"openai" | "anthropic", string>> } = {}) {}

  /**
   * Get a provider by ID
   */
  getProvider(providerId: string): LLMProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * List all registered providers
   */
  listProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values()).map((p) => p.metadata);
  }

  /**
   * Configure a provider (set API key, etc.). Recreates the instance with
   * the new config; no network request is made.
   */
  async configureProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }): Promise<void> {
    const provider = this.createProvider(providerId, config);
    if (provider) {
      this.providers.set(providerId, provider);
    }
  }

  /**
   * List all available models from all providers
   */
  async listAllModels(): Promise<ModelMetadata[]> {
    const allModels: ModelMetadata[] = [];

    for (const provider of this.providers.values()) {
      try {
        const models = await provider.listModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Failed to list models for ${provider.metadata.id}:`, error);
      }
    }

    return allModels;
  }

  /**
   * Get models for a specific provider
   */
  async getProviderModels(providerId: string): Promise<ModelMetadata[]> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    return provider.listModels();
  }

  /**
   * Get a specific model
   */
  async getModel(providerId: string, modelId: string): Promise<ModelMetadata | null> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return null;
    }

    return provider.getModel(modelId);
  }

  /**
   * Register the default providers (unkeyed until configured).
   */
  async initializeDefaults(): Promise<void> {
    if (!this.providers.has("openai")) {
      this.providers.set("openai", new OpenAIProvider({ apiKey: "", baseUrl: this.options.baseUrls?.openai }));
    }
    if (!this.providers.has("anthropic")) {
      this.providers.set("anthropic", new AnthropicProvider({ apiKey: "", baseUrl: this.options.baseUrls?.anthropic }));
    }
  }

  /**
   * Create provider instance
   */
  private createProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }): LLMProvider | null {
    switch (providerId) {
      case "openai":
        return new OpenAIProvider({
          apiKey: config.apiKey || "",
          baseUrl: config.baseUrl ?? this.options.baseUrls?.openai
        });

      case "anthropic":
        return new AnthropicProvider({
          apiKey: config.apiKey || "",
          baseUrl: config.baseUrl ?? this.options.baseUrls?.anthropic
        });

      default:
        console.warn(`Unknown provider: ${providerId}`);
        return null;
    }
  }
}
