# LLM Provider Architecture - Technical Specification

**Version**: 1.0
**Date**: January 2025
**Status**: Design Phase
**Authors**: Flow Browser Engineering Team

---

## Executive Summary

This document specifies the architecture for a unified LLM provider system in Flow Browser that enables seamless integration with multiple AI providers (OpenAI, Anthropic, and future providers) through a common abstraction layer.

### Goals

1. **Unified Interface**: Single API for interacting with all LLM providers
2. **Dynamic Discovery**: Fetch available models from provider APIs at runtime
3. **Cost Optimization**: Intelligent model selection based on task requirements and pricing
4. **Extensibility**: Easy addition of new providers without modifying core logic
5. **Resilience**: Robust error handling, rate limiting, and fallback strategies
6. **Performance**: Response caching, request batching, and efficient token usage

### Key Benefits

- **Provider Agnostic**: Application logic doesn't depend on specific provider implementations
- **Future-Proof**: New providers can be added through plugin architecture
- **Cost Control**: Transparent pricing information enables budget-aware model selection
- **User Choice**: Users can select providers and models based on their preferences
- **Reliability**: Automatic failover and retry mechanisms ensure service continuity

---

## API Research Findings

### OpenAI API (2025)

#### Available Models

| Model        | Context Window | Input Price    | Output Price   | Key Features                     |
| ------------ | -------------- | -------------- | -------------- | -------------------------------- |
| GPT-4o       | 128K           | $3/M tokens    | $10/M tokens   | Vision, function calling, fast   |
| GPT-4o Mini  | 128K           | $0.15/M tokens | $0.60/M tokens | Budget-friendly, fast            |
| GPT-4.1      | 1M+            | $15/M tokens   | $60/M tokens   | Extended context, prompt caching |
| GPT-4.1 Nano | 1M+            | $0.30/M tokens | $1.20/M tokens | Budget + extended context        |
| GPT-4 Turbo  | 128K           | $10/M tokens   | $30/M tokens   | Previous generation              |

#### Authentication

```typescript
// Bearer token authentication
headers: {
  'Authorization': 'Bearer sk-...',
  'Content-Type': 'application/json'
}
```

#### Request Format

```typescript
POST https://api.openai.com/v1/chat/completions

{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Analyze this bookmark..." }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

#### Response Format

```typescript
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Analysis result..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

#### Streaming

```typescript
// Server-Sent Events (SSE)
stream: true

// Response chunks
data: {"choices":[{"delta":{"content":"token"},"index":0}]}
data: [DONE]
```

#### Rate Limiting

- Headers: `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`
- Tier-based limits (e.g., Tier 5: 10,000 RPM)
- 429 status code with `Retry-After` header

#### Prompt Caching

- 50% discount on cached tokens for GPT-4o
- 75% discount for GPT-4.1 series
- Automatic cache key generation from prompt prefix

---

### Anthropic Claude API (2025)

#### Available Models

| Model             | Context Window | Input Price    | Output Price   | Key Features         |
| ----------------- | -------------- | -------------- | -------------- | -------------------- |
| Claude Sonnet 4.5 | 200K (1M beta) | $3/M tokens    | $15/M tokens   | Latest, most capable |
| Claude 3.5 Sonnet | 200K           | $3/M tokens    | $15/M tokens   | Balanced performance |
| Claude 3.5 Haiku  | 200K           | $0.80/M tokens | $4/M tokens    | Fast, economical     |
| Claude Opus 4.1   | 200K (1M beta) | $15/M tokens   | $75/M tokens   | Most powerful        |
| Claude 3 Haiku    | 200K           | $0.25/M tokens | $1.25/M tokens | Budget option        |

#### Authentication

```typescript
// Custom header authentication
headers: {
  'x-api-key': 'sk-ant-...',
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json'
}
```

#### Request Format

```typescript
POST https://api.anthropic.com/v1/messages

{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 500,
  "messages": [
    {
      "role": "user",
      "content": "Analyze this bookmark..."
    }
  ],
  "system": "You are a helpful assistant."
}
```

#### Response Format

```typescript
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{
    "type": "text",
    "text": "Analysis result..."
  }],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 50
  }
}
```

#### Streaming

```typescript
// Server-Sent Events (SSE)
stream: true

// Response events
event: message_start
event: content_block_delta
data: {"delta":{"type":"text_delta","text":"token"}}
event: message_stop
```

#### Rate Limiting

- Token-based rate limits
- Headers: `anthropic-ratelimit-requests-limit`, `anthropic-ratelimit-tokens-remaining`
- 429 status with `retry-after` header

#### Batch API

- 50% cost reduction for async processing
- Submit batch jobs, retrieve results later
- Ideal for large-scale bookmark analysis

#### Prompt Caching

- Up to 90% cost reduction for cached prompts
- Requires `anthropic-beta: prompt-caching-2024-07-31` header
- Cache writes: 25% markup, cache reads: 90% discount

---

### API Comparison Matrix

| Feature                | OpenAI            | Anthropic              | Notes                               |
| ---------------------- | ----------------- | ---------------------- | ----------------------------------- |
| **Auth Method**        | Bearer token      | x-api-key header       | Different auth headers              |
| **Max Context**        | 128K-1M           | 200K-1M                | Both offer extended context         |
| **Streaming**          | SSE with delta    | SSE with events        | Similar but different formats       |
| **System Prompt**      | In messages array | Separate field         | Different request structure         |
| **Vision Support**     | ✅ GPT-4o/4.1     | ✅ All Claude 3+       | Both support image analysis         |
| **Function Calling**   | ✅ Native         | ✅ Tool use            | Different terminology, same concept |
| **Batch Processing**   | ❌ Not available  | ✅ 50% discount        | Anthropic has batch API             |
| **Prompt Caching**     | ✅ 50-75%         | ✅ 90%                 | Anthropic more aggressive           |
| **Rate Limit Headers** | x-ratelimit-\*    | anthropic-ratelimit-\* | Different header names              |
| **Error Codes**        | Standard HTTP     | Standard HTTP          | Both use 429 for rate limits        |
| **Cost Tracking**      | Usage object      | Usage object           | Both return token counts            |

### Key Differences Requiring Abstraction

