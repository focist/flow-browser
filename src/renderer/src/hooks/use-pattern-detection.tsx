import { useMemo, useCallback } from 'react';
import type { DashboardBookmark } from './use-dashboard-state';
import type { BookmarkLabel } from '~/flow/interfaces/ai';

export interface LabelPattern {
  label: string;
  category: 'topic' | 'type' | 'priority';
  bookmarkIds: string[];
  count: number;
  avgConfidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface CategoryPattern {
  category: 'topic' | 'type' | 'priority';
  labels: LabelPattern[];
  totalBookmarks: number;
}

export interface DomainPattern {
  domain: string;
  bookmarkIds: string[];
  count: number;
  commonLabels: string[];
}

export const usePatternDetection = (bookmarks: DashboardBookmark[]) => {
  // Detect all label patterns across bookmarks
  const labelPatterns = useMemo((): LabelPattern[] => {
    const labelMap = new Map<string, {
      label: string;
      category: BookmarkLabel['category'];
      bookmarkIds: Set<string>;
      confidences: number[];
    }>();

    // Aggregate all labels from both auto-applied and remaining
    bookmarks.forEach(b => {
      const allLabels = [...b.autoAppliedLabels, ...b.remainingLabels];

      allLabels.forEach(label => {
        const key = `${label.label}::${label.category}`;

        if (!labelMap.has(key)) {
          labelMap.set(key, {
            label: label.label,
            category: label.category,
            bookmarkIds: new Set(),
            confidences: []
          });
        }

        const pattern = labelMap.get(key)!;
        pattern.bookmarkIds.add(b.bookmark.id);
        pattern.confidences.push(label.confidence);
      });
    });

    // Convert to array and calculate statistics
    const patterns: LabelPattern[] = Array.from(labelMap.values()).map(p => {
      const avgConfidence = p.confidences.reduce((a, b) => a + b, 0) / p.confidences.length;

      return {
        label: p.label,
        category: p.category,
        bookmarkIds: Array.from(p.bookmarkIds),
        count: p.bookmarkIds.size,
        avgConfidence,
        confidenceLevel: avgConfidence >= 0.85 ? 'high' : avgConfidence >= 0.60 ? 'medium' : 'low'
      };
    });

    // Sort by count (most common first)
    return patterns.sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  // Group patterns by category
  const categoryPatterns = useMemo((): CategoryPattern[] => {
    const categories = new Map<BookmarkLabel['category'], LabelPattern[]>();

    labelPatterns.forEach(pattern => {
      if (!categories.has(pattern.category)) {
        categories.set(pattern.category, []);
      }
      categories.get(pattern.category)!.push(pattern);
    });

    return Array.from(categories.entries()).map(([category, labels]) => {
      const bookmarkIds = new Set<string>();
      labels.forEach(l => l.bookmarkIds.forEach(id => bookmarkIds.add(id)));

      return {
        category,
        labels,
        totalBookmarks: bookmarkIds.size
      };
    });
  }, [labelPatterns]);

  // Detect domain patterns
  const domainPatterns = useMemo((): DomainPattern[] => {
    const domainMap = new Map<string, {
      bookmarkIds: Set<string>;
      labels: Map<string, number>;
    }>();

    bookmarks.forEach(b => {
      try {
        const url = new URL(b.bookmark.url);
        const domain = url.hostname;

        if (!domainMap.has(domain)) {
          domainMap.set(domain, {
            bookmarkIds: new Set(),
            labels: new Map()
          });
        }

        const pattern = domainMap.get(domain)!;
        pattern.bookmarkIds.add(b.bookmark.id);

        // Track labels for this domain
        const allLabels = [...b.autoAppliedLabels, ...b.remainingLabels];
        allLabels.forEach(label => {
          pattern.labels.set(label.label, (pattern.labels.get(label.label) || 0) + 1);
        });
      } catch (error) {
        // Invalid URL, skip
        console.warn('Invalid URL for domain pattern detection:', b.bookmark.url);
      }
    });

    // Convert to array
    const patterns: DomainPattern[] = Array.from(domainMap.entries()).map(([domain, data]) => {
      // Get top 5 most common labels for this domain
      const sortedLabels = Array.from(data.labels.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label]) => label);

      return {
        domain,
        bookmarkIds: Array.from(data.bookmarkIds),
        count: data.bookmarkIds.size,
        commonLabels: sortedLabels
      };
    });

    // Sort by count (most bookmarks first)
    return patterns.sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  // Get top N patterns
  const getTopPatterns = useCallback((n: number = 10): LabelPattern[] => {
    return labelPatterns.slice(0, n);
  }, [labelPatterns]);

  // Get patterns for a specific category
  const getPatternsByCategory = useCallback((category: BookmarkLabel['category']): LabelPattern[] => {
    return labelPatterns.filter(p => p.category === category);
  }, [labelPatterns]);

  // Get patterns for specific bookmarks
  const getPatternsForBookmarks = useCallback((bookmarkIds: string[]): LabelPattern[] => {
    const idSet = new Set(bookmarkIds);
    return labelPatterns.filter(p =>
      p.bookmarkIds.some(id => idSet.has(id))
    );
  }, [labelPatterns]);

  // Get bookmarks that share a specific label
  const getBookmarksWithLabel = useCallback((label: string, category?: BookmarkLabel['category']): DashboardBookmark[] => {
    return bookmarks.filter(b => {
      const allLabels = [...b.autoAppliedLabels, ...b.remainingLabels];
      return allLabels.some(l =>
        l.label === label && (!category || l.category === category)
      );
    });
  }, [bookmarks]);

  // Find similar bookmarks based on label overlap
  const findSimilarBookmarks = useCallback((bookmarkId: string, minOverlap: number = 2): DashboardBookmark[] => {
    const targetBookmark = bookmarks.find(b => b.bookmark.id === bookmarkId);
    if (!targetBookmark) return [];

    const targetLabels = new Set(
      [...targetBookmark.autoAppliedLabels, ...targetBookmark.remainingLabels]
        .map(l => `${l.label}::${l.category}`)
    );

    const similar: { bookmark: DashboardBookmark; overlapCount: number }[] = [];

    bookmarks.forEach(b => {
      if (b.bookmark.id === bookmarkId) return;

      const labels = [...b.autoAppliedLabels, ...b.remainingLabels];
      const overlap = labels.filter(l =>
        targetLabels.has(`${l.label}::${l.category}`)
      ).length;

      if (overlap >= minOverlap) {
        similar.push({ bookmark: b, overlapCount: overlap });
      }
    });

    // Sort by overlap count (highest first)
    return similar
      .sort((a, b) => b.overlapCount - a.overlapCount)
      .map(s => s.bookmark);
  }, [bookmarks]);

  // Get statistics
  const stats = useMemo(() => {
    const totalLabels = labelPatterns.reduce((sum, p) => sum + p.count, 0);
    const uniqueLabels = labelPatterns.length;
    const avgLabelsPerBookmark = bookmarks.length > 0
      ? totalLabels / bookmarks.length
      : 0;

    const highConfidencePatterns = labelPatterns.filter(p => p.confidenceLevel === 'high').length;
    const mediumConfidencePatterns = labelPatterns.filter(p => p.confidenceLevel === 'medium').length;
    const lowConfidencePatterns = labelPatterns.filter(p => p.confidenceLevel === 'low').length;

    return {
      totalLabels,
      uniqueLabels,
      avgLabelsPerBookmark,
      highConfidencePatterns,
      mediumConfidencePatterns,
      lowConfidencePatterns,
      totalDomains: domainPatterns.length
    };
  }, [labelPatterns, domainPatterns, bookmarks.length]);

  return {
    // Patterns
    labelPatterns,
    categoryPatterns,
    domainPatterns,

    // Queries
    getTopPatterns,
    getPatternsByCategory,
    getPatternsForBookmarks,
    getBookmarksWithLabel,
    findSimilarBookmarks,

    // Stats
    stats
  };
};
