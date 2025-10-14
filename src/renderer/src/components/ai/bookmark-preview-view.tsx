import { useState, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExpandableSection } from './expandable-section';
import { Sparkles } from 'lucide-react';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import type { BookmarkLabel } from '~/flow/interfaces/ai';
import { getCategoryStyles, getCategoryIcon } from '../../lib/label-styles';

interface BookmarkPreviewViewProps {
  bookmark: DashboardBookmark;
  onApplySelectedLabels: (labelIds: string[]) => void;
}

export function BookmarkPreviewView({
  bookmark,
  onApplySelectedLabels
}: BookmarkPreviewViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    new Set(bookmark.remainingLabels.map(l => `${l.label}::${l.category}`))
  );
  const [lastClickedLabelId, setLastClickedLabelId] = useState<string | null>(null);

  // Group labels by confidence
  const grouped = useMemo(() => {
    const high: BookmarkLabel[] = [];
    const medium: BookmarkLabel[] = [];
    const low: BookmarkLabel[] = [];

    bookmark.remainingLabels.forEach(label => {
      if (label.confidence >= 0.85) {
        high.push(label);
      } else if (label.confidence >= 0.60) {
        medium.push(label);
      } else {
        low.push(label);
      }
    });

    return { high, medium, low };
  }, [bookmark.remainingLabels]);

  const handleToggle = (labelId: string, event?: React.ChangeEvent<HTMLInputElement>) => {
    // Determine action based on checkbox state (what we're transitioning TO)
    const action = event?.target.checked ? 'select' : 'deselect';

    if ((event?.nativeEvent as any)?.shiftKey && lastClickedLabelId) {
      // Find indices in the all labels array (high, medium, low)
      const allLabels = [...grouped.high, ...grouped.medium, ...grouped.low];
      const allLabelIds = allLabels.map(l => `${l.label}::${l.category}`);
      const lastIndex = allLabelIds.indexOf(lastClickedLabelId);
      const currentIndex = allLabelIds.indexOf(labelId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Apply the action to all items in the range
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        setSelectedLabelIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const id = allLabelIds[i];
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
      setSelectedLabelIds(prev => {
        const next = new Set(prev);
        if (action === 'select') {
          next.add(labelId);
        } else {
          next.delete(labelId);
        }
        return next;
      });
    }

    // Update last clicked ID
    setLastClickedLabelId(labelId);
  };

  const handleGroupToggle = (groupLabels: BookmarkLabel[]) => {
    const groupIds = groupLabels.map(l => `${l.label}::${l.category}`);
    const allSelected = groupIds.every(id => selectedLabelIds.has(id));

    setSelectedLabelIds(prev => {
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

  const getGroupCheckboxState = (groupLabels: BookmarkLabel[]) => {
    const groupIds = groupLabels.map(l => `${l.label}::${l.category}`);
    const selectedCount = groupIds.filter(id => selectedLabelIds.has(id)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === groupIds.length) return 'checked';
    return 'indeterminate';
  };

  const handleSelectAll = () => {
    setSelectedLabelIds(new Set(bookmark.remainingLabels.map(l => `${l.label}::${l.category}`)));
  };

  const handleDeselectAll = () => {
    setSelectedLabelIds(new Set());
  };

  const handleApply = () => {
    onApplySelectedLabels(Array.from(selectedLabelIds));
  };

  const totalLabels = bookmark.remainingLabels.length + bookmark.autoAppliedLabels.length;

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="min-w-0 overflow-hidden">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 break-words overflow-hidden text-ellipsis">
          {bookmark.bookmark.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Will receive {totalLabels} label{totalLabels !== 1 ? 's' : ''}
        </p>

        {/* Auto-Applied Labels */}
        {bookmark.autoAppliedLabels.length > 0 && (
          <div className="mb-3 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">
                Auto-applied ({bookmark.autoAppliedLabels.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {bookmark.autoAppliedLabels.map(label => (
                <Badge
                  key={`${label.label}::${label.category}`}
                  variant="outline"
                  className={`text-xs h-6 max-w-full ${getCategoryStyles(label.category)}`}
                >
                  <span className="mr-1 flex-shrink-0">{getCategoryIcon(label.category)}</span>
                  <span className="truncate">{label.label}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* High Confidence Labels */}
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
              aria-label="Select all high confidence labels"
            />
          }
        >
          <div className="space-y-1 px-3 min-w-0">
            {grouped.high.map(label => {
              const labelId = `${label.label}::${label.category}`;
              return (
                <label
                  key={labelId}
                  className="flex items-center gap-2 py-1 hover:bg-accent rounded px-2 cursor-pointer transition-colors min-w-0 max-w-full overflow-hidden"
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLabelIds.has(labelId)}
                    onChange={(e) => handleToggle(labelId, e)}
                    className="rounded flex-shrink-0"
                    aria-label={`Include ${label.label} (${Math.round(label.confidence * 100)}% confidence)`}
                  />
                  <span className="mr-1 flex-shrink-0">{getCategoryIcon(label.category)}</span>
                  <span className="flex-1 text-sm truncate min-w-0">{label.label}</span>
                  <Badge variant="outline" className={`text-xs h-5 flex-shrink-0 ${getCategoryStyles(label.category)}`}>
                    {label.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {Math.round(label.confidence * 100)}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {/* Medium Confidence Labels */}
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
              aria-label="Select all medium confidence labels"
            />
          }
        >
          <div className="space-y-1 px-3 min-w-0">
            {grouped.medium.map(label => {
              const labelId = `${label.label}::${label.category}`;
              return (
                <label
                  key={labelId}
                  className="flex items-center gap-2 py-1 hover:bg-accent rounded px-2 cursor-pointer transition-colors min-w-0 max-w-full overflow-hidden"
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLabelIds.has(labelId)}
                    onChange={(e) => handleToggle(labelId, e)}
                    className="rounded flex-shrink-0"
                    aria-label={`Include ${label.label} (${Math.round(label.confidence * 100)}% confidence)`}
                  />
                  <span className="mr-1 flex-shrink-0">{getCategoryIcon(label.category)}</span>
                  <span className="flex-1 text-sm truncate min-w-0">{label.label}</span>
                  <Badge variant="outline" className={`text-xs h-5 flex-shrink-0 ${getCategoryStyles(label.category)}`}>
                    {label.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {Math.round(label.confidence * 100)}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {/* Low Confidence Labels */}
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
              aria-label="Select all low confidence labels"
            />
          }
        >
          <div className="space-y-1 px-3 min-w-0">
            {grouped.low.map(label => {
              const labelId = `${label.label}::${label.category}`;
              return (
                <label
                  key={labelId}
                  className="flex items-center gap-2 py-1 hover:bg-accent rounded px-2 cursor-pointer transition-colors min-w-0 max-w-full overflow-hidden"
                  onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLabelIds.has(labelId)}
                    onChange={(e) => handleToggle(labelId, e)}
                    className="rounded flex-shrink-0"
                    aria-label={`Include ${label.label} (${Math.round(label.confidence * 100)}% confidence)`}
                  />
                  <span className="mr-1 flex-shrink-0">{getCategoryIcon(label.category)}</span>
                  <span className="flex-1 text-sm truncate min-w-0">{label.label}</span>
                  <Badge variant="outline" className={`text-xs h-5 flex-shrink-0 ${getCategoryStyles(label.category)}`}>
                    {label.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {Math.round(label.confidence * 100)}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {bookmark.remainingLabels.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No label suggestions available</p>
        </div>
      )}

      {/* Selection Controls */}
      {bookmark.remainingLabels.length > 0 && (
        <>
          <div className="flex gap-2 pt-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={selectedLabelIds.size === bookmark.remainingLabels.length}
              className="flex-1 min-w-0"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedLabelIds.size === 0}
              className="flex-1 min-w-0"
            >
              Deselect All
            </Button>
          </div>

          {/* Apply Button */}
          <Button
            className="w-full min-w-0"
            onClick={handleApply}
            disabled={selectedLabelIds.size === 0}
          >
            Apply Selected Labels ({selectedLabelIds.size})
          </Button>
        </>
      )}
    </div>
  );
}