1. **Authentication Headers**: Different header names and formats
2. **Request Structure**: System prompt location differs
3. **Response Format**: Different JSON structures and field names
4. **Streaming Events**: Different SSE event types and data formats
5. **Rate Limit Headers**: Different naming conventions
6. **Token Counting**: Different tokenization methods
7. **Error Messages**: Different error response structures

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  (BookmarkAnalyzer, AILabelingDashboard, Settings UI)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI Service (Unified API)                      │
│  • analyzeBookmark()                                            │
│  • listAvailableModels()                                        │
│  • getProviders()                                               │
│  • estimateCost()                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Registry                            │
│  • registerProvider(provider: LLMProvider)                      │
│  • getProvider(id: string): LLMProvider                         │
│  • listModels(): ModelMetadata[]                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   OpenAI     │  │  Anthropic   │  │    Local     │
│   Provider   │  │   Provider   │  │   Provider   │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ • complete() │  │ • complete() │  │ • complete() │
│ • stream()   │  │ • stream()   │  │ • stream()   │
│ • models()   │  │ • models()   │  │ • models()   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Component Hierarchy

```
AIService
├── ProviderRegistry
│   ├── OpenAIProvider
│   │   └── ModelRegistry
│   ├── AnthropicProvider
│   │   └── ModelRegistry
│   └── LocalProvider
│       └── ModelRegistry
├── RateLimiter
│   ├── TokenBucket (per provider)
│   └── RetryStrategy
├── CacheManager
│   ├── PromptCache
│   └── ResponseCache
└── CostTracker
    ├── UsageMetrics
    └── BudgetAlerts
```

### Data Flow

```
User Request
    │
    ▼
AI Settings UI
    │
    ├─► listProviders() ──────► Provider Registry
    │                               │
    │                               ▼
    ├─► listModels(provider) ───► Provider.getModels()
    │                               │
    │                               ▼
    └─► selectModel(id) ─────────► Store in Settings
                                    │
                                    ▼
Bookmark Analysis Request           │
    │                              │
    ▼                              │
AIService.analyzeBookmark() ◄──────┘
    │
    ├─► Get Provider from Registry
    │
    ├─► Check Rate Limit
    │
    ├─► Check Cache
    │
    ├─► Provider.complete(prompt)
    │       │
    │       ├─► Normalize Request
    │       │
    │       ├─► API Call
    │       │
    │       ├─► Parse Response
    │       │
    │       └─► Normalize Response
    │
    ├─► Update Cache
    │
    ├─► Track Cost
    │
    └─► Return Results
```

---

## Detailed Design

### 1. Provider Abstraction Interface

```typescript
// src/main/modules/ai/providers/base-provider.ts

/**
 * Normalized request format used internally
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
    parameters: Record<string, any>;
  }>;
}

/**
 * Normalized response format
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
    arguments: Record<string, any>;
  }>;
}

/**
 * Stream chunk format
 */
export interface LLMStreamChunk {
  delta: string;
  isComplete: boolean;
  usage?: LLMResponse["usage"];
}

/**
 * Model metadata
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
   * Validate API key
   */
  abstract validateApiKey(): Promise<boolean>;

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
  protected async handleRateLimit(error: any, attempt: number): Promise<void> {
    const retryAfter = error.headers?.["retry-after"];
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, attempt), 60000);

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Normalize error response
   */
  protected normalizeError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error.message || "API error");
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
```

### 2. OpenAI Provider Implementation

