import { net } from 'electron';

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

class ContentFetcher {
  private defaultOptions: Required<FetchOptions> = {
    timeout: 10000, // 10 seconds
    maxContentLength: 50000, // 50KB of content
    includeMetadata: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  async fetchPageContent(url: string, options: FetchOptions = {}): Promise<PageContent> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      console.log(`CONTENT-FETCHER: Fetching content for ${url}`);
      
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      const response = await this.makeRequest(url, opts);
      const content = await this.parseContent(response, opts);
      
      return {
        url,
        ...content
      };
    } catch (error) {
      console.error(`CONTENT-FETCHER: Failed to fetch ${url}:`, error);
      console.error(`CONTENT-FETCHER: Error type:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`CONTENT-FETCHER: Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`CONTENT-FETCHER: Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      
      // Return minimal content with just URL and title as fallback
      return {
        url,
        title: this.extractTitleFromUrl(url),
        content: '',
        contentType: 'unknown'
      };
    }
  }

  private async makeRequest(url: string, options: Required<FetchOptions>): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`CONTENT-FETCHER: Making request to ${url}`);
      const request = net.request({
        method: 'GET',
        url: url,
        redirect: 'follow'
      });

      // Set headers
      request.setHeader('User-Agent', options.userAgent);
      request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
      request.setHeader('Accept-Language', 'en-US,en;q=0.5');
      request.setHeader('Cache-Control', 'no-cache');

      let responseData = '';
      let contentLength = 0;

      const timeoutId = setTimeout(() => {
        request.abort();
        reject(new Error('Request timeout'));
      }, options.timeout);

      request.on('response', (response) => {
        const statusCode = response.statusCode;
        console.log(`CONTENT-FETCHER: Got response status ${statusCode} for ${url}`);
        
        if (statusCode < 200 || statusCode >= 400) {
          clearTimeout(timeoutId);
          console.error(`CONTENT-FETCHER: Bad status code ${statusCode} for ${url}`);
          reject(new Error(`HTTP ${statusCode}`));
          return;
        }

        const contentType = response.headers['content-type'] || '';
        console.log(`CONTENT-FETCHER: Content type: ${contentType} for ${url}`);
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          clearTimeout(timeoutId);
          console.error(`CONTENT-FETCHER: Unsupported content type ${contentType} for ${url}`);
          reject(new Error('Unsupported content type'));
          return;
        }

        response.on('data', (chunk) => {
          contentLength += chunk.length;
          
          if (contentLength > options.maxContentLength) {
            request.abort();
            clearTimeout(timeoutId);
            // Don't reject, use what we have
            resolve(responseData);
            return;
          }

          responseData += chunk.toString();
        });

        response.on('end', () => {
          clearTimeout(timeoutId);
          console.log(`CONTENT-FETCHER: Response completed for ${url}, data length: ${responseData.length}`);
          resolve(responseData);
        });

        response.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeoutId);
        console.error(`CONTENT-FETCHER: Request error for ${url}:`, error);
        reject(error);
      });

      request.end();
    });
  }

  private async parseContent(html: string, options: Required<FetchOptions>): Promise<Omit<PageContent, 'url'>> {
    try {
      // Basic HTML parsing without external dependencies
      const content: Omit<PageContent, 'url'> = {
        title: '',
        content: '',
        contentType: 'html'
      };

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      content.title = titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : '';

      if (options.includeMetadata) {
        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i) ||
                         html.match(/<meta[^>]*content=["\']([^"']*)["\'][^>]*name=["\']description["\'][^>]*>/i);
        content.description = descMatch ? this.decodeHtmlEntities(descMatch[1].trim()) : undefined;

        // Extract meta keywords
        const keywordsMatch = html.match(/<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
        content.keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : undefined;

        // Extract language
        const langMatch = html.match(/<html[^>]*lang=["\']([^"']*)["\'][^>]*>/i) ||
                         html.match(/<meta[^>]*http-equiv=["\']content-language["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
        content.language = langMatch ? langMatch[1] : undefined;

        // Extract author
        const authorMatch = html.match(/<meta[^>]*name=["\']author["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
        content.author = authorMatch ? this.decodeHtmlEntities(authorMatch[1].trim()) : undefined;

        // Extract Open Graph data
        const ogTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
        const ogDescMatch = html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
        const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
        const ogSiteMatch = html.match(/<meta[^>]*property=["\']og:site_name["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);

        if (ogTitleMatch && !content.title) content.title = this.decodeHtmlEntities(ogTitleMatch[1].trim());
        if (ogDescMatch && !content.description) content.description = this.decodeHtmlEntities(ogDescMatch[1].trim());
        if (ogImageMatch) content.imageUrl = ogImageMatch[1].trim();
        if (ogSiteMatch) content.siteName = this.decodeHtmlEntities(ogSiteMatch[1].trim());
      }

      // Extract text content (remove HTML tags and get readable text)
      const textContent = this.extractTextContent(html);
      content.content = textContent.substring(0, options.maxContentLength);

      return content;
    } catch (error) {
      console.error('CONTENT-FETCHER: Failed to parse HTML:', error);
      return {
        title: '',
        content: html.substring(0, 1000), // Fallback to raw HTML snippet
        contentType: 'text'
      };
    }
  }

  private extractTextContent(html: string): string {
    // Remove script and style elements
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    text = this.decodeHtmlEntities(text);
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' '
    };

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Convert hyphens and underscores to spaces and capitalize
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch (error) {
      return 'Untitled';
    }
  }

  // Public method to extract basic info without full content fetch (for performance)
  extractBasicInfo(url: string, title?: string): Pick<PageContent, 'url' | 'title' | 'siteName'> {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      
      return {
        url,
        title: title || this.extractTitleFromUrl(url),
        siteName: hostname.charAt(0).toUpperCase() + hostname.slice(1)
      };
    } catch (error) {
      return {
        url,
        title: title || 'Untitled',
        siteName: 'Unknown'
      };
    }
  }
}

export const contentFetcher = new ContentFetcher();