/**
 * OpenAI Provider Implementation
 *
 * Implements the LLMProvider interface for OpenAI's GPT models.
 * Model metadata comes from the shared model catalog; the connection check
 * uses the non-billable `GET /v1/models` endpoint.
 */

import axios, { AxiosInstance } from "axios";
import { LLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, ModelMetadata, ProviderMetadata } from "./base-provider";
import { getCatalogModels, getDefaultModelId } from "../model-catalog";

/**
 * Current OpenAI reasoning models (gpt-5.x / gpt-6.x families) reject
 * temperature/top_p; only legacy gpt-4-era models accept them.
 */
function supportsSamplingParams(model: string): boolean {
  return model.startsWith("gpt-4");
}

export class OpenAIProvider extends LLMProvider {
  readonly metadata: ProviderMetadata = {
    id: "openai",
    name: "OpenAI",
    description: "GPT models by OpenAI",
    website: "https://openai.com",
    documentationUrl: "https://developers.openai.com/api/docs",
    requiresApiKey: true,
    supportsBatch: true,
    supportsStreaming: true,
    defaultModel: getDefaultModelId("openai")
  };

  private client: AxiosInstance;

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
    // No network on initialization: validation happens only on an explicit
    // connection test, and the model list is served from the catalog.
  }

  async checkConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.apiKey) {
      return { ok: false, error: "No API key configured" };
    }
    try {
      // Non-billable: lists models, never runs inference.
      await this.client.get("/models");
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.normalizeError(error).message };
    }
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const sampling = supportsSamplingParams(model);

        const response = await this.client.post("/chat/completions", {
          model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          ...(sampling ? { temperature: request.temperature ?? 0.7, top_p: request.topP ?? 1.0 } : {}),
          max_completion_tokens: request.maxTokens ?? 1000,
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
          toolCalls: (
            choice.message.tool_calls as Array<{ function: { name: string; arguments: string } }> | undefined
          )?.map((tc) => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>
          }))
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429 && attempt < maxAttempts - 1) {
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
    const sampling = supportsSamplingParams(model);

    const response = await this.client.post(
      "/chat/completions",
      {
        model,
        messages: request.messages,
        ...(sampling ? { temperature: request.temperature ?? 0.7 } : {}),
        max_completion_tokens: request.maxTokens ?? 1000,
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
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async listModels(): Promise<ModelMetadata[]> {
    return getCatalogModels("openai");
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    const models = await this.listModels();
    return models.find((m) => m.id === modelId) || null;
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
