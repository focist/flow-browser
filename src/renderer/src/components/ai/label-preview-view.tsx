import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExpandableSection } from './expandable-section';
import type { LabelPattern } from '../../hooks/use-pattern-detection';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import { getCategoryStyles, getCategoryIcon } from '../../lib/label-styles';

interface LabelPreviewViewProps {
  pattern: LabelPattern;
  bookmarks: DashboardBookmark[];
  onApplyToSelected: (bookmarkIds: string[]) => void;
}

export function LabelPreviewView({
  pattern,
  bookmarks,
  onApplyToSelected
}: LabelPreviewViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(bookmarks.map(b => b.bookmark.id))
  );
  const [lastClickedBookmarkId, setLastClickedBookmarkId] = useState<string | null>(null);

  // Group bookmarks by confidence
  const grouped = useMemo(() => {
    const high: DashboardBookmark[] = [];
    const medium: DashboardBookmark[] = [];
    const low: DashboardBookmark[] = [];

    bookmarks.forEach(b => {
      const label = [...b.autoAppliedLabels, ...b.remainingLabels].find(l =>
        l.label === pattern.label && l.category === pattern.category
      );

      if (!label) return;

      if (label.confidence >= 0.85) {
        high.push(b);
      } else if (label.confidence >= 0.60) {
        medium.push(b);
      } else {
        low.push(b);
      }
    });

    return { high, medium, low };
  }, [bookmarks, pattern]);

  const handleToggle = (bookmarkId: string, event?: React.ChangeEvent<HTMLInputElement>) => {
    // Determine action based on checkbox state (what we're transitioning TO)
    const action = event?.target.checked ? 'select' : 'deselect';

    if ((event?.nativeEvent as any)?.shiftKey && lastClickedBookmarkId) {
      // Find indices in the all bookmarks array (high, medium, low)
      const allBookmarks = [...grouped.high, ...grouped.medium, ...grouped.low];
      const allBookmarkIds = allBookmarks.map(b => b.bookmark.id);
      const lastIndex = allBookmarkIds.indexOf(lastClickedBookmarkId);
      const currentIndex = allBookmarkIds.indexOf(bookmarkId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Apply the action to all items in the range
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        setSelectedIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const id = allBookmarkIds[i];
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
      // Normal click - apply action
      setSelectedIds(prev => {
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

  const handleGroupToggle = (groupBookmarks: DashboardBookmark[]) => {
    const groupIds = groupBookmarks.map(b => b.bookmark.id);
    const allSelected = groupIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in group
        groupIds.forEach(id => next.delete(id));
      } else {
        // Select all in group
        groupIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const getGroupCheckboxState = (groupBookmarks: DashboardBookmark[]) => {
    const groupIds = groupBookmarks.map(b => b.bookmark.id);
    const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === groupIds.length) return 'checked';
    return 'indeterminate';
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(bookmarks.map(b => b.bookmark.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    onApplyToSelected(Array.from(selectedIds));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl flex-shrink-0">{getCategoryIcon(pattern.category)}</span>
          <h3 className="text-lg font-semibold truncate">{pattern.label}</h3>
        </div>
        <Badge variant="outline" className={`text-xs mb-2 ${getCategoryStyles(pattern.category)}`}>
          {pattern.category}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} will receive this label
        </p>
      </div>

      {/* Confidence Groups */}
      {grouped.high.length > 0 && (
        <ExpandableSection
          title="High Confidence"
          count={grouped.high.length}
          isExpanded={expandedGroup === 'high'}
          onToggle={() => setExpandedGroup(prev => prev === 'high' ? null : 'high')}
          headerAction={
            <input
              type="checkbox"
              checked={getGroupCheckboxState(grouped.high) === 'checked'}
              ref={(el) => {
                if (el) {
                  el.indeterminate = getGroupCheckboxState(grouped.high) === 'indeterminate';
                }
              }}
              onChange={() => handleGroupToggle(grouped.high)}
              className="rounded"
              aria-label="Select all high confidence bookmarks"
            />
          }
        >
          <div className="space-y-1 px-3">
            {grouped.high.map(bookmark => {
              const label = [...bookmark.autoAppliedLabels, ...bookmark.remainingLabels].find(l =>
                l.label === pattern.label && l.category === pattern.category
              );
              return (
                <label
                  key={bookmark.bookmark.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-2 items-center py-1 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.bookmark.id)}
                    onChange={(e) => handleToggle(bookmark.bookmark.id, e)}
                    className="rounded"
                    aria-label={`Include ${bookmark.bookmark.title} (${Math.round((label?.confidence || 0) * 100)}% confidence)`}
                  />
                  <span className="text-sm truncate min-w-0">
                    {bookmark.bookmark.title}
                  </span>
                  <span className="text-xs text-muted-foreground text-right w-12">
                    {Math.round((label?.confidence || 0) * 100)}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {grouped.medium.length > 0 && (
        <ExpandableSection
          title="Medium Confidence"
          count={grouped.medium.length}
          isExpanded={expandedGroup === 'medium'}
          onToggle={() => setExpandedGroup(prev => prev === 'medium' ? null : 'medium')}
          headerAction={
            <input
              type="checkbox"
              checked={getGroupCheckboxState(grouped.medium) === 'checked'}
              ref={(el) => {
                if (el) {
                  el.indeterminate = getGroupCheckboxState(grouped.medium) === 'indeterminate';
                }
              }}
              onChange={() => handleGroupToggle(grouped.medium)}
              className="rounded"
              aria-label="Select all medium confidence bookmarks"
            />
          }
        >
          <div className="space-y-1 px-3">
            {grouped.medium.map(bookmark => {
              const label = [...bookmark.autoAppliedLabels, ...bookmark.remainingLabels].find(l =>
                l.label === pattern.label && l.category === pattern.category
              );
              return (
                <label
                  key={bookmark.bookmark.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-2 items-center py-1 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.bookmark.id)}
                    onChange={(e) => handleToggle(bookmark.bookmark.id, e)}
                    className="rounded"
                    aria-label={`Include ${bookmark.bookmark.title} (${Math.round((label?.confidence || 0) * 100)}% confidence)`}
                  />
                  <span className="text-sm truncate min-w-0">
                    {bookmark.bookmark.title}
                  </span>
                  <span className="text-xs text-muted-foreground text-right w-12">
                    {Math.round((label?.confidence || 0) * 100)}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {grouped.low.length > 0 && (
        <ExpandableSection
          title="Low Confidence"
          count={grouped.low.length}
          isExpanded={expandedGroup === 'low'}
          onToggle={() => setExpandedGroup(prev => prev === 'low' ? null : 'low')}
          headerAction={
            <input
              type="checkbox"
              checked={getGroupCheckboxState(grouped.low) === 'checked'}
              ref={(el) => {
                if (el) {
                  el.indeterminate = getGroupCheckboxState(grouped.low) === 'indeterminate';
                }
              }}
              onChange={() => handleGroupToggle(grouped.low)}
              className="rounded"
              aria-label="Select all low confidence bookmarks"
            />
          }
        >
          <div className="space-y-1 px-3">
            {grouped.low.map(bookmark => {
              const label = [...bookmark.autoAppliedLabels, ...bookmark.remainingLabels].find(l =>
                l.label === pattern.label && l.category === pattern.category
              );
              return (
                <label
                  key={bookmark.bookmark.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-2 items-center py-1 px-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.bookmark.id)}
                    onChange={(e) => handleToggle(bookmark.bookmark.id, e)}
                    className="rounded"
                    aria-label={`Include ${bookmark.bookmark.title} (${Math.round((label?.confidence || 0) * 100)}% confidence)`}
                  />
                  <span className="text-sm truncate min-w-0">
                    {bookmark.bookmark.title}
                  </span>
                  <span className="text-xs text-muted-foreground text-right w-12">
                    {Math.round((label?.confidence || 0) * 100)}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {/* Selection Controls */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          disabled={selectedIds.size === bookmarks.length}
          className="flex-1"
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeselectAll}
          disabled={selectedIds.size === 0}
          className="flex-1"
        >
          Deselect All
        </Button>
      </div>

      {/* Apply Button */}
      <Button
        className="w-full"
        onClick={handleApply}
        disabled={selectedIds.size === 0}
      >
        Apply to Selected ({selectedIds.size})
      </Button>
    </div>
  );
}