```typescript
// src/main/modules/ai/providers/openai-provider.ts

import axios, { AxiosInstance } from "axios";
import { LLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, ModelMetadata, ProviderMetadata } from "./base-provider";

export class OpenAIProvider extends LLMProvider {
  readonly metadata: ProviderMetadata = {
    id: "openai",
    name: "OpenAI",
    description: "ChatGPT models including GPT-4o, GPT-4.1, and more",
    website: "https://openai.com",
    documentationUrl: "https://platform.openai.com/docs",
    requiresApiKey: true,
    supportsBatch: false,
    supportsStreaming: true,
    defaultModel: "gpt-4o-mini"
  };

  private client: AxiosInstance;
  private modelCache: ModelMetadata[] | null = null;
  private modelCacheExpiry: number = 0;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    super(config);

    this.client = axios.create({
      baseURL: config.baseUrl || "https://api.openai.com/v1",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    });
  }

  async initialize(): Promise<void> {
    await this.validateApiKey();
    await this.listModels(); // Warm up cache
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.get("/models");
      return true;
    } catch (error) {
      throw new Error("Invalid OpenAI API key");
    }
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const response = await this.client.post("/chat/completions", {
          model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 500,
          top_p: request.topP ?? 1.0,
          tools: request.tools?.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }
          }))
        });

        const latencyMs = Date.now() - startTime;
        const choice = response.data.choices[0];
        const usage = response.data.usage;

        // Calculate cost
        const modelMeta = await this.getModel(model);
        const inputCost = (usage.prompt_tokens / 1_000_000) * (modelMeta?.pricing.inputCostPerMillion || 0);
        const outputCost = (usage.completion_tokens / 1_000_000) * (modelMeta?.pricing.outputCostPerMillion || 0);

        return {
          id: response.data.id,
          model: response.data.model,
          content: choice.message.content || "",
          finishReason: this.normalizeFinishReason(choice.finish_reason),
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens
          },
          cost: {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost
          },
          latencyMs,
          toolCalls: choice.message.tool_calls?.map((tc: any) => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments)
          }))
        };
      } catch (error: any) {
        if (error.response?.status === 429 && attempt < maxAttempts - 1) {
          await this.handleRateLimit(error, attempt);
          attempt++;
          continue;
        }
        throw this.normalizeError(error);
      }
    }

    throw new Error("Max retry attempts exceeded");
  }

  async *stream(request: LLMRequest, model: string): AsyncGenerator<LLMStreamChunk> {
    const response = await this.client.post(
      "/chat/completions",
      {
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 500,
        stream: true
      },
      {
        responseType: "stream"
      }
    );

    let buffer = "";

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { delta: "", isComplete: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta?.content || "";
            yield { delta, isComplete: false };
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async listModels(): Promise<ModelMetadata[]> {
    // Check cache
    if (this.modelCache && Date.now() < this.modelCacheExpiry) {
      return this.modelCache;
    }

    try {
      const response = await this.client.get("/models");
      const models = response.data.data;

      // Filter to chat models and add metadata
      this.modelCache = models.filter((m: any) => m.id.includes("gpt")).map((m: any) => this.buildModelMetadata(m));

      this.modelCacheExpiry = Date.now() + 3600000; // 1 hour cache
      return this.modelCache;
    } catch (error) {
      // Fallback to hardcoded models if API fails
      return this.getHardcodedModels();
    }
  }

  private buildModelMetadata(apiModel: any): ModelMetadata {
    const modelId = apiModel.id;

    // Define pricing and metadata for known models
    const modelConfigs: Record<string, Partial<ModelMetadata>> = {
      "gpt-4o": {
        name: "GPT-4o",
        description: "Most capable GPT-4 model, optimized for chat",
        contextWindow: 128000,
        pricing: {
          inputCostPerMillion: 3,
          outputCostPerMillion: 10,
          cacheCostPerMillion: 1.5,
          cacheDiscountPercent: 50
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: false
        },
        limits: {
          maxTokensPerRequest: 16384,
          requestsPerMinute: 500,
          tokensPerMinute: 500000
        },
        tags: ["recommended", "powerful", "vision"]
      },
      "gpt-4o-mini": {
        name: "GPT-4o Mini",
        description: "Affordable and intelligent small model for fast tasks",
        contextWindow: 128000,
        pricing: {
          inputCostPerMillion: 0.15,
          outputCostPerMillion: 0.6
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: false
        },
        limits: {
          maxTokensPerRequest: 16384,
          requestsPerMinute: 500,
          tokensPerMinute: 2000000
        },
        tags: ["recommended", "budget", "fast"]
      },
      "gpt-4-turbo": {
        name: "GPT-4 Turbo",
        description: "Previous generation GPT-4",
        contextWindow: 128000,
        pricing: {
          inputCostPerMillion: 10,
          outputCostPerMillion: 30
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: false
        },
        limits: {
          maxTokensPerRequest: 4096,
          requestsPerMinute: 500,
          tokensPerMinute: 500000
        },
        tags: []
      },
      "gpt-4.1": {
        name: "GPT-4.1",
        description: "Extended 1M context window with prompt caching",
        contextWindow: 1000000,
        pricing: {
          inputCostPerMillion: 15,
          outputCostPerMillion: 60,
          cacheCostPerMillion: 3.75,
          cacheDiscountPercent: 75
        },
        capabilities: {
          vision: false,
          functionCalling: true,
          streaming: true,
          batchProcessing: false
        },
        limits: {
          maxTokensPerRequest: 16384,
          requestsPerMinute: 100,
          tokensPerMinute: 1000000
        },
        tags: ["powerful", "extended-context"]
      },
      "gpt-4.1-nano": {
        name: "GPT-4.1 Nano",
        description: "Budget-friendly 1M context model",
        contextWindow: 1000000,
        pricing: {
          inputCostPerMillion: 0.3,
          outputCostPerMillion: 1.2,
          cacheCostPerMillion: 0.075,
          cacheDiscountPercent: 75
        },
        capabilities: {
          vision: false,
          functionCalling: true,
          streaming: true,
          batchProcessing: false
        },
        limits: {
          maxTokensPerRequest: 16384,
          requestsPerMinute: 500,
          tokensPerMinute: 2000000
        },
        tags: ["recommended", "budget", "extended-context"]
      }
    };

    const config = modelConfigs[modelId] || {};

    return {
      id: modelId,
      provider: this.metadata.id,
      name: config.name || modelId,
      description: config.description || "",
      contextWindow: config.contextWindow || 8192,
      pricing: config.pricing || {
        inputCostPerMillion: 0,
        outputCostPerMillion: 0
      },
      capabilities: config.capabilities || {
        vision: false,
        functionCalling: false,
        streaming: false,
        batchProcessing: false
      },
      limits: config.limits || {
        maxTokensPerRequest: 4096,
        requestsPerMinute: 60,
        tokensPerMinute: 60000
      },
      tags: config.tags || []
    };
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    const models = await this.listModels();
    return models.find((m) => m.id === modelId) || null;
  }

  private getHardcodedModels(): ModelMetadata[] {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4.1", "gpt-4.1-nano"].map((id) =>
      this.buildModelMetadata({ id })
    );
  }

  private normalizeFinishReason(reason: string): LLMResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "tool_calls":
        return "tool_calls";
      default:
        return "stop";
    }
  }
}
```

### 3. Anthropic Provider Implementation

