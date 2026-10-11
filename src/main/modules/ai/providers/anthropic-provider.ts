/**
 * Anthropic Provider Implementation
 *
 * Implements the LLMProvider interface for Anthropic's Claude models.
 * Model metadata comes from the shared model catalog; the connection check
 * uses the non-billable `GET /v1/models` endpoint.
 */

import axios, { AxiosInstance } from 'axios';
import { LLMProvider, LLMRequest, LLMResponse, LLMStreamChunk, ModelMetadata, ProviderMetadata } from './base-provider';
import { getCatalogModels, getDefaultModelId } from '../model-catalog';

export class AnthropicProvider extends LLMProvider {
  readonly metadata: ProviderMetadata = {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude AI models by Anthropic',
    website: 'https://anthropic.com',
    documentationUrl: 'https://docs.anthropic.com',
    requiresApiKey: true,
    supportsBatch: true,
    supportsStreaming: true,
    defaultModel: getDefaultModelId('anthropic')
  };

  private client: AxiosInstance;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    super(config);

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
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
      return { ok: false, error: 'No API key configured' };
    }
    try {
      // Non-billable: lists models, never runs inference.
      await this.client.get('/models');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.normalizeError(error).message };
    }
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = 3;

    // Extract system message
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    while (attempt < maxAttempts) {
      try {
        // Current Claude models reject non-default temperature/top_p, so no
        // sampling parameters are sent.
        const response = await this.client.post('/messages', {
          model,
          max_tokens: request.maxTokens ?? 1000,
          system: systemMessage?.content,
          messages: userMessages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          tools: request.tools?.map(tool => ({
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
        type ContentBlock = { type: string; text?: string; name?: string; input?: Record<string, unknown> };
        const content = response.data.content as ContentBlock[];
        const textContent = content
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('');

        // Extract tool calls
        const toolUse = content.filter((c) => c.type === 'tool_use');

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
          toolCalls: toolUse.map((tu) => ({
            name: tu.name ?? '',
            arguments: tu.input ?? {}
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

    throw new Error('Max retry attempts exceeded');
  }

  async *stream(request: LLMRequest, model: string): AsyncGenerator<LLMStreamChunk> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const response = await this.client.post('/messages', {
      model,
      max_tokens: request.maxTokens ?? 1000,
      system: systemMessage?.content,
      messages: userMessages,
      stream: true
    }, {
      responseType: 'stream'
    });

    let buffer = '';

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              yield { delta: parsed.delta.text, isComplete: false };
            } else if (parsed.type === 'message_stop') {
              yield { delta: '', isComplete: true };
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async listModels(): Promise<ModelMetadata[]> {
    return getCatalogModels('anthropic');
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  private normalizeFinishReason(reason: string): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_calls';
      default: return 'stop';
    }
  }
}
