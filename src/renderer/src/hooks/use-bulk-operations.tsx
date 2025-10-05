import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { DashboardBookmark } from './use-dashboard-state';
import type { BookmarkLabel } from '~/flow/interfaces/ai';
import type { LabelPattern } from './use-pattern-detection';

export interface BulkOperationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ bookmarkId: string; error: string }>;
}

export interface BulkOperationProgress {
  total: number;
  completed: number;
  current?: string; // Current bookmark being processed
}

export const useBulkOperations = (
  onBookmarkUpdated?: () => void
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);

  // Apply labels to multiple bookmarks
  const applyLabelsToBookmarks = useCallback(async (
    bookmarks: DashboardBookmark[],
    labels: BookmarkLabel[]
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress({ total: bookmarks.length, completed: 0 });

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const toastId = toast.loading(`Processing ${bookmarks.length} bookmarks...`);

    try {
      for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];
        setProgress({ total: bookmarks.length, completed: i, current: bookmark.bookmark.title });

        try {
          // Convert labels to the format expected by the API
          const labelsToAdd = labels.map(label => ({
            label: label.label,
            source: 'ai' as const,
            confidence: label.confidence,
            category: label.category
          }));

          const updateResult = await flow.bookmarks.update(bookmark.bookmark.id, {
            addLabels: labelsToAdd
          });

          if (updateResult) {
            result.success++;
          } else {
            result.failed++;
            result.errors.push({
              bookmarkId: bookmark.bookmark.id,
              error: 'Update returned false'
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            bookmarkId: bookmark.bookmark.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Small delay to prevent overwhelming the system
        if (i < bookmarks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      toast.success(`Bulk operation complete`, {
        id: toastId,
        description: `${result.success} successful, ${result.failed} failed`,
        duration: 4000
      });

      if (onBookmarkUpdated) {
        onBookmarkUpdated();
      }
    } catch (error) {
      toast.error('Bulk operation failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }

    return result;
  }, [onBookmarkUpdated]);

  // Accept all high confidence labels for selected bookmarks
  const acceptHighConfidenceLabels = useCallback(async (
    bookmarks: DashboardBookmark[],
    threshold: number = 0.85
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress({ total: bookmarks.length, completed: 0 });

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const toastId = toast.loading(`Accepting high confidence labels...`);

    try {
      for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];
        setProgress({ total: bookmarks.length, completed: i, current: bookmark.bookmark.title });

        // Get high confidence labels
        const highConfidenceLabels = bookmark.remainingLabels.filter(l => l.confidence >= threshold);

        if (highConfidenceLabels.length === 0) {
          result.skipped++;
          continue;
        }

        try {
          const labelsToAdd = highConfidenceLabels.map(label => ({
            label: label.label,
            source: 'ai' as const,
            confidence: label.confidence,
            category: label.category
          }));

          const updateResult = await flow.bookmarks.update(bookmark.bookmark.id, {
            addLabels: labelsToAdd
          });

          if (updateResult) {
            result.success++;
          } else {
            result.failed++;
            result.errors.push({
              bookmarkId: bookmark.bookmark.id,
              error: 'Update returned false'
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            bookmarkId: bookmark.bookmark.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Small delay
        if (i < bookmarks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      toast.success(`High confidence labels accepted`, {
        id: toastId,
        description: `${result.success} bookmarks updated, ${result.skipped} skipped`,
        duration: 4000
      });

      if (onBookmarkUpdated) {
        onBookmarkUpdated();
      }
    } catch (error) {
      toast.error('Operation failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }

    return result;
  }, [onBookmarkUpdated]);

  // Apply a specific pattern to all bookmarks that have it
  const applyPattern = useCallback(async (
    pattern: LabelPattern,
    bookmarks: DashboardBookmark[]
  ): Promise<BulkOperationResult> => {
    // Filter bookmarks that have this pattern in their remaining labels
    const affectedBookmarks = bookmarks.filter(b =>
      pattern.bookmarkIds.includes(b.bookmark.id) &&
      b.remainingLabels.some(l => l.label === pattern.label && l.category === pattern.category)
    );

    if (affectedBookmarks.length === 0) {
      toast.info('No bookmarks to update for this pattern');
      return { success: 0, failed: 0, skipped: 0, errors: [] };
    }

    // Find the label from the first bookmark (they should all have it)
    const label = affectedBookmarks[0].remainingLabels.find(
      l => l.label === pattern.label && l.category === pattern.category
    );

    if (!label) {
      toast.error('Pattern label not found');
      return { success: 0, failed: 0, skipped: 0, errors: [] };
    }

    return applyLabelsToBookmarks(affectedBookmarks, [label]);
  }, [applyLabelsToBookmarks]);

  // Accept all labels for specific bookmarks
  const acceptAllLabels = useCallback(async (
    bookmarks: DashboardBookmark[]
  ): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    setProgress({ total: bookmarks.length, completed: 0 });

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const toastId = toast.loading(`Accepting all labels...`);

    try {
      for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];
        setProgress({ total: bookmarks.length, completed: i, current: bookmark.bookmark.title });

        if (bookmark.remainingLabels.length === 0) {
          result.skipped++;
          continue;
        }

        try {
          const labelsToAdd = bookmark.remainingLabels.map(label => ({
            label: label.label,
            source: 'ai' as const,
            confidence: label.confidence,
            category: label.category
          }));

          const updateResult = await flow.bookmarks.update(bookmark.bookmark.id, {
            addLabels: labelsToAdd
          });

          if (updateResult) {
            result.success++;
          } else {
            result.failed++;
            result.errors.push({
              bookmarkId: bookmark.bookmark.id,
              error: 'Update returned false'
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            bookmarkId: bookmark.bookmark.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Small delay
        if (i < bookmarks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      toast.success(`All labels accepted`, {
        id: toastId,
        description: `${result.success} bookmarks updated, ${result.skipped} skipped`,
        duration: 4000
      });

      if (onBookmarkUpdated) {
        onBookmarkUpdated();
      }
    } catch (error) {
      toast.error('Operation failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }

    return result;
  }, [onBookmarkUpdated]);

  // Reject all labels for specific bookmarks
  const rejectAllLabels = useCallback(async (
    bookmarks: DashboardBookmark[]
  ): Promise<BulkOperationResult> => {
    // For now, just return success - we're not persisting rejections
    // This could be enhanced to store rejection preferences
    toast.info(`Rejected labels for ${bookmarks.length} bookmarks`);

    return {
      success: bookmarks.length,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }, []);

  return {
    // State
    isProcessing,
    progress,

    // Operations
    applyLabelsToBookmarks,
    acceptHighConfidenceLabels,
    applyPattern,
    acceptAllLabels,
    rejectAllLabels
  };
};