```typescript
// src/main/modules/ai/providers/anthropic-provider.ts

import axios, { AxiosInstance } from "axios";
import { LLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, ModelMetadata, ProviderMetadata } from "./base-provider";

export class AnthropicProvider extends LLMProvider {
  readonly metadata: ProviderMetadata = {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude AI models by Anthropic",
    website: "https://anthropic.com",
    documentationUrl: "https://docs.anthropic.com",
    requiresApiKey: true,
    supportsBatch: true,
    supportsStreaming: true,
    defaultModel: "claude-3-5-sonnet-20241022"
  };

  private client: AxiosInstance;
  private modelCache: ModelMetadata[] | null = null;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    super(config);

    this.client = axios.create({
      baseURL: config.baseUrl || "https://api.anthropic.com/v1",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      timeout: 60000
    });
  }

  async initialize(): Promise<void> {
    await this.validateApiKey();
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.post("/messages", {
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }]
      });
      return true;
    } catch (error) {
      throw new Error("Invalid Anthropic API key");
    }
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = 3;

    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === "system");
    const userMessages = request.messages.filter((m) => m.role !== "system");

    while (attempt < maxAttempts) {
      try {
        const response = await this.client.post("/messages", {
          model,
          max_tokens: request.maxTokens ?? 500,
          temperature: request.temperature ?? 0.7,
          top_p: request.topP ?? 1.0,
          system: systemMessage?.content,
          messages: userMessages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content
          })),
          tools: request.tools?.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters
          }))
        });

        const latencyMs = Date.now() - startTime;
        const usage = response.data.usage;

        // Calculate cost
        const modelMeta = await this.getModel(model);
        const inputCost = (usage.input_tokens / 1_000_000) * (modelMeta?.pricing.inputCostPerMillion || 0);
        const outputCost = (usage.output_tokens / 1_000_000) * (modelMeta?.pricing.outputCostPerMillion || 0);

        // Extract text content
        const textContent = response.data.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("");

        // Extract tool calls
        const toolUse = response.data.content.filter((c: any) => c.type === "tool_use");

        return {
          id: response.data.id,
          model: response.data.model,
          content: textContent,
          finishReason: this.normalizeFinishReason(response.data.stop_reason),
          usage: {
            promptTokens: usage.input_tokens,
            completionTokens: usage.output_tokens,
            totalTokens: usage.input_tokens + usage.output_tokens
          },
          cost: {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost
          },
          latencyMs,
          toolCalls: toolUse.map((tu: any) => ({
            name: tu.name,
            arguments: tu.input
          }))
        };
      } catch (error: any) {
        if (error.response?.status === 429 && attempt < maxAttempts - 1) {
          await this.handleRateLimit(error, attempt);
          attempt++;
          continue;
        }
        throw this.normalizeError(error);
      }
    }

    throw new Error("Max retry attempts exceeded");
  }

  async *stream(request: LLMRequest, model: string): AsyncGenerator<LLMStreamChunk> {
    const systemMessage = request.messages.find((m) => m.role === "system");
    const userMessages = request.messages.filter((m) => m.role !== "system");

    const response = await this.client.post(
      "/messages",
      {
        model,
        max_tokens: request.maxTokens ?? 500,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: userMessages,
        stream: true
      },
      {
        responseType: "stream"
      }
    );

    let buffer = "";

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          const event = line.slice(7);
          continue; // Process event type if needed
        }

        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              yield { delta: parsed.delta.text, isComplete: false };
            } else if (parsed.type === "message_stop") {
              yield { delta: "", isComplete: true };
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async listModels(): Promise<ModelMetadata[]> {
    // Anthropic doesn't have a models endpoint, return hardcoded list
    if (!this.modelCache) {
      this.modelCache = this.getHardcodedModels();
    }
    return this.modelCache;
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    const models = await this.listModels();
    return models.find((m) => m.id === modelId) || null;
  }

  private getHardcodedModels(): ModelMetadata[] {
    const models: Array<Partial<ModelMetadata> & { id: string }> = [
      {
        id: "claude-sonnet-4-5-20250514",
        name: "Claude Sonnet 4.5",
        description: "Most capable Claude model (May 2025)",
        contextWindow: 200000,
        pricing: {
          inputCostPerMillion: 3,
          outputCostPerMillion: 15,
          cacheCostPerMillion: 0.3,
          cacheDiscountPercent: 90
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: true
        },
        limits: {
          maxTokensPerRequest: 8192,
          requestsPerMinute: 50,
          tokensPerMinute: 40000
        },
        tags: ["recommended", "powerful", "vision"]
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        description: "Balanced intelligence and speed",
        contextWindow: 200000,
        pricing: {
          inputCostPerMillion: 3,
          outputCostPerMillion: 15,
          cacheCostPerMillion: 0.3,
          cacheDiscountPercent: 90
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: true
        },
        limits: {
          maxTokensPerRequest: 8192,
          requestsPerMinute: 50,
          tokensPerMinute: 40000
        },
        tags: ["balanced", "vision"]
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        description: "Fast and affordable",
        contextWindow: 200000,
        pricing: {
          inputCostPerMillion: 0.8,
          outputCostPerMillion: 4,
          cacheCostPerMillion: 0.08,
          cacheDiscountPercent: 90
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: true
        },
        limits: {
          maxTokensPerRequest: 8192,
          requestsPerMinute: 50,
          tokensPerMinute: 50000
        },
        tags: ["recommended", "budget", "fast"]
      },
      {
        id: "claude-opus-4-1-20250514",
        name: "Claude Opus 4.1",
        description: "Most powerful for complex tasks",
        contextWindow: 200000,
        pricing: {
          inputCostPerMillion: 15,
          outputCostPerMillion: 75,
          cacheCostPerMillion: 1.5,
          cacheDiscountPercent: 90
        },
        capabilities: {
          vision: true,
          functionCalling: true,
          streaming: true,
          batchProcessing: true
        },
        limits: {
          maxTokensPerRequest: 4096,
          requestsPerMinute: 50,
          tokensPerMinute: 20000
        },
        tags: ["powerful", "vision"]
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "Cheapest option for simple tasks",
        contextWindow: 200000,
        pricing: {
          inputCostPerMillion: 0.25,
          outputCostPerMillion: 1.25
        },
        capabilities: {
          vision: false,
          functionCalling: true,
          streaming: true,
          batchProcessing: true
        },
        limits: {
          maxTokensPerRequest: 4096,
          requestsPerMinute: 50,
          tokensPerMinute: 50000
        },
        tags: ["budget"]
      }
    ];

    return models.map(
      (m) =>
        ({
          ...m,
          provider: this.metadata.id
        }) as ModelMetadata
    );
  }

  private normalizeFinishReason(reason: string): LLMResponse["finishReason"] {
    switch (reason) {
      case "end_turn":
        return "stop";
      case "max_tokens":
        return "length";
      case "tool_use":
        return "tool_calls";
      default:
        return "stop";
    }
  }
}
```

### 4. Provider Registry

```typescript
// src/main/modules/ai/provider-registry.ts

import { LLMProvider, ProviderMetadata, ModelMetadata } from "./providers/base-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { AnthropicProvider } from "./providers/anthropic-provider";

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private settings: Map<string, { apiKey?: string; baseUrl?: string }> = new Map();

  /**
   * Register a provider
   */
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.metadata.id, provider);
  }

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
   * Configure a provider (set API key, etc.)
   */
  async configureProvider(providerId: string, config: { apiKey?: string; baseUrl?: string }): Promise<void> {
    this.settings.set(providerId, config);

    // Recreate provider with new config
    const provider = await this.createProvider(providerId, config);
    if (provider) {
      this.providers.set(providerId, provider);
      await provider.initialize();
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
   * Initialize all default providers
   */
  async initializeDefaults(): Promise<void> {
    // Register providers with empty configs (will need API keys later)
    const openai = await this.createProvider("openai", {});
    const anthropic = await this.createProvider("anthropic", {});

    if (openai) this.providers.set("openai", openai);
    if (anthropic) this.providers.set("anthropic", anthropic);
  }

  /**
   * Create provider instance
   */
  private async createProvider(
    providerId: string,
    config: { apiKey?: string; baseUrl?: string }
  ): Promise<LLMProvider | null> {
    switch (providerId) {
      case "openai":
        if (!config.apiKey) return null;
        return new OpenAIProvider(config as { apiKey: string });

      case "anthropic":
        if (!config.apiKey) return null;
        return new AnthropicProvider(config as { apiKey: string });

      default:
        console.warn(`Unknown provider: ${providerId}`);
        return null;
    }
  }
}
```

### 5. Updated AI Service

