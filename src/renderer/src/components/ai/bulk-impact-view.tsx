import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExpandableSection } from './expandable-section';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import { getCategoryStyles, getCategoryIcon } from '../../lib/label-styles';

interface BulkImpactViewProps {
  selectedBookmarks: DashboardBookmark[];
  onApplyToSelected: (bookmarkIds: string[], labelSelections: Map<string, Set<string>>) => void;
}

export function BulkImpactView({
  selectedBookmarks,
  onApplyToSelected
}: BulkImpactViewProps) {
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [expandedBookmarkIds, setExpandedBookmarkIds] = useState<Set<string>>(new Set());
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(
    new Set(selectedBookmarks.map(b => b.bookmark.id))
  );
  const [labelSelections, setLabelSelections] = useState<Map<string, Set<string>>>(
    new Map(selectedBookmarks.map(b => [
      b.bookmark.id,
      new Set(b.remainingLabels.map(l => `${l.label}::${l.category}`))
    ]))
  );
  const [lastClickedBookmarkId, setLastClickedBookmarkId] = useState<string | null>(null);

  // Calculate total labels
  const totalLabels = useMemo(() => {
    let total = 0;
    selectedBookmarkIds.forEach(bookmarkId => {
      total += labelSelections.get(bookmarkId)?.size || 0;
    });
    return total;
  }, [selectedBookmarkIds, labelSelections]);

  // Calculate confidence breakdown
  const confidenceBreakdown = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    selectedBookmarks.forEach(bookmark => {
      if (!selectedBookmarkIds.has(bookmark.bookmark.id)) return;

      const bookmarkLabels = labelSelections.get(bookmark.bookmark.id);
      if (!bookmarkLabels) return;

      bookmark.remainingLabels.forEach(label => {
        const labelId = `${label.label}::${label.category}`;
        if (!bookmarkLabels.has(labelId)) return;

        if (label.confidence >= 0.85) {
          high++;
        } else if (label.confidence >= 0.60) {
          medium++;
        } else {
          low++;
        }
      });
    });

    return { high, medium, low };
  }, [selectedBookmarks, selectedBookmarkIds, labelSelections]);

  const toggleBookmarkExpansion = (bookmarkId: string) => {
    setExpandedBookmarkIds(prev => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });
  };

  const toggleBookmarkSelection = (bookmarkId: string, event?: React.ChangeEvent<HTMLInputElement>) => {
    // Determine the action based on the checkbox event (what the user is DOING)
    // This matches the main bookmarks manager behavior
    const isChecked = event?.target.checked ?? !selectedBookmarkIds.has(bookmarkId);
    const action = isChecked ? 'select' : 'deselect';

    if (event?.nativeEvent && (event.nativeEvent as MouseEvent).shiftKey && lastClickedBookmarkId) {
      // Find indices in the bookmarks array
      const bookmarkIds = selectedBookmarks.map(b => b.bookmark.id);
      const lastIndex = bookmarkIds.indexOf(lastClickedBookmarkId);
      const currentIndex = bookmarkIds.indexOf(bookmarkId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Apply the SAME action to all items in the range
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        setSelectedBookmarkIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const id = bookmarkIds[i];

            if (action === 'select') {
              next.add(id);
            } else {
              next.delete(id);
            }
          }
          return next;
        });
      }
    } else {
      // Normal click - apply the action from the checkbox
      setSelectedBookmarkIds(prev => {
        const next = new Set(prev);
        if (action === 'select') {
          next.add(bookmarkId);
        } else {
          next.delete(bookmarkId);
        }
        return next;
      });
    }

    // Update last clicked ID
    setLastClickedBookmarkId(bookmarkId);
  };

  const toggleLabelSelection = (bookmarkId: string, labelId: string) => {
    setLabelSelections(prev => {
      const next = new Map(prev);
      const bookmarkLabels = new Set(next.get(bookmarkId));
      if (bookmarkLabels.has(labelId)) {
        bookmarkLabels.delete(labelId);
      } else {
        bookmarkLabels.add(labelId);
      }
      next.set(bookmarkId, bookmarkLabels);
      return next;
    });
  };

  const toggleAllBookmarkLabels = (bookmarkId: string) => {
    const bookmark = selectedBookmarks.find(b => b.bookmark.id === bookmarkId);
    if (!bookmark) return;

    const allLabelIds = bookmark.remainingLabels.map(l => `${l.label}::${l.category}`);
    const currentLabels = labelSelections.get(bookmarkId) || new Set();
    const allSelected = allLabelIds.every(id => currentLabels.has(id));

    setLabelSelections(prev => {
      const next = new Map(prev);
      if (allSelected) {
        // Deselect all labels
        next.set(bookmarkId, new Set());
      } else {
        // Select all labels
        next.set(bookmarkId, new Set(allLabelIds));
      }
      return next;
    });
  };

  const getBookmarkLabelCheckboxState = (bookmarkId: string) => {
    const bookmark = selectedBookmarks.find(b => b.bookmark.id === bookmarkId);
    if (!bookmark || bookmark.remainingLabels.length === 0) return 'unchecked';

    const allLabelIds = bookmark.remainingLabels.map(l => `${l.label}::${l.category}`);
    const currentLabels = labelSelections.get(bookmarkId) || new Set();
    const selectedCount = allLabelIds.filter(id => currentLabels.has(id)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === allLabelIds.length) return 'checked';
    return 'indeterminate';
  };

  const handleSelectAll = () => {
    setSelectedBookmarkIds(new Set(selectedBookmarks.map(b => b.bookmark.id)));
  };

  const handleDeselectAll = () => {
    setSelectedBookmarkIds(new Set());
  };

  const handleApply = () => {
    onApplyToSelected(Array.from(selectedBookmarkIds), labelSelections);
  };

  return (
    <div className="flex flex-col h-full" style={{ maxWidth: '100%', overflow: 'hidden', width: '100%' }}>
      {/* Header */}
      <div className="min-w-0 flex-shrink-0 mb-4">
        <h3 className="text-lg font-semibold mb-2">Bulk Impact Preview</h3>
        <p className="text-sm text-muted-foreground">
          {selectedBookmarks.length} bookmark{selectedBookmarks.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Summary Stats */}
      <div className="space-y-2 p-3 rounded-lg border bg-card min-w-0 flex-shrink-0 mb-4">
        <div className="flex items-center justify-between min-w-0">
          <span className="text-sm font-medium flex-shrink-0">Will apply:</span>
          <Badge variant="secondary" className="flex-shrink-0">{totalLabels} labels</Badge>
        </div>
        <div className="flex items-center justify-between text-xs min-w-0">
          <span className="text-muted-foreground flex-shrink-0">High confidence</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">{confidenceBreakdown.high}</span>
        </div>
        <div className="flex items-center justify-between text-xs min-w-0">
          <span className="text-muted-foreground flex-shrink-0">Medium confidence</span>
          <span className="font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">{confidenceBreakdown.medium}</span>
        </div>
        <div className="flex items-center justify-between text-xs min-w-0">
          <span className="text-muted-foreground flex-shrink-0">Low confidence</span>
          <span className="font-medium text-slate-600 dark:text-slate-400 flex-shrink-0">{confidenceBreakdown.low}</span>
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 min-h-0 mb-4">
        <ExpandableSection
          title="Bookmarks"
          count={selectedBookmarks.length}
          isExpanded={isListExpanded}
          onToggle={() => setIsListExpanded(!isListExpanded)}
          contentClassName="overflow-hidden"
          className="overflow-hidden h-full"
        >
        <div className="space-y-2 px-3" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          {selectedBookmarks.map(bookmark => {
            const labelCount = labelSelections.get(bookmark.bookmark.id)?.size || 0;
            const isExpanded = expandedBookmarkIds.has(bookmark.bookmark.id);
            const isSelected = selectedBookmarkIds.has(bookmark.bookmark.id);

            const groupCheckboxState = getBookmarkLabelCheckboxState(bookmark.bookmark.id);

            return (
              <div key={bookmark.bookmark.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-2" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                <div className={cn(
                  "grid gap-2 items-center py-1 px-2",
                  isExpanded ? "grid-cols-[auto_auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto_auto]"
                )}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                    onChange={(e) => toggleBookmarkSelection(bookmark.bookmark.id, e)}
                    className="rounded"
                    aria-label={`Include ${bookmark.bookmark.title}`}
                  />
                  {isExpanded && (
                    <input
                      type="checkbox"
                      checked={groupCheckboxState === 'checked'}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = groupCheckboxState === 'indeterminate';
                        }
                      }}
                      onChange={() => toggleAllBookmarkLabels(bookmark.bookmark.id)}
                      className="rounded"
                      aria-label={`Select all labels for ${bookmark.bookmark.title}`}
                    />
                  )}
                  <span className="text-sm truncate min-w-0">
                    {bookmark.bookmark.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    +{labelCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleBookmarkExpansion(bookmark.bookmark.id);
                    }}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {bookmark.remainingLabels.map(label => {
                      const labelId = `${label.label}::${label.category}`;
                      const isLabelSelected = labelSelections.get(bookmark.bookmark.id)?.has(labelId);

                      return (
                        <label
                          key={labelId}
                          className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-2 items-center py-1 hover:bg-accent rounded cursor-pointer transition-colors"
                          onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                        >
                          <input
                            type="checkbox"
                            checked={isLabelSelected}
                            onChange={() => toggleLabelSelection(bookmark.bookmark.id, labelId)}
                            className="rounded"
                            aria-label={`Include ${label.label} for ${bookmark.bookmark.title}`}
                          />
                          <span>
                            {getCategoryIcon(label.category)}
                          </span>
                          <span className="text-xs truncate min-w-0">
                            {label.label}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs h-4 ${getCategoryStyles(label.category)}`}
                          >
                            {label.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground text-right w-12">
                            {Math.round(label.confidence * 100)}%
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </ExpandableSection>
      </div>

      {/* Selection Controls */}
      <div className="flex gap-2 min-w-0 max-w-full flex-shrink-0 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          disabled={selectedBookmarkIds.size === selectedBookmarks.length}
          className="flex-1 min-w-0 !max-w-full"
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeselectAll}
          disabled={selectedBookmarkIds.size === 0}
          className="flex-1 min-w-0 !max-w-full"
        >
          Deselect All
        </Button>
      </div>

      {/* Apply Button */}
      <Button
        className="w-full min-w-0 !max-w-full flex-shrink-0"
        onClick={handleApply}
        disabled={selectedBookmarkIds.size === 0 || totalLabels === 0}
      >
        Apply to Selected ({selectedBookmarkIds.size})
      </Button>
    </div>
  );
}
