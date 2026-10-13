/**
 * Model Selection core
 *
 * Owns the selected provider/model: loading and persisting AI settings,
 * resolving the selection into the provider+model every analysis run uses,
 * and explicit connection validation. Electron-free — the store and the
 * provider registry are injected, so the app wires the real datastore and
 * providers while checks wire a file-backed store and fakes.
 */

import type { AISettings } from "~/flow/interfaces/ai";
import type { LLMProvider, LLMRequest, LLMResponse, ModelMetadata } from "./providers/base-provider";
import { getDefaultModelId, normalizeProviderId, resolveSelection } from "./model-catalog";
import { validateSettingsPatch } from "./settings-validation";

/** The slice of a datastore the core needs. SettingsDataStore satisfies it. */
export interface KVStore {
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

/** The slice of the provider registry the core needs. */
export interface RegistryLike {
  getProvider(providerId: string): LLMProvider | null;
  configureProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }): Promise<void>;
}

export const AI_SETTINGS_KEY = "ai-settings";

export const DEFAULT_SETTINGS: AISettings = {
  enabled: true,
  provider: "openai",
  model: "",
  autoAnalyze: false,
  confidenceThreshold: 0.7,
  autoApply: {
    enabled: false,
    maxLabels: 1,
    notifications: true
  },
  categories: {
    topics: true,
    types: true,
    priority: false
  }
};

export type RunTarget =
  | { kind: "local" }
  | { kind: "api"; provider: LLMProvider; providerId: "openai" | "anthropic"; model: string };

export type ConnectionTestResult = {
  success: boolean;
  models?: ModelMetadata[];
  error?: string;
};

export class SelectionCore {
  private store: KVStore;
  private registry: RegistryLike;
  private settings: AISettings = { ...DEFAULT_SETTINGS };
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(deps: { store: KVStore; registry: RegistryLike }) {
    this.store = deps.store;
    this.registry = deps.registry;
  }

  /** Load persisted settings, resolving the stored selection to a valid one. */
  async load(): Promise<void> {
    if (this.loaded) return;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const saved = await this.store.get<AISettings>(AI_SETTINGS_KEY).catch(() => undefined);
        if (saved) {
          this.settings = { ...DEFAULT_SETTINGS, ...saved };
        }
        this.applyResolvedSelection();
        if (this.settings.apiKey && normalizeProviderId(this.settings.provider) !== "local") {
          await this.registry.configureProvider(normalizeProviderId(this.settings.provider), {
            apiKey: this.settings.apiKey
          });
        }
        this.loaded = true;
      })();
    }
    await this.loadPromise;
  }

  /** Current settings, with the selection already resolved to a valid pair. */
  async getSettings(): Promise<AISettings> {
    await this.load();
    return { ...this.settings };
  }

  /**
   * Validate and apply a settings patch, then persist. Never issues a
   * provider request — configuration only re-keys the provider instance.
   */
  async updateSettings(patch: Partial<AISettings>): Promise<AISettings> {
    await this.load();

    const result = validateSettingsPatch(patch, this.settings.provider);
    if (!result.ok) {
      throw new Error(result.error);
    }

    const providerChanged = patch.provider !== undefined && patch.provider !== this.settings.provider;
    this.settings = { ...this.settings, ...result.patch };

    // A provider switch without an explicit model lands on the new provider's default.
    if (providerChanged && patch.model === undefined) {
      this.settings.model = getDefaultModelId(this.settings.provider);
    }
    this.applyResolvedSelection();

    if (this.settings.apiKey && normalizeProviderId(this.settings.provider) !== "local") {
      await this.registry.configureProvider(normalizeProviderId(this.settings.provider), {
        apiKey: this.settings.apiKey
      });
    }

    await this.store.set(AI_SETTINGS_KEY, this.settings);
    return { ...this.settings };
  }

  /** Resolve the current selection into the target an analysis run uses. */
  async getRunTarget(): Promise<RunTarget> {
    await this.load();
    const selection = resolveSelection(this.settings.provider, this.settings.model);
    if (selection.provider === "local") {
      return { kind: "local" };
    }
    const provider = this.registry.getProvider(selection.provider);
    if (!provider) {
      throw new Error(`Provider ${selection.provider} not configured`);
    }
    return { kind: "api", provider, providerId: selection.provider, model: selection.model! };
  }

  /** Run a completion on the currently selected provider and model. */
  async runCompletion(request: LLMRequest): Promise<{ response: LLMResponse; model: string; providerId: string }> {
    const target = await this.getRunTarget();
    if (target.kind === "local") {
      throw new Error("The local provider does not run completions");
    }
    const response = await target.provider.complete(request, target.model);
    return { response, model: target.model, providerId: target.providerId };
  }

  /**
   * Explicit connection validation (FR8): configure the provider with the
   * given key and verify it against the provider's model endpoint. This is
   * the only path that issues a provider request outside analysis itself.
   */
  async testConnection(providerId: string, apiKey: string): Promise<ConnectionTestResult> {
    await this.load();
    const normalized = normalizeProviderId(providerId);
    if (normalized === "local") {
      return { success: true, models: [] };
    }
    try {
      await this.registry.configureProvider(normalized, { apiKey });
      const provider = this.registry.getProvider(normalized);
      if (!provider) {
        return { success: false, error: `Provider ${normalized} is not available` };
      }
      const check = await provider.checkConnection();
      if (!check.ok) {
        return { success: false, error: check.error };
      }
      return { success: true, models: await provider.listModels() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  private applyResolvedSelection(): void {
    const selection = resolveSelection(this.settings.provider, this.settings.model);
    this.settings.model = selection.provider === "local" ? "" : selection.model;
  }
}
