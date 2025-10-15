import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { X, Sparkles, Check, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useDashboardState, type DashboardBookmark } from '../../hooks/use-dashboard-state';
import { usePatternDetection } from '../../hooks/use-pattern-detection';
import { useBulkOperations } from '../../hooks/use-bulk-operations';
import { useAIAnalysis } from '../../hooks/use-ai-analysis';
import { BookmarkOverviewColumn } from './bookmark-overview-column';
import { LabelSuggestionsColumn } from './label-suggestions-column';
import { ContextPreviewColumn, type PreviewMode } from './context-preview-column';
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

  // Hover state management for bidirectional highlighting
  const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);
  const [hoveredBookmarkId, setHoveredBookmarkId] = useState<string | null>(null);
  const [isColumn3Hovered, setIsColumn3Hovered] = useState(false);

  // State for shift-click range selection
  const [lastClickedBookmarkId, setLastClickedBookmarkId] = useState<string | null>(null);

  // Timeout refs for managing delayed hover clearing
  const patternHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bookmarkHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Hover handlers - preserve hover state when moving to column 3
  const handlePatternHover = useCallback((patternId: string | null) => {
    // Clear any pending timeout
    if (patternHoverTimeoutRef.current) {
      clearTimeout(patternHoverTimeoutRef.current);
      patternHoverTimeoutRef.current = null;
    }

    if (patternId === null) {
      // Add a delay before clearing to allow column 3's onMouseEnter to fire
      // Column 3's onMouseEnter will cancel this timeout if the user moves there
      // Increased to 200ms to handle slower mouse movements and ensure reliability
      patternHoverTimeoutRef.current = setTimeout(() => {
        setHoveredPatternId(null);
        patternHoverTimeoutRef.current = null;
      }, 200);
    } else {
      // Setting a new hover - apply immediately
      setHoveredPatternId(patternId);
    }
  }, []);

  const handleBookmarkHover = useCallback((bookmarkId: string | null) => {
    // Clear any pending timeout
    if (bookmarkHoverTimeoutRef.current) {
      clearTimeout(bookmarkHoverTimeoutRef.current);
      bookmarkHoverTimeoutRef.current = null;
    }

    if (bookmarkId === null) {
      // Add a delay before clearing to allow column 3's onMouseEnter to fire
      // Column 3's onMouseEnter will cancel this timeout if the user moves there
      // Increased to 200ms to handle slower mouse movements and ensure reliability
      bookmarkHoverTimeoutRef.current = setTimeout(() => {
        setHoveredBookmarkId(null);
        bookmarkHoverTimeoutRef.current = null;
      }, 200);
    } else {
      // Setting a new hover - apply immediately
      setHoveredBookmarkId(bookmarkId);
    }
  }, []);

  // Handle column 3 hover state changes
  const handleColumn3Hover = useCallback((isHovered: boolean) => {
    if (isHovered) {
      // Cancel any pending clear timeouts when entering column 3
      if (patternHoverTimeoutRef.current) {
        clearTimeout(patternHoverTimeoutRef.current);
        patternHoverTimeoutRef.current = null;
      }
      if (bookmarkHoverTimeoutRef.current) {
        clearTimeout(bookmarkHoverTimeoutRef.current);
        bookmarkHoverTimeoutRef.current = null;
      }
    }

    setIsColumn3Hovered(isHovered);

    // When leaving column 3, immediately clear any hover states
    if (!isHovered) {
      setHoveredPatternId(null);
      setHoveredBookmarkId(null);
    }
  }, []);

  // Get data for preview column based on hover state
  const selectedPattern = useMemo(() => {
    if (!hoveredPatternId) return null;
    return patterns.getPatternById(hoveredPatternId);
  }, [hoveredPatternId, patterns]);

  const affectedBookmarks = useMemo(() => {
    if (!hoveredPatternId) return [];
    return patterns.getBookmarksForPattern(hoveredPatternId);
  }, [hoveredPatternId, patterns]);

  const selectedBookmark = useMemo(() => {
    // If hovering over a specific bookmark, show that one
    if (hoveredBookmarkId) {
      return dashboardState.bookmarks.find(b => b.bookmark.id === hoveredBookmarkId);
    }

    // If exactly one bookmark is selected (and not hovering), show that one
    if (selectedBookmarks.length === 1) {
      return selectedBookmarks[0];
    }

    return null;
  }, [hoveredBookmarkId, selectedBookmarks, dashboardState.bookmarks]);

  // Calculate preview mode based on hover and selection state
  // This is a pure calculation, no delays or timers
  const previewMode = useMemo<PreviewMode>(() => {
    // Priority 1: Active hover states (label or bookmark)
    if (hoveredPatternId) return 'label';
    if (hoveredBookmarkId) return 'bookmark';

    // Priority 2: Selection-based views (these persist when column 3 is hovered)
    if (selectedBookmarks.length > 1) return 'bulk-impact';
    if (selectedBookmarks.length === 1) return 'bookmark';

    // Priority 3: Default to stats
    return 'stats';
  }, [hoveredPatternId, hoveredBookmarkId, selectedBookmarks.length]);

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

  // Handler for applying pattern from preview column (with selected bookmarks)
  const handleApplyPatternPreview = async (bookmarkIds: string[]) => {
    if (!selectedPattern) return;

    const bookmarksToApply = dashboardState.bookmarks.filter(b =>
      bookmarkIds.includes(b.bookmark.id)
    );

    await bulkOps.applyPattern(selectedPattern, bookmarksToApply);

    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }
  };

  // Handler for applying labels from bookmark preview
  const handleApplyBookmarkLabels = async (labelIds: string[]) => {
    if (!selectedBookmark) return;

    // Apply each selected label
    for (const labelId of labelIds) {
      const [labelName, category] = labelId.split('::');
      const label = selectedBookmark.remainingLabels.find(
        l => l.label === labelName && l.category === category
      );

      if (label) {
        try {
          await window.flow.bookmarks.addLabel(selectedBookmark.bookmark.id, {
            label: label.label,
            category: label.category as 'topic' | 'type' | 'priority'
          });
        } catch (error) {
          console.error('Failed to apply label:', error);
          toast.error(`Failed to apply label: ${label.label}`);
        }
      }
    }

    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }

    toast.success(`Applied ${labelIds.length} label${labelIds.length !== 1 ? 's' : ''} to ${selectedBookmark.bookmark.title}`);
  };

  // Shift-click handler for bookmark selection
  const handleBookmarkToggle = useCallback((bookmarkId: string, event?: React.ChangeEvent<HTMLInputElement>) => {
    // Determine action based on checkbox state (what we're transitioning TO)
    const action = event?.target.checked ? 'select' : 'deselect';

    if ((event?.nativeEvent as any)?.shiftKey && lastClickedBookmarkId) {
      // Find indices in the bookmarks array
      const allBookmarks = dashboardState.getFilteredBookmarks();
      const allIds = allBookmarks.map(b => b.bookmark.id);
      const lastIndex = allIds.indexOf(lastClickedBookmarkId);
      const currentIndex = allIds.indexOf(bookmarkId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Apply the action to all items in the range
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        const newSelected = new Set(dashboardState.selectedBookmarkIds);
        for (let i = start; i <= end; i++) {
          const id = allIds[i];
          if (action === 'select') {
            newSelected.add(id);
          } else {
            newSelected.delete(id);
          }
        }
        dashboardState.setSelectedBookmarkIds(newSelected);
      }
    } else {
      // Normal click - toggle
      dashboardState.toggleBookmarkSelection(bookmarkId);
    }

    // Update last clicked ID
    setLastClickedBookmarkId(bookmarkId);
  }, [lastClickedBookmarkId, dashboardState]);

  // Handler for bulk impact apply
  const handleApplyBulk = async (
    bookmarkIds: string[],
    labelSelections: Map<string, Set<string>>
  ) => {
    const bookmarksToApply = dashboardState.bookmarks.filter(b =>
      bookmarkIds.includes(b.bookmark.id)
    );

    let successCount = 0;
    let failCount = 0;

    for (const bookmark of bookmarksToApply) {
      const selectedLabelIds = labelSelections.get(bookmark.bookmark.id);
      if (!selectedLabelIds || selectedLabelIds.size === 0) continue;

      for (const labelId of selectedLabelIds) {
        const [labelName, category] = labelId.split('::');
        const label = bookmark.remainingLabels.find(
          l => l.label === labelName && l.category === category
        );

        if (label) {
          try {
            await window.flow.bookmarks.addLabel(bookmark.bookmark.id, {
              label: label.label,
              category: label.category as 'topic' | 'type' | 'priority'
            });
            successCount++;
          } catch (error) {
            console.error('Failed to apply label:', error);
            failCount++;
          }
        }
      }
    }

    if (onBookmarkUpdated) {
      onBookmarkUpdated();
    }

    if (failCount > 0) {
      toast.error(`Applied ${successCount} labels, ${failCount} failed`);
    } else {
      toast.success(`Applied ${successCount} label${successCount !== 1 ? 's' : ''} to ${bookmarkIds.length} bookmark${bookmarkIds.length !== 1 ? 's' : ''}`);
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

  // Cleanup state and timeouts when dashboard closes
  useEffect(() => {
    if (!isOpen) {
      // Clear timeout refs
      if (patternHoverTimeoutRef.current) {
        clearTimeout(patternHoverTimeoutRef.current);
        patternHoverTimeoutRef.current = null;
      }
      if (bookmarkHoverTimeoutRef.current) {
        clearTimeout(bookmarkHoverTimeoutRef.current);
        bookmarkHoverTimeoutRef.current = null;
      }

      // Clear hover states
      setHoveredPatternId(null);
      setHoveredBookmarkId(null);
      setIsColumn3Hovered(false);

      // Clear dashboard state (bookmarks and selections)
      dashboardState.setBookmarks([]);
      dashboardState.clearSelection();
    }
  }, [isOpen, dashboardState]);

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
          <div className="flex-1 flex gap-0 overflow-hidden min-h-0">
            {/* Column 1: Bookmark Overview */}
            <div className="flex-shrink-0 w-[33.333%] border-r h-full min-h-0 overflow-hidden">
              <BookmarkOverviewColumn
                bookmarks={dashboardState.getFilteredBookmarks()}
                selectedIds={dashboardState.selectedBookmarkIds}
                onToggleSelection={handleBookmarkToggle}
                onSelectAll={dashboardState.selectAllBookmarks}
                onClearSelection={dashboardState.clearSelection}
                getConfidenceLevel={dashboardState.getConfidenceLevel}
                isAnalyzing={isAnalyzing}
                hoveredPatternId={hoveredPatternId}
                onBookmarkHover={handleBookmarkHover}
                lastClickedId={lastClickedBookmarkId}
                onSetLastClickedId={setLastClickedBookmarkId}
              />
            </div>

            {/* Column 2: Label Suggestions */}
            <div className="flex-shrink-0 w-[33.333%] border-r h-full min-h-0 overflow-hidden">
              <LabelSuggestionsColumn
                labelPatterns={patterns.labelPatterns}
                categoryPatterns={patterns.categoryPatterns}
                onApplyPattern={handleApplyPattern}
                onApplyCategory={handleApplyCategory}
                isProcessing={bulkOps.isProcessing}
                selectedBookmarkCount={dashboardState.selectedCount}
                onPatternHover={handlePatternHover}
                hoveredBookmarkId={hoveredBookmarkId}
              />
            </div>

            {/* Column 3: Context Preview Column */}
            <div className="flex-shrink-0 w-[33.333%] h-full min-h-0 overflow-hidden">
              <ContextPreviewColumn
                mode={previewMode}
                stats={patterns.stats}
                selectedPattern={selectedPattern}
                selectedBookmark={selectedBookmark}
                selectedBookmarks={selectedBookmarks}
                affectedBookmarks={affectedBookmarks}
                onApplyPattern={handleApplyPatternPreview}
                onApplyBookmarkLabels={handleApplyBookmarkLabels}
                onApplyBulk={handleApplyBulk}
                onColumnHover={handleColumn3Hover}
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