```typescript
// src/main/modules/ai-service.ts

import { ProviderRegistry } from "./ai/provider-registry";
import { LLMRequest, LLMResponse, ModelMetadata } from "./ai/providers/base-provider";

export class AIService {
  private registry: ProviderRegistry;
  private currentProvider: string = "openai";
  private currentModel: string = "gpt-4o-mini";

  constructor() {
    this.registry = new ProviderRegistry();
  }

  async initialize(settings: AISettings): Promise<void> {
    await this.registry.initializeDefaults();

    // Configure active provider
    if (settings.enabled && settings.apiKey) {
      await this.registry.configureProvider(settings.provider, {
        apiKey: settings.apiKey
      });

      this.currentProvider = settings.provider;
      this.currentModel = settings.model || this.getDefaultModel(settings.provider);
    }
  }

  /**
   * Analyze a bookmark using the configured model
   */
  async analyzeBookmark(title: string, url: string, content?: string): Promise<BookmarkAnalysis> {
    const provider = this.registry.getProvider(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not configured`);
    }

    const request: LLMRequest = {
      messages: [
        {
          role: "system",
          content: "You are a bookmark categorization assistant. Analyze bookmarks and suggest relevant labels."
        },
        {
          role: "user",
          content: `Analyze this bookmark and suggest categorization labels:

Title: ${title}
URL: ${url}
${content ? `Content: ${content.substring(0, 1000)}...` : ""}

Respond with JSON containing:
- labels: Array of { label: string, category: string, confidence: number }
- summary: Brief description of the bookmark`
        }
      ],
      temperature: 0.3,
      maxTokens: 500
    };

    const response = await provider.complete(request, this.currentModel);

    // Parse JSON response
    try {
      const result = JSON.parse(response.content);
      return {
        labels: result.labels || [],
        summary: result.summary || "",
        cost: response.cost.totalCost,
        modelUsed: response.model
      };
    } catch (error) {
      throw new Error("Failed to parse AI response");
    }
  }

  /**
   * List available providers
   */
  async listProviders(): Promise<Array<{ id: string; name: string; description: string }>> {
    const providers = this.registry.listProviders();
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description
    }));
  }

  /**
   * List available models for a provider
   */
  async listModels(providerId?: string): Promise<ModelMetadata[]> {
    if (providerId) {
      return this.registry.getProviderModels(providerId);
    }
    return this.registry.listAllModels();
  }

  /**
   * Test API connection for a provider
   */
  async testConnection(
    providerId: string,
    apiKey: string
  ): Promise<{ success: boolean; models?: ModelMetadata[]; error?: string }> {
    try {
      await this.registry.configureProvider(providerId, { apiKey });
      const models = await this.registry.getProviderModels(providerId);

      return {
        success: true,
        models
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Estimate cost for analyzing bookmarks
   */
  async estimateCost(
    bookmarkCount: number,
    model?: string
  ): Promise<{ inputCost: number; outputCost: number; totalCost: number }> {
    const provider = this.registry.getProvider(this.currentProvider);
    if (!provider) {
      throw new Error("No provider configured");
    }

    // Average bookmark analysis: ~200 input tokens, ~150 output tokens
    const avgInputTokens = 200;
    const avgOutputTokens = 150;

    const modelMeta = await provider.getModel(model || this.currentModel);
    if (!modelMeta) {
      throw new Error("Model not found");
    }

    const inputCost = ((avgInputTokens * bookmarkCount) / 1_000_000) * modelMeta.pricing.inputCostPerMillion;
    const outputCost = ((avgOutputTokens * bookmarkCount) / 1_000_000) * modelMeta.pricing.outputCostPerMillion;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case "openai":
        return "gpt-4o-mini";
      case "anthropic":
        return "claude-3-5-sonnet-20241022";
      default:
        return "";
    }
  }
}

interface AISettings {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey?: string;
}

interface BookmarkAnalysis {
  labels: Array<{
    label: string;
    category: string;
    confidence: number;
  }>;
  summary: string;
  cost: number;
  modelUsed: string;
}
```

---

## Implementation Plan

### Phase 1: Provider Abstraction

**Goal**: Create the base provider interface and OpenAI implementation

**Tasks**:

1. Create `base-provider.ts` with abstract class and interfaces
2. Implement `OpenAIProvider` with complete/stream/listModels
3. Add comprehensive error handling and rate limiting
4. Write unit tests for provider abstraction
5. Test with real OpenAI API calls

**Deliverables**:

- Working OpenAI provider with all methods
- Test suite covering happy paths and error cases
- Documentation for provider interface

### Phase 2: Anthropic Implementation

**Goal**: Add Anthropic Claude support with same interface

**Tasks**:

1. Implement `AnthropicProvider` following same pattern
2. Handle API differences (system messages, streaming format)
3. Add Anthropic-specific error handling
4. Write unit tests for Anthropic provider
5. Test with real Anthropic API calls

**Deliverables**:

- Working Anthropic provider
- Comparison tests between providers
- Documentation for provider-specific quirks

### Phase 3: Provider Registry

**Goal**: Create centralized provider management

**Tasks**:

1. Implement `ProviderRegistry` class
2. Add provider configuration/initialization logic
3. Implement model listing and discovery
4. Add provider selection logic
5. Write integration tests

**Deliverables**:

- ProviderRegistry with full provider lifecycle
- Tests for provider switching
- Documentation for registry usage

### Phase 4: AI Service Integration

**Goal**: Update AIService to use provider abstraction

**Tasks**:

1. Refactor `AIService` to use ProviderRegistry
2. Update `analyzeBookmark` to work with any provider
3. Add cost estimation and tracking
4. Update IPC handlers for new methods
5. Write integration tests

**Deliverables**:

- Updated AIService using providers
- Backward compatibility maintained
- E2E tests for bookmark analysis

### Phase 5: Dynamic Model Discovery

**Goal**: Fetch available models from APIs at runtime

**Tasks**:

1. Implement model caching with expiry
2. Add `/v1/models` API calls for OpenAI
3. Create hardcoded fallback for Anthropic
4. Add model metadata with pricing
5. Test model discovery and caching

**Deliverables**:

- Dynamic model lists from APIs
- Cached model data for performance
- Fallback mechanisms for API failures

### Phase 6: UI Integration

**Goal**: Update settings UI to use dynamic providers/models

**Tasks**:

1. Update `AISettings` component to fetch providers
2. Replace hardcoded models with API-fetched data
3. Add model metadata display (pricing, capabilities)
4. Implement provider switching with validation
5. Add connection testing UI

**Deliverables**:

- Dynamic provider/model selection UI
- Model comparison features
- Cost estimation display

### Phase 7: Testing & Polish

**Goal**: Comprehensive testing and performance optimization

**Tasks**:

1. E2E tests for full user workflows
2. Performance testing with large batches
3. Error recovery testing
4. Rate limiting validation
5. Documentation and code cleanup

**Deliverables**:

- Complete test suite
- Performance benchmarks
- User documentation
- API documentation

---

## Migration Strategy

### From Current to New System

**Current State**:

- Hardcoded model options in UI
- Direct API calls in AIService
- Limited error handling
- No provider abstraction

**Migration Steps**:

1. **Parallel Implementation** (No Breaking Changes):

   ```typescript
   // Keep existing methods working
   async analyzeBookmark_OLD(/* ... */) { /* existing code */ }

   // Add new provider-based methods
   async analyzeBookmark(/* ... */) { /* new code */ }
   ```

2. **Gradual UI Migration**:
   - Phase 1: Keep hardcoded models as fallback
   - Phase 2: Fetch models from API, merge with hardcoded
   - Phase 3: Remove hardcoded models entirely

3. **Settings Migration**:

   ```typescript
   // Old settings
   interface OldAISettings {
     provider: "openai" | "claude" | "local";
     model: string; // e.g., 'gpt-4o'
   }

   // New settings (backward compatible)
   interface NewAISettings extends OldAISettings {
     // Same fields, but validated against provider registry
   }
   ```

4. **Data Migration**:
   - No database changes needed
   - Settings stored in same format
   - Model IDs remain stable

5. **Rollback Plan**:
   - Keep old code paths for 1-2 releases
   - Feature flag for new provider system
   - Easy toggle back to hardcoded models

---

## Testing Strategy

### Unit Tests

```typescript
// Test provider interface
describe("LLMProvider", () => {
  it("should normalize requests across providers", async () => {
    const request: LLMRequest = {
      /* ... */
    };

    const openaiResponse = await openaiProvider.complete(request, "gpt-4o");
    const claudeResponse = await anthropicProvider.complete(request, "claude-3-5-sonnet");

    // Both responses should have same structure
    expect(openaiResponse).toMatchObject({
      id: expect.any(String),
      content: expect.any(String),
      usage: expect.any(Object)
    });
    expect(claudeResponse).toMatchObject({
      id: expect.any(String),
      content: expect.any(String),
      usage: expect.any(Object)
    });
  });

  it("should handle rate limiting with retry", async () => {
    mockApiToReturn429(); // Mock 429 response

    const response = await provider.complete(request, model);

    // Should succeed after retry
    expect(response).toBeDefined();
    expect(mockApi.callCount).toBeGreaterThan(1);
  });
});
```

### Integration Tests

```typescript
// Test provider registry
describe("ProviderRegistry", () => {
  it("should list models from all providers", async () => {
    const registry = new ProviderRegistry();
    await registry.configureProvider("openai", { apiKey: OPENAI_KEY });
    await registry.configureProvider("anthropic", { apiKey: ANTHROPIC_KEY });

    const models = await registry.listAllModels();

    expect(models.length).toBeGreaterThan(5);
    expect(models.some((m) => m.provider === "openai")).toBe(true);
    expect(models.some((m) => m.provider === "anthropic")).toBe(true);
  });
});
```

### E2E Tests

```typescript
// Test full bookmark analysis workflow
describe("Bookmark Analysis E2E", () => {
  it("should analyze bookmark with OpenAI", async () => {
    await flow.ai["ai:updateSettings"]({
      enabled: true,
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: OPENAI_KEY
    });

    const result = await flow.ai["ai:analyzeBookmarks"]([{ title: "React Documentation", url: "https://react.dev" }]);

    expect(result.success).toBe(true);
    expect(result.data[0].labels.length).toBeGreaterThan(0);
  });

  it("should switch providers without error", async () => {
    // Start with OpenAI
    await flow.ai["ai:updateSettings"]({ provider: "openai" });
    const result1 = await flow.ai["ai:analyzeBookmarks"]([bookmark]);

    // Switch to Anthropic
    await flow.ai["ai:updateSettings"]({ provider: "anthropic" });
    const result2 = await flow.ai["ai:analyzeBookmarks"]([bookmark]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });
});
```

### Performance Tests

```typescript
describe("Performance", () => {
  it("should handle 100 bookmarks in under 60 seconds", async () => {
    const bookmarks = generateTestBookmarks(100);
    const startTime = Date.now();

    await flow.ai["ai:analyzeBookmarks"](bookmarks, {
      batchSize: 10,
      concurrency: 3
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(60000);
  });

  it("should cache model lists for 1 hour", async () => {
    await provider.listModels(); // First call
    const start = Date.now();
    await provider.listModels(); // Second call (should be cached)
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10); // Should be instant from cache
  });
});
```

---

## Security Considerations

### API Key Management

**Current Issues**:

- API keys stored in plain text in settings
- Keys visible in logs
- No key rotation support

**Improvements**:

1. **Encrypted Storage**:

   ```typescript
   import { safeStorage } from "electron";

   function encryptApiKey(key: string): string {
     return safeStorage.encryptString(key).toString("base64");
   }

   function decryptApiKey(encrypted: string): string {
     const buffer = Buffer.from(encrypted, "base64");
     return safeStorage.decryptString(buffer);
   }
   ```

2. **Key Validation**:

   ```typescript
   async validateApiKey(provider: string, key: string): Promise<boolean> {
     // Test with minimal API call
     try {
       await provider.testConnection(key);
       return true;
     } catch (error) {
       return false;
     }
   }
   ```

3. **Key Rotation**:

   ```typescript
   interface ApiKeyHistory {
     keys: Array<{
       key: string;
       createdAt: Date;
       lastUsed: Date;
       isActive: boolean;
     }>;
   }
   ```

4. **Environment Variables** (Development):
   ```bash
   # .env.local
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### Error Message Sanitization

**Before**:

```typescript
throw new Error(`API call failed: ${error.response.data}`);
// Leaks: API key in URL, sensitive data
```

**After**:

```typescript
function sanitizeError(error: any): Error {
  // Remove sensitive data
  const message = error.message?.replace(/sk-[a-zA-Z0-9-]+/g, "sk-***")?.replace(/Bearer .+/g, "Bearer ***");

  return new Error(message || "API request failed");
}
```

### Rate Limiting Per Key

```typescript
class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();

  async checkLimit(apiKey: string, tokens: number): Promise<boolean> {
    const keyHash = this.hashKey(apiKey);
    let bucket = this.buckets.get(keyHash);

    if (!bucket) {
      bucket = new TokenBucket({
        capacity: 10000,
        refillRate: 100 // tokens per second
      });
      this.buckets.set(keyHash, bucket);
    }

    return bucket.consume(tokens);
  }

  private hashKey(key: string): string {
    // Hash for privacy, don't store raw keys
    return crypto.createHash("sha256").update(key).digest("hex");
  }
}
```

---

## Performance Considerations

### 1. Response Caching

```typescript
class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map();
  private ttl: number = 3600000; // 1 hour

  private getCacheKey(request: LLMRequest, model: string): string {
    return crypto.createHash("md5").update(JSON.stringify({ request, model })).digest("hex");
  }

  async get(request: LLMRequest, model: string): Promise<LLMResponse | null> {
    const key = this.getCacheKey(request, model);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return { ...cached.response, cached: true };
    }

    return null;
  }

  set(request: LLMRequest, model: string, response: LLMResponse): void {
    const key = this.getCacheKey(request, model);
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });

    // Clean old entries
    this.cleanup();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 2. Request Batching

```typescript
class BatchProcessor {
  private queue: Array<{
    request: LLMRequest;
    resolve: (response: LLMResponse) => void;
    reject: (error: Error) => void;
  }> = [];

  private batchSize = 10;
  private batchDelay = 100; // ms
  private timer: NodeJS.Timeout | null = null;

  async process(request: LLMRequest): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });

      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.batchSize);

    // Process batch in parallel
    await Promise.all(
      batch.map(async ({ request, resolve, reject }) => {
        try {
          const response = await provider.complete(request, model);
          resolve(response);
        } catch (error) {
          reject(error as Error);
        }
      })
    );
  }
}
```

### 3. Prompt Caching (Provider-Specific)

**OpenAI**:

```typescript
// Automatically enabled, no code changes needed
// Cache key based on prompt prefix
```

**Anthropic**:

```typescript
async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
  const response = await this.client.post('/messages', {
    model,
    // Enable prompt caching
    headers: {
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    system: [
      {
        type: 'text',
        text: 'System prompt...',
        cache_control: { type: 'ephemeral' } // Cache this
      }
    ],
    messages: request.messages
  });
}
```

### 4. Cost Optimization

```typescript
class CostOptimizer {
  /**
   * Select cheapest model that meets requirements
   */
  async selectModel(requirements: {
    minContextWindow?: number;
    needsVision?: boolean;
    needsFunctionCalling?: boolean;
    maxCostPer1K?: number;
  }): Promise<ModelMetadata> {
    const models = await registry.listAllModels();

    const suitable = models.filter((m) => {
      if (requirements.minContextWindow && m.contextWindow < requirements.minContextWindow) {
        return false;
      }
      if (requirements.needsVision && !m.capabilities.vision) {
        return false;
      }
      if (requirements.needsFunctionCalling && !m.capabilities.functionCalling) {
        return false;
      }

      const costPer1K = m.pricing.inputCostPerMillion / 1000 + m.pricing.outputCostPerMillion / 1000;
      if (requirements.maxCostPer1K && costPer1K > requirements.maxCostPer1K) {
        return false;
      }

      return true;
    });

    // Sort by cost (cheapest first)
    suitable.sort((a, b) => {
      const costA = a.pricing.inputCostPerMillion + a.pricing.outputCostPerMillion;
      const costB = b.pricing.inputCostPerMillion + b.pricing.outputCostPerMillion;
      return costA - costB;
    });

    return suitable[0];
  }
}
```

---

## Future Extensibility

### Adding Google Gemini

```typescript
// src/main/modules/ai/providers/gemini-provider.ts

