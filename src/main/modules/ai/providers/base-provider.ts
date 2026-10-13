/**
 * Base Provider Abstraction for LLM Providers
 *
 * This module defines the core interfaces and abstract base class for all LLM providers.
 * It provides a unified API that normalizes differences between provider implementations.
 */

/**
 * Normalized request format used internally across all providers
 */
export interface LLMRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

/**
 * Normalized response format returned by all providers
 */
export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  finishReason: "stop" | "length" | "tool_calls" | "error";
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  latencyMs: number;
  cached?: boolean;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

/**
 * Stream chunk format for streaming responses
 */
export interface LLMStreamChunk {
  delta: string;
  isComplete: boolean;
  usage?: LLMResponse["usage"];
}

/**
 * Model metadata with pricing and capabilities
 */
export interface ModelMetadata {
  id: string; // Internal identifier (e.g., "gpt-4o")
  name: string; // Display name (e.g., "GPT-4o")
  provider: string; // Provider ID
  description: string;
  contextWindow: number;
  pricing: {
    inputCostPerMillion: number;
    outputCostPerMillion: number;
    cacheCostPerMillion?: number;
    cacheDiscountPercent?: number;
  };
  capabilities: {
    vision: boolean;
    functionCalling: boolean;
    streaming: boolean;
    batchProcessing: boolean;
  };
  limits: {
    maxTokensPerRequest: number;
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  tags: string[]; // ["recommended", "budget", "fast", "powerful"]
  deprecatedAt?: Date;
  replacedBy?: string;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string; // "openai", "anthropic", "local"
  name: string; // "OpenAI", "Anthropic", "Local"
  description: string;
  website: string;
  documentationUrl: string;
  requiresApiKey: boolean;
  supportsBatch: boolean;
  supportsStreaming: boolean;
  defaultModel: string;
}

/**
 * Abstract base class for all LLM providers
 */
export abstract class LLMProvider {
  abstract readonly metadata: ProviderMetadata;

  protected apiKey?: string;
  protected baseUrl?: string;

  constructor(config: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  /**
   * Initialize the provider (validate API key, fetch models, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Complete a prompt (non-streaming)
   */
  abstract complete(request: LLMRequest, model: string): Promise<LLMResponse>;

  /**
   * Stream a completion
   */
  abstract stream(request: LLMRequest, model: string): AsyncGenerator<LLMStreamChunk>;

  /**
   * List available models from the provider
   */
  abstract listModels(): Promise<ModelMetadata[]>;

  /**
   * Get metadata for a specific model
   */
  abstract getModel(modelId: string): Promise<ModelMetadata | null>;

  /**
   * Estimate cost for a request
   */
  async estimateCost(
    request: LLMRequest,
    model: string
  ): Promise<{ inputCost: number; outputCost: number; totalCost: number }> {
    const modelMeta = await this.getModel(model);
    if (!modelMeta) {
      throw new Error(`Model ${model} not found`);
    }

    // Rough token estimation (4 chars = 1 token)
    const inputTokens = this.estimateTokens(request);
    const outputTokens = request.maxTokens || 500;

    const inputCost = (inputTokens / 1_000_000) * modelMeta.pricing.inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * modelMeta.pricing.outputCostPerMillion;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Explicitly verify the configured API key against a non-billable provider
   * endpoint (the provider's model list). Never called as a side effect of
   * saving settings — only on an explicit user action.
   */
  abstract checkConnection(): Promise<{ ok: true } | { ok: false; error: string }>;

  /**
   * Estimate tokens for a request (rough estimation)
   */
  protected estimateTokens(request: LLMRequest): number {
    const text = request.messages.map((m) => m.content).join(" ");
    return Math.ceil(text.length / 4); // Rough: 4 chars = 1 token
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  protected async handleRateLimit(error: unknown, attempt: number): Promise<void> {
    const retryAfter = (error as { headers?: Record<string, string> }).headers?.["retry-after"];
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, attempt), 60000);

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Normalize error response
   */
  protected normalizeError(error: unknown): Error {
    const apiError = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error;
    if (apiError) {
      return new Error(apiError.message || "API error");
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
