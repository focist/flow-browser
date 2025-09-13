export interface AISettings {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'local';
  model?: string;
  apiKey?: string;
  autoAnalyze: boolean;
  confidenceThreshold: number;
  autoApply: {
    enabled: boolean;
    maxLabels: number;
    notifications: boolean;
  };
  categories: {
    topics: boolean;
    types: boolean;
    priority: boolean;
  };
}

export interface BookmarkAnalysisRequest {
  url: string;
  title: string;
  content?: string;
  existingLabels?: string[];
}

export interface BookmarkLabel {
  label: string;
  category: 'topic' | 'type' | 'priority';
  confidence: number;
  reasoning?: string;
}

export interface LabelReviewState {
  label: BookmarkLabel;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
  id: string; // Unique identifier for tracking
  isAutoApplied?: boolean;
}

export interface CategoryAnalysis {
  labels: BookmarkLabel[];
  suggestedDescription?: string;
  language?: string;
}

export interface DescriptionSuggestion {
  generated: string;
  confidence: number;
  existingDescription?: string;
  metaDescription?: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

export interface DuplicateCandidate {
  existingBookmark: {
    id: string;
    url: string;
    title: string;
    description?: string;
  };
  newBookmark: {
    url: string;
    title: string;
    description?: string;
  };
  similarity: {
    url: number;
    title: number;
    content: number;
    overall: number;
  };
  differences: string[];
}

export interface PageContent {
  url: string;
  title: string;
  description?: string;
  content: string;
  language?: string;
  keywords?: string[];
  author?: string;
  publishDate?: string;
  siteName?: string;
  imageUrl?: string;
  contentType: 'html' | 'text' | 'unknown';
}

export interface FetchOptions {
  timeout?: number;
  maxContentLength?: number;
  includeMetadata?: boolean;
  userAgent?: string;
}

export interface AIFlowInterface {
  // Settings
  'ai:getSettings': () => Promise<{ success: boolean; data?: AISettings; error?: string }>;
  'ai:updateSettings': (settings: Partial<AISettings>) => Promise<{ success: boolean; error?: string }>;
  'ai:isEnabled': () => Promise<{ success: boolean; data?: boolean; error?: string }>;
  
  // Analysis
  'ai:analyzeBookmark': (request: BookmarkAnalysisRequest) => Promise<{ success: boolean; data?: CategoryAnalysis; error?: string }>;
  'ai:generateDescription': (request: BookmarkAnalysisRequest) => Promise<{ success: boolean; data?: string; error?: string }>;
  
  // Content Fetching
  'ai:fetchPageContent': (url: string, options?: FetchOptions) => Promise<{ success: boolean; data?: PageContent; error?: string }>;
  'ai:extractBasicInfo': (url: string, title?: string) => Promise<{ success: boolean; data?: Pick<PageContent, 'url' | 'title' | 'siteName'>; error?: string }>;
  
  // Duplicate detection
  'ai:findDuplicates': (request: BookmarkAnalysisRequest, existingBookmarks: { id: string; url: string; title: string; description?: string; }[]) => Promise<{ success: boolean; data?: DuplicateCandidate[]; error?: string }>;
  
  // Testing
  'ai:listModels': () => Promise<{ success: boolean; data?: any[]; error?: string }>;
}