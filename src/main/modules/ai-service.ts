import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SettingsDataStore } from '@/saving/settings';
import type { 
  AISettings, 
  BookmarkAnalysisRequest, 
  BookmarkLabel, 
  CategoryAnalysis, 
  DuplicateCandidate 
} from '~/flow/interfaces/ai';

class AIService {
  private openai: OpenAI | null = null;
  private claude: Anthropic | null = null;
  private settings: AISettings = {
    enabled: true, // Default to enabled so it works immediately
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
        return 'claude-3-5-sonnet-20241022';
      default:
        return 'gpt-5-nano';
    }
  }

  constructor() {
    this.initPromise = this.loadSettings().then(() => {
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
        
        // Initialize AI clients if we have settings
        if (this.settings.apiKey) {
          if (this.settings.provider === 'openai') {
            this.openai = new OpenAI({
              apiKey: this.settings.apiKey,
            });
          } else if (this.settings.provider === 'claude') {
            this.claude = new Anthropic({
              apiKey: this.settings.apiKey,
            });
          }
        }
      } else {
        console.log('🔧 No saved AI settings found, using defaults');
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    }
  }

  public async updateSettings(newSettings: Partial<AISettings>) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Set default model if provider changed but no model specified
    if (newSettings.provider && !newSettings.model) {
      this.settings.model = this.getDefaultModel(newSettings.provider);
    }
    
    // Initialize AI clients based on provider
    if (this.settings.apiKey) {
      if (this.settings.provider === 'openai') {
        this.openai = new OpenAI({
          apiKey: this.settings.apiKey,
        });
        this.claude = null;
      } else if (this.settings.provider === 'claude') {
        this.claude = new Anthropic({
          apiKey: this.settings.apiKey,
        });
        this.openai = null;
      }
    } else {
      this.openai = null;
      this.claude = null;
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
    return this.settings.enabled && (
      (this.settings.provider === 'openai' && this.openai !== null) ||
      (this.settings.provider === 'claude' && this.claude !== null) ||
      this.settings.provider === 'local'
    );
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

    // Force reinitialize OpenAI client if settings exist but client is null
    if (this.settings.provider === 'openai' && this.settings.apiKey && !this.openai) {
      console.log('AI-SERVICE: Reinitializing OpenAI client...');
      try {
        this.openai = new OpenAI({
          apiKey: this.settings.apiKey,
        });
        console.log('AI-SERVICE: OpenAI client reinitialized successfully');
      } catch (error) {
        console.error('AI-SERVICE: Failed to reinitialize OpenAI client:', error);
      }
    }

    if (this.settings.provider === 'openai' && this.openai) {
      console.log('AI-SERVICE: Using OpenAI for analysis');
      return this.analyzeWithOpenAI(request);
    } else if (this.settings.provider === 'claude' && this.claude) {
      console.log('AI-SERVICE: Using Claude for analysis');
      return this.analyzeWithClaude(request);
    } else {
      console.log('AI-SERVICE: Falling back to local analysis');
      return this.analyzeLocally(request);
    }
  }

  private async analyzeWithOpenAI(request: BookmarkAnalysisRequest): Promise<CategoryAnalysis> {
    console.log('AI-SERVICE: Starting OpenAI analysis');
    
    if (!this.openai) {
      console.error('AI-SERVICE: OpenAI client not initialized');
      throw new Error('OpenAI client not initialized');
    }

    const prompt = this.buildAnalysisPrompt(request);
    console.log(`AI-SERVICE: Generated prompt (${prompt.length} chars)`);
    console.log(`AI-SERVICE: Prompt preview: ${prompt.substring(0, 200)}...`);
    
    const model = this.settings.model || 'gpt-5-nano';
    
    // Nano models use reasoning tokens internally and need much higher limits
    const isNanoModel = model.includes('nano');
    const maxTokens = isNanoModel ? 5000 : 500;
    
    console.log(`AI-SERVICE: Model type: ${isNanoModel ? 'nano (reasoning model)' : 'standard'}`);
    
    const requestPayload = {
      model: model,
      messages: [
        {
          role: 'user' as const,
          content: prompt
        }
      ],
      max_completion_tokens: maxTokens,
    };
    
    console.log(`AI-SERVICE: Using model: ${requestPayload.model}`);
    console.log(`AI-SERVICE: Max completion tokens: ${requestPayload.max_completion_tokens}`);
    
    try {
      console.log('AI-SERVICE: Sending request to OpenAI...');
      const startTime = Date.now();
      const response = await this.openai.chat.completions.create(requestPayload);
      const duration = Date.now() - startTime;
      console.log(`AI-SERVICE: OpenAI request completed in ${duration}ms`);
      
      // Log the full response structure for debugging
      console.log('AI-SERVICE: Full response object:', JSON.stringify(response, null, 2));
      console.log(`AI-SERVICE: Response has ${response.choices?.length || 0} choices`);
      
      if (response.choices && response.choices.length > 0) {
        console.log('AI-SERVICE: First choice:', JSON.stringify(response.choices[0], null, 2));
      }

      const content = response.choices[0]?.message?.content;
      console.log(`AI-SERVICE: Response received (${content?.length || 0} chars)`);
      console.log(`AI-SERVICE: Response preview: ${content?.substring(0, 200)}...`);
      
      if (!content) {
        console.error('AI-SERVICE: No content in OpenAI response');
        throw new Error('No response from OpenAI');
      }

      console.log('AI-SERVICE: Parsing AI response...');
      const result = this.parseAIResponse(content, request);
      console.log(`AI-SERVICE: Successfully parsed ${result.labels.length} labels`);
      console.log(`AI-SERVICE: Labels: ${result.labels.map(l => `${l.label} (${Math.round(l.confidence * 100)}%)`).join(', ')}`);
      
      return result;
    } catch (error) {
      console.error('AI-SERVICE: OpenAI analysis failed:', error);
      
      // Return detailed error info in the analysis response
      let errorMessage = error instanceof Error ? error.message : String(error);
      let debugInfo = '';
      
      // Log the full error structure for debugging
      console.error('AI-SERVICE: Full error object:', JSON.stringify(error, null, 2));
      debugInfo += ` | Full error: ${JSON.stringify(error, null, 2)}`;
      
      // Try different ways to get headers from OpenAI error
      if (error && typeof error === 'object') {
        const apiError = error as any;
        
        // Check for headers in various possible locations
        const possibleHeaderSources = [
          apiError.response?.headers,
          apiError.headers,
          apiError.error?.response?.headers,
          apiError.cause?.response?.headers
        ];
        
        for (const headers of possibleHeaderSources) {
          if (headers) {
            console.log('AI-SERVICE: Found error headers:', headers);
            debugInfo += ` | Found headers: ${JSON.stringify(headers)}`;
            break;
          }
        }
        
        if (apiError.status || (apiError.error && apiError.error.message)) {
          errorMessage = `${apiError.status || 'Unknown'}: ${apiError.error?.message || apiError.message || errorMessage}`;
        }
      }
      
      const errorResult = {
        labels: [],
        language: 'en',
        suggestedDescription: `OpenAI API Error: ${errorMessage}${debugInfo}`,
      };
      
      console.log('AI-SERVICE: Returning error result:', errorResult);
      return errorResult;
    }
  }

  private async analyzeWithClaude(request: BookmarkAnalysisRequest): Promise<CategoryAnalysis> {
    if (!this.claude) {
      throw new Error('Claude client not initialized');
    }

    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      const response = await this.claude.messages.create({
        model: this.settings.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.3,
        system: 'You are an expert at analyzing web content and categorizing bookmarks. Return only valid JSON responses.',
        messages: [
          {
            role: 'user' as const,
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text' || !content.text) {
        throw new Error('No response from Claude');
      }

      return this.parseAIResponse(content.text, request);
    } catch (error) {
      console.error('Claude API error:', error);
      // Fallback to local analysis
      return this.analyzeLocally(request);
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
      throw new Error('Description generation requires AI provider (OpenAI or Claude)');
    }
    
    if (this.settings.provider === 'openai' && this.openai) {
      return this.generateDescriptionWithOpenAI(request);
    } else if (this.settings.provider === 'claude' && this.claude) {
      return this.generateDescriptionWithClaude(request);
    } else {
      throw new Error('AI provider not properly configured');
    }
  }

  private async generateDescriptionWithOpenAI(request: BookmarkAnalysisRequest): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = `
Generate a concise, informative description for this bookmark:

URL: ${request.url}
Title: ${request.title}
Content Preview: ${request.content?.substring(0, 1000) || 'No content available'}

Please provide a 1-2 sentence description that explains what this bookmark is about and why someone might want to save it. Focus on the key value or purpose of the content.
`.trim();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.settings.model || 'gpt-5-nano',
        messages: [
          {
            role: 'system' as const,
            content: 'You are an expert at creating concise, helpful descriptions for bookmarked web content.'
          },
          {
            role: 'user' as const,
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('OpenAI description generation error:', error);
      throw new Error('Failed to generate description');
    }
  }

  private async generateDescriptionWithClaude(request: BookmarkAnalysisRequest): Promise<string> {
    if (!this.claude) {
      throw new Error('Claude client not initialized');
    }

    const prompt = `
Generate a concise, informative description for this bookmark:

URL: ${request.url}
Title: ${request.title}
Content Preview: ${request.content?.substring(0, 1000) || 'No content available'}

Please provide a 1-2 sentence description that explains what this bookmark is about and why someone might want to save it. Focus on the key value or purpose of the content.
`.trim();

    try {
      const response = await this.claude.messages.create({
        model: this.settings.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        temperature: 0.3,
        system: 'You are an expert at creating concise, helpful descriptions for bookmarked web content.',
        messages: [
          {
            role: 'user' as const,
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text' || !content.text) {
        throw new Error('No response from Claude');
      }

      return content.text.trim();
    } catch (error) {
      console.error('Claude description generation error:', error);
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
      description: request.content?.substring(0, 500) // Use content preview as description
    };

    for (const existing of existingBookmarks) {
      const similarity = this.calculateSimilarity(newBookmark, existing);
      
      // Only consider as duplicate if overall similarity is above threshold
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

    // Sort by overall similarity (highest first)
    candidates.sort((a, b) => b.similarity.overall - a.similarity.overall);

    return candidates;
  }

  private calculateSimilarity(bookmark1: { url: string; title: string; description?: string; }, bookmark2: { url: string; title: string; description?: string; }) {
    // URL similarity (exact match or normalized comparison)
    const url1 = this.normalizeUrl(bookmark1.url);
    const url2 = this.normalizeUrl(bookmark2.url);
    const urlSimilarity = url1 === url2 ? 1.0 : this.calculateStringSimilarity(url1, url2);

    // Title similarity using string similarity
    const titleSimilarity = this.calculateStringSimilarity(
      bookmark1.title.toLowerCase().trim(),
      bookmark2.title.toLowerCase().trim()
    );

    // Content similarity (if available)
    const content1 = bookmark1.description || '';
    const content2 = bookmark2.description || '';
    const contentSimilarity = content1 && content2 
      ? this.calculateStringSimilarity(content1.toLowerCase(), content2.toLowerCase())
      : 0;

    // Weighted overall similarity
    const overall = (
      urlSimilarity * 0.5 +      // URL is most important
      titleSimilarity * 0.3 +    // Title is second most important
      contentSimilarity * 0.2    // Content provides additional context
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
      
      // Remove common tracking parameters
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => parsed.searchParams.delete(param));
      
      // Remove trailing slash
      let pathname = parsed.pathname.replace(/\/$/, '');
      if (!pathname) pathname = '/';
      
      // Normalize www subdomain
      const hostname = parsed.hostname.replace(/^www\./, '');
      
      return `${parsed.protocol}//${hostname}${pathname}${parsed.search}`;
    } catch {
      return url.toLowerCase();
    }
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;

    // Use Levenshtein distance for similarity calculation
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
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private identifyDifferences(bookmark1: { url: string; title: string; description?: string; }, bookmark2: { url: string; title: string; description?: string; }): string[] {
    const differences: string[] = [];

    // URL differences
    if (this.normalizeUrl(bookmark1.url) !== this.normalizeUrl(bookmark2.url)) {
      if (bookmark1.url.toLowerCase() !== bookmark2.url.toLowerCase()) {
        differences.push('Different URLs');
      } else {
        differences.push('Minor URL differences (parameters, www, trailing slash)');
      }
    }

    // Title differences
    if (bookmark1.title.toLowerCase().trim() !== bookmark2.title.toLowerCase().trim()) {
      differences.push('Different titles');
    }

    // Description differences
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
}

export const aiService = new AIService();
export type { AISettings, BookmarkAnalysisRequest, CategoryAnalysis, BookmarkLabel, DuplicateCandidate };