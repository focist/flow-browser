import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Sparkles } from 'lucide-react';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import type { BookmarkLabel } from '~/flow/interfaces/ai';
import { getCategoryStyles, getCategoryIcon } from '../../lib/label-styles';
import { useShiftClickSelection } from '../../hooks/use-shift-click-selection';
import { useConfidenceGrouping } from '../../hooks/use-confidence-grouping';
import { useGroupCheckbox } from '../../hooks/use-group-checkbox';
import { ConfidenceGroupSection } from './confidence-group-section';
import { SelectionControls } from './selection-controls';

interface BookmarkPreviewViewProps {
  bookmark: DashboardBookmark;
  onApplySelectedLabels: (labelIds: string[]) => void;
}

export function BookmarkPreviewView({
  bookmark,
  onApplySelectedLabels
}: BookmarkPreviewViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Use shared selection hook
  const {
    selectedIds: selectedLabelIds,
    setSelectedIds: setSelectedLabelIds,
    handleToggle,
    selectAll,
    deselectAll
  } = useShiftClickSelection({
    items: bookmark.remainingLabels,
    getId: (l) => `${l.label}::${l.category}`,
    initialSelection: new Set(bookmark.remainingLabels.map(l => `${l.label}::${l.category}`))
  });

  // Use shared confidence grouping hook
  const grouped = useConfidenceGrouping(
    bookmark.remainingLabels,
    (label) => label.confidence
  );

  // Use shared group checkbox hooks for each confidence level
  const highCheckbox = useGroupCheckbox(
    grouped.high.map(l => `${l.label}::${l.category}`),
    selectedLabelIds,
    setSelectedLabelIds
  );

  const mediumCheckbox = useGroupCheckbox(
    grouped.medium.map(l => `${l.label}::${l.category}`),
    selectedLabelIds,
    setSelectedLabelIds
  );

  const lowCheckbox = useGroupCheckbox(
    grouped.low.map(l => `${l.label}::${l.category}`),
    selectedLabelIds,
    setSelectedLabelIds
  );

  const handleApply = () => {
    onApplySelectedLabels(Array.from(selectedLabelIds));
  };

  // Render function for label items
  const renderLabel = (label: BookmarkLabel) => {
    return (
      <>
        <span className="mr-1 flex-shrink-0">{getCategoryIcon(label.category)}</span>
        <span className="flex-1 text-sm truncate min-w-0">{label.label}</span>
        <Badge variant="outline" className={`text-xs h-5 flex-shrink-0 ${getCategoryStyles(label.category)}`}>
          {label.category}
        </Badge>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {Math.round(label.confidence * 100)}%
        </span>
      </>
    );
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

      {/* Confidence Groups */}
      <ConfidenceGroupSection
        level="High"
        items={grouped.high}
        isExpanded={expandedGroup === 'high'}
        onToggle={() => setExpandedGroup(prev => prev === 'high' ? null : 'high')}
        groupCheckboxState={highCheckbox.state}
        onGroupToggle={highCheckbox.toggle}
        selectedIds={selectedLabelIds}
        getId={(l) => `${l.label}::${l.category}`}
        onItemToggle={handleToggle}
        renderItem={renderLabel}
      />

      <ConfidenceGroupSection
        level="Medium"
        items={grouped.medium}
        isExpanded={expandedGroup === 'medium'}
        onToggle={() => setExpandedGroup(prev => prev === 'medium' ? null : 'medium')}
        groupCheckboxState={mediumCheckbox.state}
        onGroupToggle={mediumCheckbox.toggle}
        selectedIds={selectedLabelIds}
        getId={(l) => `${l.label}::${l.category}`}
        onItemToggle={handleToggle}
        renderItem={renderLabel}
      />

      <ConfidenceGroupSection
        level="Low"
        items={grouped.low}
        isExpanded={expandedGroup === 'low'}
        onToggle={() => setExpandedGroup(prev => prev === 'low' ? null : 'low')}
        groupCheckboxState={lowCheckbox.state}
        onGroupToggle={lowCheckbox.toggle}
        selectedIds={selectedLabelIds}
        getId={(l) => `${l.label}::${l.category}`}
        onItemToggle={handleToggle}
        renderItem={renderLabel}
      />

      {bookmark.remainingLabels.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No label suggestions available</p>
        </div>
      )}

      {/* Selection Controls */}
      {bookmark.remainingLabels.length > 0 && (
        <>
          <SelectionControls
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            selectedCount={selectedLabelIds.size}
            totalCount={bookmark.remainingLabels.length}
          />

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