export class GeminiProvider extends LLMProvider {
  readonly metadata: ProviderMetadata = {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s multimodal AI models',
    website: 'https://ai.google.dev',
    documentationUrl: 'https://ai.google.dev/docs',
    requiresApiKey: true,
    supportsBatch: false,
    supportsStreaming: true,
    defaultModel: 'gemini-pro'
  };

  // Implement abstract methods...
}

// Register in provider-registry.ts
case 'gemini':
  return new GeminiProvider(config as { apiKey: string });
```

### Adding Local Models (Ollama)

```typescript
// src/main/modules/ai/providers/local-provider.ts

export class LocalProvider extends LLMProvider {
  readonly metadata: ProviderMetadata = {
    id: "local",
    name: "Local Models",
    description: "Run models locally via Ollama",
    website: "https://ollama.ai",
    documentationUrl: "https://github.com/jmorganca/ollama",
    requiresApiKey: false,
    supportsBatch: false,
    supportsStreaming: true,
    defaultModel: "llama2"
  };

  constructor(config: { baseUrl?: string }) {
    super({ baseUrl: config.baseUrl || "http://localhost:11434" });
  }

  // Implement with Ollama API
  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model,
      prompt: this.formatPrompt(request.messages),
      stream: false
    });

    // Normalize Ollama response to LLMResponse
    return this.normalizeResponse(response.data);
  }
}
```

### Plugin Architecture

```typescript
// Allow users to add custom providers

