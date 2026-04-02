import { SettingsDataStore } from '@/saving/settings';
import { ProviderRegistry } from './ai/provider-registry';
import { LLMRequest } from './ai/providers/base-provider';
import type {
  AISettings,
  BookmarkAnalysisRequest,
  BookmarkLabel,
  CategoryAnalysis,
  DuplicateCandidate
} from '~/flow/interfaces/ai';

/**
 * AI Service - Refactored to use Provider Abstraction
 *
 * This service now uses the Provider Registry for unified LLM provider management.
 * Maintains full backward compatibility with existing code while enabling:
 * - Dynamic model discovery
 * - Provider switching without code changes
 * - Extensible architecture for new providers
 */
class AIService {
  private registry: ProviderRegistry;
  private settings: AISettings = {
    enabled: true,
    provider: 'openai',
    model: 'gpt-5-nano',
    autoAnalyze: false,
    confidenceThreshold: 0.7,
    autoApply: {
      enabled: false,
      maxLabels: 1,
      notifications: true,
    },
    categories: {
      topics: true,
      types: true,
      priority: false,
    }
  };
  private initialized = false;
  private initPromise: Promise<void>;

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'gpt-5-nano';
      case 'claude':
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      default:
        return 'gpt-5-nano';
    }
  }

  constructor() {
    this.registry = new ProviderRegistry();
    this.initPromise = this.loadSettings()
      .then(() => {
        this.initialized = true;
      })
      .catch((error) => {
        console.error('AIService initialization failed:', error);
        // Mark as initialized even on failure to prevent blocking
        this.initialized = true;
      });
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  private async loadSettings() {
    try {
      const savedSettings = await SettingsDataStore.get<AISettings>('ai-settings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings };
        console.log('🔧 AI Settings loaded:', this.settings);

        // Initialize registry with defaults
        await this.registry.initializeDefaults();

        // Configure the active provider if we have an API key
        if (this.settings.apiKey && this.settings.provider !== 'local') {
          const providerId = this.normalizeProviderId(this.settings.provider);
          await this.registry.configureProvider(providerId, {
            apiKey: this.settings.apiKey
          });
        }
      } else {
        console.log('🔧 No saved AI settings found, using defaults');
        await this.registry.initializeDefaults();
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      await this.registry.initializeDefaults();
    }
  }

  /**
   * Normalize provider ID to match registry (claude -> anthropic)
   */
  private normalizeProviderId(provider: string): string {
    return provider === 'claude' ? 'anthropic' : provider;
  }

  public async updateSettings(newSettings: Partial<AISettings>) {
    this.settings = { ...this.settings, ...newSettings };

    // Set default model if provider changed but no model specified
    if (newSettings.provider && !newSettings.model) {
      this.settings.model = this.getDefaultModel(newSettings.provider);
    }

    // Configure provider in registry if we have an API key
    if (this.settings.apiKey && this.settings.provider !== 'local') {
      try {
        const providerId = this.normalizeProviderId(this.settings.provider);
        await this.registry.configureProvider(providerId, {
          apiKey: this.settings.apiKey
        });
        console.log(`🔧 Configured ${providerId} provider in registry`);
      } catch (error) {
        console.error('Failed to configure provider:', error);
      }
    }

    // Save settings to persistent storage
    try {
      await SettingsDataStore.set('ai-settings', this.settings);
      console.log('🔧 AI Settings saved:', this.settings);
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    }
  }

  public async isEnabled(): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.settings.enabled) {
      return false;
    }

    if (this.settings.provider === 'local') {
      return true;
    }

    const providerId = this.normalizeProviderId(this.settings.provider);
    const provider = this.registry.getProvider(providerId);
    return provider !== null;
  }

  public async analyzeBookmark(request: BookmarkAnalysisRequest): Promise<CategoryAnalysis> {
    console.log(`AI-SERVICE: Starting bookmark analysis for "${request.title}"`);
    console.log(`AI-SERVICE: URL: ${request.url}`);
    console.log(`AI-SERVICE: Content length: ${request.content?.length || 0}`);

    await this.ensureInitialized();
    console.log(`AI-SERVICE: Provider: ${this.settings.provider}, Enabled: ${this.settings.enabled}`);

    if (!(await this.isEnabled())) {
      console.error('AI-SERVICE: AI service is not enabled or configured');
      throw new Error('AI service is not enabled or configured');
    }

    // Use local analysis if local provider is selected
    if (this.settings.provider === 'local') {
      console.log('AI-SERVICE: Using local analysis');
      return this.analyzeLocally(request);
    }

    // Use provider abstraction for API-based analysis
    const providerId = this.normalizeProviderId(this.settings.provider);
    const provider = this.registry.getProvider(providerId);

    if (!provider) {
      console.error(`AI-SERVICE: Provider ${providerId} not configured`);
      throw new Error(`Provider ${providerId} not configured`);
    }

    console.log(`AI-SERVICE: Using ${providerId} provider for analysis`);

    try {
      const prompt = this.buildAnalysisPrompt(request);
      const model = this.settings.model || this.getDefaultModel(this.settings.provider);

      // Determine max tokens based on model type
      const isNanoModel = model.includes('nano');
      const maxTokens = isNanoModel ? 5000 : 500;

      console.log(`AI-SERVICE: Model: ${model}, Max tokens: ${maxTokens}`);

      const llmRequest: LLMRequest = {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: maxTokens
      };

      console.log('AI-SERVICE: Sending request to provider...');
      const startTime = Date.now();
      const response = await provider.complete(llmRequest, model);
      const duration = Date.now() - startTime;

      console.log(`AI-SERVICE: Provider request completed in ${duration}ms`);
      console.log(`AI-SERVICE: Response received (${response.content?.length || 0} chars)`);
      console.log(`AI-SERVICE: Cost: $${response.cost.totalCost.toFixed(6)}`);
      console.log(`AI-SERVICE: Tokens: ${response.usage.totalTokens}`);

      if (!response.content) {
        console.error('AI-SERVICE: No content in provider response');
        throw new Error('No response from provider');
      }

      console.log('AI-SERVICE: Parsing AI response...');
      const result = this.parseAIResponse(response.content, request);
      console.log(`AI-SERVICE: Successfully parsed ${result.labels.length} labels`);
      console.log(`AI-SERVICE: Labels: ${result.labels.map(l => `${l.label} (${Math.round(l.confidence * 100)}%)`).join(', ')}`);

      return result;
    } catch (error) {
      console.error('AI-SERVICE: Provider analysis failed:', error);

      // Return detailed error info in the analysis response
      let errorMessage = error instanceof Error ? error.message : String(error);

      const errorResult: CategoryAnalysis = {
        labels: [],
        language: 'en',
        suggestedDescription: `${providerId.toUpperCase()} API Error: ${errorMessage}`,
      };

      console.log('AI-SERVICE: Returning error result:', errorResult);
      return errorResult;
    }
  }

  private buildAnalysisPrompt(request: BookmarkAnalysisRequest): string {
    const categoriesConfig = this.settings.categories;
    const enabledCategories = Object.entries(categoriesConfig)
      .filter(([, enabled]) => enabled)
      .map(([category]) => category);

    const contentPreview = request.content?.substring(0, 1000) || 'No content available';

    return `
You are an expert at categorizing bookmarks and web content. Analyze this bookmark carefully and provide useful labels.

BOOKMARK TO ANALYZE:
- URL: ${request.url}
- Title: ${request.title}
- Content: ${contentPreview}
- Existing Labels: ${request.existingLabels?.join(', ') || 'None'}

TASK: Generate helpful categorization labels that will make this bookmark easier to find and organize.

CATEGORIES TO USE:
${enabledCategories.includes('topics') ? '- TOPICS: Technology, Business, Health, Education, Entertainment, News, Finance, Science, Design, Marketing, etc.' : ''}
${enabledCategories.includes('types') ? '- TYPES: Article, Tutorial, Documentation, Tool, Reference, Guide, News, Blog, Video, Podcast, etc.' : ''}
${enabledCategories.includes('priority') ? '- PRIORITY: High (very useful/important), Medium (moderately useful), Low (reference only)' : ''}

IMPORTANT RULES:
- Generate 5-8 labels total for comprehensive categorization
- Be generous with labels - include any that might be 40%+ relevant
- Focus on what makes this bookmark useful and discoverable
- Consider URL patterns (github.com = Technology, news sites = News, etc.)
- Don't duplicate existing labels: ${request.existingLabels?.join(', ') || 'None'}
- Minimum confidence threshold: ${this.settings.confidenceThreshold}
- Include both specific and general labels (e.g., "React" and "JavaScript", "Machine Learning" and "Technology")

OUTPUT FORMAT (valid JSON only):
{
  "labels": [
    {
      "label": "Technology",
      "category": "topic",
      "confidence": 0.85,
      "reasoning": "Software development content"
    },
    {
      "label": "Tutorial",
      "category": "type",
      "confidence": 0.75,
      "reasoning": "Educational content format"
    },
    {
      "label": "JavaScript",
      "category": "topic",
      "confidence": 0.80,
      "reasoning": "Programming language focus"
    }
  ],
  "suggestedDescription": "Brief 1-2 sentence description (optional)",
  "language": "en"
}
`.trim();
  }

  private parseAIResponse(content: string, request: BookmarkAnalysisRequest): CategoryAnalysis {
    console.log('AI-SERVICE: Starting response parsing');
    console.log(`AI-SERVICE: Raw content length: ${content.length}`);

    try {
      // Remove markdown code blocks if present
      let cleanContent = content;
      if (content.includes('```json')) {
        console.log('AI-SERVICE: Removing markdown code blocks');
        cleanContent = content.replace(/```json\s*|\s*```/g, '');
        console.log(`AI-SERVICE: Cleaned content length: ${cleanContent.length}`);
      }

      console.log('AI-SERVICE: Parsing JSON...');
      const parsed = JSON.parse(cleanContent);
      console.log('AI-SERVICE: JSON parsed successfully');

      // Validate and clean the response
      console.log('AI-SERVICE: Validating response structure...');
      const analysis: CategoryAnalysis = {
        labels: [],
        suggestedDescription: parsed.suggestedDescription,
        language: parsed.language || 'en'
      };

      console.log(`AI-SERVICE: Suggested description: ${parsed.suggestedDescription}`);
      console.log(`AI-SERVICE: Language: ${parsed.language || 'en'}`);

      if (Array.isArray(parsed.labels)) {
        console.log(`AI-SERVICE: Found ${parsed.labels.length} raw labels`);

        const filteredLabels = parsed.labels.filter((label: unknown) => {
          const isValid = typeof label === 'object' && label !== null &&
            'label' in label && 'category' in label && 'confidence' in label &&
            typeof (label as { confidence: unknown }).confidence === 'number' &&
            (label as { confidence: number }).confidence >= this.settings.confidenceThreshold;

          if (!isValid) {
            console.log('AI-SERVICE: Filtered out invalid label:', label);
          }
          return isValid;
        });

        console.log(`AI-SERVICE: ${filteredLabels.length} labels passed validation and confidence threshold (${this.settings.confidenceThreshold})`);

        // Additional filtering to exclude labels that already exist on the bookmark
        const newLabels = filteredLabels.filter((label: unknown) => {
          const l = label as { label: string; category: string; confidence: number; reasoning?: string };
          const existingLabels = request.existingLabels || [];
          const isDuplicate = existingLabels.some((existing: string) =>
            existing.toLowerCase() === l.label.toLowerCase()
          );

          if (isDuplicate) {
            console.log(`AI-SERVICE: Skipping existing label: ${l.label}`);
          }
          return !isDuplicate;
        });

        console.log(`AI-SERVICE: ${newLabels.length} new labels after filtering existing ones`);

        analysis.labels = newLabels.map((label: unknown) => {
          const l = label as { label: string; category: string; confidence: number; reasoning?: string };
          const processedLabel = {
            label: l.label,
            category: l.category,
            confidence: Math.min(Math.max(l.confidence, 0), 1),
            reasoning: l.reasoning
          };

          console.log(`AI-SERVICE: Processed new label: ${processedLabel.label} (${processedLabel.category}, ${Math.round(processedLabel.confidence * 100)}%)`);
          return processedLabel;
        });
      } else {
        console.warn('AI-SERVICE: No labels array found in response');
      }

      console.log(`AI-SERVICE: Final analysis contains ${analysis.labels.length} labels`);
      return analysis;
    } catch (error) {
      console.error('AI-SERVICE: Failed to parse AI response:', error);
      console.error('AI-SERVICE: Raw AI response content:', content);
      throw new Error(`Invalid AI response format. Response was: ${content.substring(0, 200)}...`);
    }
  }

  private async analyzeLocally(request: BookmarkAnalysisRequest): Promise<CategoryAnalysis> {
    // Simple local analysis using keywords and URL patterns
    const labels: BookmarkLabel[] = [];
    const url = request.url.toLowerCase();
    const title = request.title.toLowerCase();
    const content = (request.content || '').toLowerCase();
    const text = `${title} ${content}`;

    // Topic categorization
    if (this.settings.categories.topics) {
      const topicKeywords = {
        'Technology': ['tech', 'programming', 'code', 'software', 'dev', 'api', 'framework'],
        'Business': ['business', 'marketing', 'finance', 'startup', 'company', 'strategy'],
        'Health': ['health', 'medical', 'fitness', 'wellness', 'medicine', 'doctor'],
        'Education': ['learn', 'tutorial', 'course', 'education', 'study', 'university'],
        'News': ['news', 'breaking', 'current', 'today', 'latest', 'update']
      };

      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        const matches = keywords.filter(keyword => text.includes(keyword)).length;
        if (matches > 0) {
          labels.push({
            label: topic,
            category: 'topic',
            confidence: Math.min(0.8, 0.5 + (matches * 0.1)),
            reasoning: `Contains keywords: ${keywords.filter(k => text.includes(k)).join(', ')}`
          });
        }
      });
    }

    // Type categorization
    if (this.settings.categories.types) {
      const typePatterns = {
        'Documentation': ['docs', 'documentation', 'readme', 'wiki'],
        'Tutorial': ['tutorial', 'how-to', 'guide', 'walkthrough'],
        'Tool': ['tool', 'generator', 'converter', 'calculator'],
        'Reference': ['reference', 'cheatsheet', 'spec', 'manual']
      };

      Object.entries(typePatterns).forEach(([type, patterns]) => {
        const matches = patterns.filter(pattern => text.includes(pattern) || url.includes(pattern)).length;
        if (matches > 0) {
          labels.push({
            label: type,
            category: 'type',
            confidence: 0.7 + (matches * 0.1),
            reasoning: `Matches patterns: ${patterns.filter(p => text.includes(p) || url.includes(p)).join(', ')}`
          });
        }
      });
    }

    // Filter by confidence threshold
    const filteredLabels = labels.filter(label => label.confidence >= this.settings.confidenceThreshold);

    return {
      labels: filteredLabels.slice(0, 5), // Limit to 5 labels
      suggestedDescription: undefined, // Local analysis doesn't generate descriptions
      language: 'en'
    };
  }

  public async generateDescription(request: BookmarkAnalysisRequest): Promise<string> {
    await this.ensureInitialized();
    if (!(await this.isEnabled())) {
      throw new Error('AI service is not enabled or configured');
    }

    if (this.settings.provider === 'local') {
      throw new Error('Description generation requires AI provider (OpenAI or Anthropic)');
    }

    const providerId = this.normalizeProviderId(this.settings.provider);
    const provider = this.registry.getProvider(providerId);

    if (!provider) {
      throw new Error('AI provider not properly configured');
    }

    const prompt = `
Generate a concise, informative description for this bookmark:

URL: ${request.url}
Title: ${request.title}
Content Preview: ${request.content?.substring(0, 1000) || 'No content available'}

Please provide a 1-2 sentence description that explains what this bookmark is about and why someone might want to save it. Focus on the key value or purpose of the content.
`.trim();

    try {
      const llmRequest: LLMRequest = {
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating concise, helpful descriptions for bookmarked web content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        maxTokens: 200
      };

      const model = this.settings.model || this.getDefaultModel(this.settings.provider);
      const response = await provider.complete(llmRequest, model);

      return response.content.trim();
    } catch (error) {
      console.error('Description generation error:', error);
      throw new Error('Failed to generate description');
    }
  }

  public async findDuplicates(request: BookmarkAnalysisRequest, existingBookmarks: { id: string; url: string; title: string; description?: string; }[]): Promise<DuplicateCandidate[]> {
    if (!this.isEnabled()) {
      throw new Error('AI service is not enabled');
    }

    const candidates: DuplicateCandidate[] = [];
    const newBookmark = {
      url: request.url,
      title: request.title,
      description: request.content?.substring(0, 500)
    };

    for (const existing of existingBookmarks) {
      const similarity = this.calculateSimilarity(newBookmark, existing);

      if (similarity.overall >= 0.7) {
        const differences = this.identifyDifferences(newBookmark, existing);

        candidates.push({
          existingBookmark: existing,
          newBookmark,
          similarity,
          differences
        });
      }
    }

    candidates.sort((a, b) => b.similarity.overall - a.similarity.overall);

    return candidates;
  }

  private calculateSimilarity(bookmark1: { url: string; title: string; description?: string; }, bookmark2: { url: string; title: string; description?: string; }) {
    const url1 = this.normalizeUrl(bookmark1.url);
    const url2 = this.normalizeUrl(bookmark2.url);
    const urlSimilarity = url1 === url2 ? 1.0 : this.calculateStringSimilarity(url1, url2);

    const titleSimilarity = this.calculateStringSimilarity(
      bookmark1.title.toLowerCase().trim(),
      bookmark2.title.toLowerCase().trim()
    );

    const content1 = bookmark1.description || '';
    const content2 = bookmark2.description || '';
    const contentSimilarity = content1 && content2
      ? this.calculateStringSimilarity(content1.toLowerCase(), content2.toLowerCase())
      : 0;

    const overall = (
      urlSimilarity * 0.5 +
      titleSimilarity * 0.3 +
      contentSimilarity * 0.2
    );

    return {
      url: urlSimilarity,
      title: titleSimilarity,
      content: contentSimilarity,
      overall
    };
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url.toLowerCase());

      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => parsed.searchParams.delete(param));

      let pathname = parsed.pathname.replace(/\/$/, '');
      if (!pathname) pathname = '/';

      const hostname = parsed.hostname.replace(/^www\./, '');

      return `${parsed.protocol}//${hostname}${pathname}${parsed.search}`;
    } catch {
      return url.toLowerCase();
    }
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private identifyDifferences(bookmark1: { url: string; title: string; description?: string; }, bookmark2: { url: string; title: string; description?: string; }): string[] {
    const differences: string[] = [];

    if (this.normalizeUrl(bookmark1.url) !== this.normalizeUrl(bookmark2.url)) {
      if (bookmark1.url.toLowerCase() !== bookmark2.url.toLowerCase()) {
        differences.push('Different URLs');
      } else {
        differences.push('Minor URL differences (parameters, www, trailing slash)');
      }
    }

    if (bookmark1.title.toLowerCase().trim() !== bookmark2.title.toLowerCase().trim()) {
      differences.push('Different titles');
    }

    if (bookmark1.description && bookmark2.description) {
      if (bookmark1.description !== bookmark2.description) {
        differences.push('Different descriptions');
      }
    } else if (bookmark1.description || bookmark2.description) {
      differences.push('One has description, other does not');
    }

    return differences;
  }

  public async getSettings(): Promise<AISettings> {
    await this.ensureInitialized();
    return { ...this.settings };
  }

  /**
   * NEW METHODS - Provider Abstraction Integration
   */

  /**
   * List all available providers
   */
  public async listProviders(): Promise<Array<{ id: string; name: string; description: string }>> {
    await this.ensureInitialized();
    const providers = this.registry.listProviders();
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description
    }));
  }

  /**
   * List available models for a provider (or all providers)
   */
  public async listModels(providerId?: string) {
    await this.ensureInitialized();

    if (providerId) {
      return this.registry.getProviderModels(providerId);
    }
    return this.registry.listAllModels();
  }

  /**
   * Test API connection for a provider
   */
  public async testConnection(
    providerId: string,
    apiKey: string
  ): Promise<{ success: boolean; models?: any[]; error?: string }> {
    await this.ensureInitialized();
    return this.registry.testConnection(providerId, apiKey);
  }

  /**
   * Estimate cost for analyzing bookmarks
   */
  public async estimateCost(
    bookmarkCount: number,
    model?: string
  ): Promise<{ inputCost: number; outputCost: number; totalCost: number }> {
    await this.ensureInitialized();

    const providerId = this.normalizeProviderId(this.settings.provider);
    const provider = this.registry.getProvider(providerId);

    if (!provider) {
      throw new Error('No provider configured');
    }

    // Average bookmark analysis: ~200 input tokens, ~150 output tokens
    const avgInputTokens = 200;
    const avgOutputTokens = 150;

    const modelId = model || this.settings.model || this.getDefaultModel(this.settings.provider);
    const modelMeta = await provider.getModel(modelId);

    if (!modelMeta) {
      throw new Error('Model not found');
    }

    const inputCost = (avgInputTokens * bookmarkCount / 1_000_000) * modelMeta.pricing.inputCostPerMillion;
    const outputCost = (avgOutputTokens * bookmarkCount / 1_000_000) * modelMeta.pricing.outputCostPerMillion;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }
}

export const aiService = new AIService();
export type { AISettings, BookmarkAnalysisRequest, CategoryAnalysis, BookmarkLabel, DuplicateCandidate };
