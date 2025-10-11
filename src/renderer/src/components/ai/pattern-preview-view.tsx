import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExpandableSection } from './expandable-section';
import type { LabelPattern } from '../../hooks/use-pattern-detection';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import { getCategoryStyles, getCategoryIcon } from '../../lib/label-styles';

interface PatternPreviewViewProps {
  pattern: LabelPattern;
  bookmarks: DashboardBookmark[];
  onApplyToSelected: (bookmarkIds: string[]) => void;
}

export function PatternPreviewView({
  pattern,
  bookmarks,
  onApplyToSelected
}: PatternPreviewViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(bookmarks.map(b => b.bookmark.id))
  );

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

  const handleToggle = (bookmarkId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });
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
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.bookmark.id)}
                    onChange={() => handleToggle(bookmark.bookmark.id)}
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
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.bookmark.id)}
                    onChange={() => handleToggle(bookmark.bookmark.id)}
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
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.bookmark.id)}
                    onChange={() => handleToggle(bookmark.bookmark.id)}
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