interface ProviderPlugin {
  name: string;
  version: string;
  provider: new (config: any) => LLMProvider;
}

class PluginManager {
  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = (await import(pluginPath)) as ProviderPlugin;

    // Validate plugin interface
    if (!this.validatePlugin(plugin)) {
      throw new Error("Invalid plugin format");
    }

    // Register provider class
    registry.registerProviderClass(plugin.name, plugin.provider);
  }
}
```

### Model Capability Detection

```typescript
interface ModelCapabilities {
  vision: boolean;
  functionCalling: boolean;
  streaming: boolean;
  jsonMode: boolean;
  batchProcessing: boolean;
  computerUse?: boolean; // Anthropic-specific
}

async function detectCapabilities(provider: LLMProvider, model: string): Promise<ModelCapabilities> {
  // Test each capability
  const capabilities: ModelCapabilities = {
    vision: await testVision(provider, model),
    functionCalling: await testFunctionCalling(provider, model),
    streaming: await testStreaming(provider, model),
    jsonMode: await testJsonMode(provider, model),
    batchProcessing: false // Detect from provider metadata
  };

  return capabilities;
}
```

---

## Code Examples

### Using the Provider System

```typescript
// 1. Initialize registry
const registry = new ProviderRegistry();
await registry.initializeDefaults();

