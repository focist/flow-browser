import React, { useEffect, useMemo, useCallback } from 'react';
import { X, Sparkles, Check, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useDashboardState, type DashboardBookmark } from '../../hooks/use-dashboard-state';
import { usePatternDetection } from '../../hooks/use-pattern-detection';
import { useBulkOperations } from '../../hooks/use-bulk-operations';
import { useAIAnalysis } from '../../hooks/use-ai-analysis';
import { BookmarkOverviewColumn } from './bookmark-overview-column';
import { LabelSuggestionsColumn } from './label-suggestions-column';
import { BulkActionsColumn } from './bulk-actions-column';
import type { Bookmark } from '~/types/bookmarks';
import type { CategoryAnalysis } from '~/flow/interfaces/ai';
import { toast } from 'sonner';

export interface AILabelingDashboardProps {
  bookmarks: Array<{
    bookmark: Bookmark;
    analysis: CategoryAnalysis;
    autoAppliedLabels?: any[];
  }>;
  isOpen: boolean;
  onClose: () => void;
  onBookmarkUpdated?: () => void;
  isAnalyzing?: boolean;
}

export const AILabelingDashboard: React.FC<AILabelingDashboardProps> = ({
  bookmarks: initialBookmarks,
  isOpen,
  onClose,
  onBookmarkUpdated,
  isAnalyzing = false
}) => {
  const dashboardState = useDashboardState();
  const bulkOps = useBulkOperations(onBookmarkUpdated);
  const aiAnalysis = useAIAnalysis();

  // Initialize dashboard with bookmarks
  useEffect(() => {
    if (isOpen && initialBookmarks.length > 0) {
      const dashboardBookmarks: DashboardBookmark[] = initialBookmarks.map(item => ({
        bookmark: item.bookmark,
        analysis: item.analysis,
        autoAppliedLabels: item.autoAppliedLabels || [],
        remainingLabels: item.analysis.labels || []
      }));
      dashboardState.setBookmarks(dashboardBookmarks);
    }
  }, [isOpen, initialBookmarks]);

  // Get pattern detection for current bookmarks
  const patterns = usePatternDetection(dashboardState.bookmarks);

  // Get selected bookmarks - memoize to prevent unnecessary recalculations
  const selectedBookmarks = useMemo(
    () => dashboardState.getSelectedBookmarks(),
    [dashboardState.bookmarks, dashboardState.selectedBookmarkIds]
  );

  // Memoize button disabled state to prevent flashing
  const areButtonsDisabled = useMemo(
    () => selectedBookmarks.length === 0 || bulkOps.isProcessing,
    [selectedBookmarks.length, bulkOps.isProcessing]
  );

  // Bulk operation handlers
  const handleAcceptHighConfidence = async () => {
    const bookmarksToProcess = selectedBookmarks.length > 0
      ? selectedBookmarks
      : dashboardState.bookmarks;

    await bulkOps.acceptHighConfidenceLabels(bookmarksToProcess);

    // Update dashboard state after operation
    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }
  };

  const handleAcceptAll = async () => {
    const bookmarksToProcess = selectedBookmarks.length > 0
      ? selectedBookmarks
      : dashboardState.bookmarks;

    await bulkOps.acceptAllLabels(bookmarksToProcess);

    // Update dashboard state after operation
    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }
  };

  const handleRejectAll = async () => {
    const bookmarksToProcess = selectedBookmarks.length > 0
      ? selectedBookmarks
      : dashboardState.bookmarks;

    await bulkOps.rejectAllLabels(bookmarksToProcess);
  };

  const handleApplyPattern = async (pattern: any) => {
    const bookmarksToProcess = selectedBookmarks.length > 0
      ? selectedBookmarks
      : dashboardState.bookmarks;

    await bulkOps.applyPattern(pattern, bookmarksToProcess);

    // Update dashboard state after operation
    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }
  };

  const handleApplyCategory = async (category: any) => {
    const bookmarksToProcess = selectedBookmarks.length > 0
      ? selectedBookmarks
      : dashboardState.bookmarks;

    // Apply all patterns in this category
    for (const pattern of category.labels) {
      await bulkOps.applyPattern(pattern, bookmarksToProcess);
    }

    // Update dashboard state after operation
    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }
  };

  const handleReprocess = async () => {
    const bookmarksToProcess = selectedBookmarks.length > 0
      ? selectedBookmarks
      : dashboardState.bookmarks;

    if (bookmarksToProcess.length === 0) {
      toast.error('No bookmarks selected');
      return;
    }

    const toastId = toast.loading(`Reprocessing ${bookmarksToProcess.length} bookmarks...`);

    try {
      const reanalyzedBookmarks: DashboardBookmark[] = [];

      for (const dashboardBookmark of bookmarksToProcess) {
        // Suppress individual toasts during bulk reprocessing - loading toast provides feedback
        const result = await aiAnalysis.analyzeBookmark(dashboardBookmark.bookmark, { suppressToast: true });
        if (result) {
          reanalyzedBookmarks.push({
            bookmark: dashboardBookmark.bookmark,
            analysis: result.analysis,
            autoAppliedLabels: dashboardBookmark.autoAppliedLabels,
            remainingLabels: result.analysis.labels || []
          });
        }
      }

      // Update bookmarks in dashboard state
      dashboardState.setBookmarks(
        dashboardState.bookmarks.map(b => {
          const reanalyzed = reanalyzedBookmarks.find(r => r.bookmark.id === b.bookmark.id);
          return reanalyzed || b;
        })
      );

      toast.success('Reprocessing complete', {
        id: toastId,
        description: `${reanalyzedBookmarks.length} bookmarks reanalyzed`,
        duration: 2000
      });
    } catch (error) {
      toast.error('Reprocessing failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    }
  };

  // Handle Escape key to close dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Dashboard */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl h-[90vh] bg-background rounded-lg shadow-2xl border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h1 className="text-xl font-bold">AI Labeling Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {isAnalyzing
                  ? `Analyzing ${dashboardState.totalCount} bookmarks...`
                  : `Review and apply AI-suggested labels • ${dashboardState.totalCount} ${dashboardState.totalCount === 1 ? 'bookmark' : 'bookmarks'} • ${dashboardState.selectedCount} selected`
                }
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close dashboard (Escape)"
              title="Close dashboard (Escape)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Three-Column Layout */}
          <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden min-h-0">
            {/* Column 1: Bookmark Overview */}
            <div className="border-r h-full min-h-0">
              <BookmarkOverviewColumn
                bookmarks={dashboardState.getFilteredBookmarks()}
                selectedIds={dashboardState.selectedBookmarkIds}
                onToggleSelection={dashboardState.toggleBookmarkSelection}
                onSelectAll={dashboardState.selectAllBookmarks}
                onClearSelection={dashboardState.clearSelection}
                getConfidenceLevel={dashboardState.getConfidenceLevel}
                isAnalyzing={isAnalyzing}
              />
            </div>

            {/* Column 2: Label Suggestions */}
            <div className="border-r h-full min-h-0">
              <LabelSuggestionsColumn
                labelPatterns={patterns.labelPatterns}
                categoryPatterns={patterns.categoryPatterns}
                onApplyPattern={handleApplyPattern}
                onApplyCategory={handleApplyCategory}
                isProcessing={bulkOps.isProcessing}
                selectedBookmarkCount={dashboardState.selectedCount}
              />
            </div>

            {/* Column 3: Stats Only */}
            <div className="h-full min-h-0">
              <BulkActionsColumn
                selectedBookmarks={selectedBookmarks}
                isProcessing={bulkOps.isProcessing}
                progress={bulkOps.progress}
                onAcceptHighConfidence={() => {}}
                onAcceptAll={() => {}}
                onRejectAll={() => {}}
                onReprocess={() => {}}
                stats={patterns.stats}
              />
            </div>
          </div>

          {/* Action Buttons - Bottom of entire dashboard */}
          <div className="p-4 border-t bg-background flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedBookmarks.length > 0
                  ? `Apply actions to ${selectedBookmarks.length} selected ${selectedBookmarks.length === 1 ? 'bookmark' : 'bookmarks'}`
                  : 'Select bookmarks to perform bulk actions'}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleAcceptHighConfidence}
                  disabled={areButtonsDisabled}
                  variant="outline"
                  title="Apply all labels with 85%+ confidence"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  Accept High Confidence
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  disabled={areButtonsDisabled}
                  variant="outline"
                  title="Apply all suggested labels to selection"
                >
                  <Check className="h-4 w-4 mr-2 text-emerald-600" />
                  Accept All Labels
                </Button>
                <Button
                  onClick={handleReprocess}
                  disabled={areButtonsDisabled}
                  variant="outline"
                  title="Re-analyze selected bookmarks for new suggestions"
                >
                  <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                  Reprocess Selected
                </Button>
                <Button
                  onClick={handleRejectAll}
                  disabled={areButtonsDisabled}
                  variant="destructive"
                  title="Dismiss all suggestions for selection"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject All Labels
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AILabelingDashboard;
