import { useState, useCallback } from 'react';
import type { Bookmark } from '~/types/bookmarks';
import type { CategoryAnalysis, BookmarkLabel } from '~/flow/interfaces/ai';

export interface DashboardBookmark {
  bookmark: Bookmark;
  analysis: CategoryAnalysis;
  autoAppliedLabels: BookmarkLabel[];
  remainingLabels: BookmarkLabel[];
}

export interface DashboardState {
  bookmarks: DashboardBookmark[];
  selectedBookmarkIds: Set<string>;
  filterMode: 'all' | 'high' | 'medium' | 'low' | 'no_suggestions';
  sortBy: 'confidence' | 'title' | 'added';
  isProcessing: boolean;
}

export const useDashboardState = () => {
  const [state, setState] = useState<DashboardState>({
    bookmarks: [],
    selectedBookmarkIds: new Set(),
    filterMode: 'all',
    sortBy: 'confidence',
    isProcessing: false
  });

  const setBookmarks = useCallback((bookmarks: DashboardBookmark[]) => {
    setState(prev => ({ ...prev, bookmarks }));
  }, []);

  const addBookmark = useCallback((bookmark: DashboardBookmark) => {
    setState(prev => ({
      ...prev,
      bookmarks: [...prev.bookmarks, bookmark]
    }));
  }, []);

  const removeBookmark = useCallback((bookmarkId: string) => {
    setState(prev => ({
      ...prev,
      bookmarks: prev.bookmarks.filter(b => b.bookmark.id !== bookmarkId),
      selectedBookmarkIds: new Set(
        Array.from(prev.selectedBookmarkIds).filter(id => id !== bookmarkId)
      )
    }));
  }, []);

  const updateBookmark = useCallback((bookmarkId: string, updates: Partial<DashboardBookmark>) => {
    setState(prev => ({
      ...prev,
      bookmarks: prev.bookmarks.map(b =>
        b.bookmark.id === bookmarkId ? { ...b, ...updates } : b
      )
    }));
  }, []);

  const toggleBookmarkSelection = useCallback((bookmarkId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedBookmarkIds);
      if (newSelected.has(bookmarkId)) {
        newSelected.delete(bookmarkId);
      } else {
        newSelected.add(bookmarkId);
      }
      return { ...prev, selectedBookmarkIds: newSelected };
    });
  }, []);

  const selectAllBookmarks = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBookmarkIds: new Set(prev.bookmarks.map(b => b.bookmark.id))
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBookmarkIds: new Set()
    }));
  }, []);

  const setFilterMode = useCallback((mode: DashboardState['filterMode']) => {
    setState(prev => ({ ...prev, filterMode: mode }));
  }, []);

  const setSortBy = useCallback((sortBy: DashboardState['sortBy']) => {
    setState(prev => ({ ...prev, sortBy }));
  }, []);

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  }, []);

  // Helper to get confidence level
  const getConfidenceLevel = useCallback((confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.60) return 'medium';
    return 'low';
  }, []);

  // Get filtered bookmarks based on current filter mode
  const getFilteredBookmarks = useCallback(() => {
    let filtered = state.bookmarks;

    switch (state.filterMode) {
      case 'high':
        filtered = filtered.filter(b => {
          const maxConfidence = Math.max(...b.remainingLabels.map(l => l.confidence), 0);
          return getConfidenceLevel(maxConfidence) === 'high';
        });
        break;
      case 'medium':
        filtered = filtered.filter(b => {
          const maxConfidence = Math.max(...b.remainingLabels.map(l => l.confidence), 0);
          return getConfidenceLevel(maxConfidence) === 'medium';
        });
        break;
      case 'low':
        filtered = filtered.filter(b => {
          const maxConfidence = Math.max(...b.remainingLabels.map(l => l.confidence), 0);
          return getConfidenceLevel(maxConfidence) === 'low';
        });
        break;
      case 'no_suggestions':
        filtered = filtered.filter(b => b.remainingLabels.length === 0 && b.autoAppliedLabels.length === 0);
        break;
      default:
        // 'all' - no filtering
        break;
    }

    // Sort filtered bookmarks
    switch (state.sortBy) {
      case 'confidence':
        filtered.sort((a, b) => {
          const aMax = Math.max(...a.remainingLabels.map(l => l.confidence), 0);
          const bMax = Math.max(...b.remainingLabels.map(l => l.confidence), 0);
          return bMax - aMax; // Descending
        });
        break;
      case 'title':
        filtered.sort((a, b) => a.bookmark.title.localeCompare(b.bookmark.title));
        break;
      case 'added':
        filtered.sort((a, b) => (b.bookmark.createdAt || 0) - (a.bookmark.createdAt || 0));
        break;
    }

    return filtered;
  }, [state.bookmarks, state.filterMode, state.sortBy, getConfidenceLevel]);

  // Get selected bookmarks
  const getSelectedBookmarks = useCallback(() => {
    return state.bookmarks.filter(b => state.selectedBookmarkIds.has(b.bookmark.id));
  }, [state.bookmarks, state.selectedBookmarkIds]);

  // Get bookmarks grouped by confidence level
  const getBookmarksByConfidence = useCallback(() => {
    const groups = {
      high: [] as DashboardBookmark[],
      medium: [] as DashboardBookmark[],
      low: [] as DashboardBookmark[],
      none: [] as DashboardBookmark[]
    };

    state.bookmarks.forEach(b => {
      if (b.remainingLabels.length === 0 && b.autoAppliedLabels.length === 0) {
        groups.none.push(b);
      } else {
        const maxConfidence = Math.max(...b.remainingLabels.map(l => l.confidence), 0);
        const level = getConfidenceLevel(maxConfidence);
        groups[level].push(b);
      }
    });

    return groups;
  }, [state.bookmarks, getConfidenceLevel]);

  return {
    // State
    bookmarks: state.bookmarks,
    selectedBookmarkIds: state.selectedBookmarkIds,
    filterMode: state.filterMode,
    sortBy: state.sortBy,
    isProcessing: state.isProcessing,

    // Actions
    setBookmarks,
    addBookmark,
    removeBookmark,
    updateBookmark,
    toggleBookmarkSelection,
    selectAllBookmarks,
    clearSelection,
    setFilterMode,
    setSortBy,
    setProcessing,

    // Computed values
    getFilteredBookmarks,
    getSelectedBookmarks,
    getBookmarksByConfidence,
    getConfidenceLevel,

    // Stats
    totalCount: state.bookmarks.length,
    selectedCount: state.selectedBookmarkIds.size,
    hasSelection: state.selectedBookmarkIds.size > 0
  };
};