// 2. Configure a provider
await registry.configureProvider("openai", {
  apiKey: "sk-..."
});

// 3. List available models
const models = await registry.getProviderModels("openai");
console.log(models.map((m) => `${m.name}: $${m.pricing.inputCostPerMillion}/M`));

// 4. Use a model
const provider = registry.getProvider("openai");
const response = await provider.complete(
  {
    messages: [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Analyze this bookmark..." }
    ],
    temperature: 0.7,
    maxTokens: 500
  },
  "gpt-4o-mini"
);

console.log("Response:", response.content);
console.log("Cost:", response.cost.totalCost);
console.log("Tokens:", response.usage.totalTokens);
```

### Switching Providers

```typescript
// Easy provider switching
async function analyzeWithBestPrice(bookmark: Bookmark): Promise<Analysis> {
  // Get all models sorted by cost
  const models = await registry.listAllModels();
  models.sort(
    (a, b) =>
      a.pricing.inputCostPerMillion +
      a.pricing.outputCostPerMillion -
      (b.pricing.inputCostPerMillion + b.pricing.outputCostPerMillion)
  );

  // Try cheapest first
  for (const model of models) {
    try {
      const provider = registry.getProvider(model.provider);
      if (!provider) continue;

      const result = await provider.complete(
        {
          messages: [
            /* ... */
          ]
        },
        model.id
      );

      return parseAnalysis(result);
    } catch (error) {
      console.error(`Failed with ${model.name}, trying next...`);
    }
  }

  throw new Error("All providers failed");
}
```

### Streaming Responses

```typescript
async function streamAnalysis(bookmark: Bookmark): Promise<void> {
  const provider = registry.getProvider("openai");

  for await (const chunk of provider.stream(
    {
      messages: [
        /* ... */
      ]
    },
    "gpt-4o-mini"
  )) {
    if (chunk.isComplete) {
      console.log("\nComplete!");
      if (chunk.usage) {
        console.log("Tokens used:", chunk.usage.totalTokens);
      }
    } else {
      process.stdout.write(chunk.delta);
    }
  }
}
```

---

## Updated UI Integration

### Settings Component

```typescript
// src/renderer/src/components/ai/ai-settings.tsx

export const AISettingsComponent: React.FC = () => {
  const [providers, setProviders] = useState<ProviderMetadata[]>([]);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    const result = await flow.ai['ai:listProviders']();
    if (result.success) {
      setProviders(result.data);
    }
  };

  // Load models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      loadModels(selectedProvider);
    }
  }, [selectedProvider]);

  const loadModels = async (providerId: string) => {
    const result = await flow.ai['ai:listModels'](providerId);
    if (result.success) {
      setModels(result.data);

      // Auto-select recommended model
      const recommended = result.data.find(m => m.tags.includes('recommended'));
      if (recommended) {
        setSelectedModel(recommended.id);
      }
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>AI Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {provider.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        {models.length > 0 && (
          <div className="space-y-2 mt-4">
            <Label>Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {model.description}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {model.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-muted-foreground">Input</div>
                        <div className="font-mono">
                          ${model.pricing.inputCostPerMillion.toFixed(2)}/M
                        </div>
                        <div className="text-muted-foreground mt-1">Output</div>
                        <div className="font-mono">
                          ${model.pricing.outputCostPerMillion.toFixed(2)}/M
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model Details */}
            {selectedModel && (
              <ModelDetails model={models.find(m => m.id === selectedModel)!} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### Model Details Component

```typescript
const ModelDetails: React.FC<{ model: ModelMetadata }> = ({ model }) => {
  return (
    <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Context Window</div>
          <div className="font-medium">
            {(model.contextWindow / 1000).toFixed(0)}K tokens
          </div>
        </div>

        <div>
          <div className="text-muted-foreground">Max Output</div>
          <div className="font-medium">
            {(model.limits.maxTokensPerRequest / 1000).toFixed(0)}K tokens
          </div>
        </div>

        <div>
          <div className="text-muted-foreground">Rate Limit</div>
          <div className="font-medium">
            {model.limits.requestsPerMinute} RPM
          </div>
        </div>

        <div>
          <div className="text-muted-foreground">Est. Cost/Bookmark</div>
          <div className="font-medium">
            ${estimateBookmarkCost(model).toFixed(4)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {model.capabilities.vision && (
          <Badge variant="outline">
            <Eye className="h-3 w-3 mr-1" />
            Vision
          </Badge>
        )}
        {model.capabilities.functionCalling && (
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            Functions
          </Badge>
        )}
        {model.capabilities.streaming && (
          <Badge variant="outline">
            <Activity className="h-3 w-3 mr-1" />
            Streaming
          </Badge>
        )}
      </div>

      {model.pricing.cacheDiscountPercent && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Sparkles className="h-4 w-4" />
          <span>
            {model.pricing.cacheDiscountPercent}% discount with prompt caching
          </span>
        </div>
      )}
    </div>
  );
};

function estimateBookmarkCost(model: ModelMetadata): number {
  // Average: 200 input tokens, 150 output tokens
  const inputCost = (200 / 1_000_000) * model.pricing.inputCostPerMillion;
  const outputCost = (150 / 1_000_000) * model.pricing.outputCostPerMillion;
  return inputCost + outputCost;
}
```

---

## Conclusion

This technical specification provides a comprehensive architecture for supporting multiple LLM providers in Flow Browser. The design is:

- **Extensible**: Easy to add new providers through plugin architecture
- **Performant**: Caching, batching, and rate limiting optimize for speed and cost
- **Resilient**: Robust error handling and retry strategies ensure reliability
- **User-Friendly**: Dynamic model discovery and cost transparency empower users
- **Future-Proof**: Abstraction layer isolates application logic from provider specifics

The phased implementation plan ensures we can deliver value incrementally while maintaining stability. Starting with OpenAI and Anthropic gives us immediate support for the most popular providers, while the provider abstraction makes adding Google Gemini, local models, or custom providers straightforward.

### Next Steps

1. Review and approve this specification
2. Begin Phase 1 implementation (Provider Abstraction)
3. Set up test API keys for OpenAI and Anthropic

### Success Metrics

- **Feature Completeness**: 100% of specified functionality implemented
- **Test Coverage**: >90% code coverage with unit, integration, and E2E tests
- **Performance**: <500ms average response time for bookmark analysis
- **Reliability**: <1% error rate under normal operation
- **User Satisfaction**: Positive feedback on model selection and cost transparency
