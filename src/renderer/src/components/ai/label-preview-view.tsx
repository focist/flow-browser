import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { LabelPattern } from '../../hooks/use-pattern-detection';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import { getCategoryStyles, getCategoryIcon } from '../../lib/label-styles';
import { useShiftClickSelection } from '../../hooks/use-shift-click-selection';
import { useConfidenceGrouping } from '../../hooks/use-confidence-grouping';
import { useGroupCheckbox } from '../../hooks/use-group-checkbox';
import { ConfidenceGroupSection } from './confidence-group-section';
import { SelectionControls } from './selection-controls';

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

  // Use shared selection hook
  const {
    selectedIds,
    setSelectedIds,
    handleToggle,
    selectAll,
    deselectAll
  } = useShiftClickSelection({
    items: bookmarks,
    getId: (b) => b.bookmark.id,
    initialSelection: new Set(bookmarks.map(b => b.bookmark.id))
  });

  // Use shared confidence grouping hook
  const grouped = useConfidenceGrouping(bookmarks, (b) => {
    const label = [...b.autoAppliedLabels, ...b.remainingLabels].find(l =>
      l.label === pattern.label && l.category === pattern.category
    );
    return label?.confidence || 0;
  });

  // Use shared group checkbox hooks for each confidence level
  const highCheckbox = useGroupCheckbox(
    grouped.high.map(b => b.bookmark.id),
    selectedIds,
    setSelectedIds
  );

  const mediumCheckbox = useGroupCheckbox(
    grouped.medium.map(b => b.bookmark.id),
    selectedIds,
    setSelectedIds
  );

  const lowCheckbox = useGroupCheckbox(
    grouped.low.map(b => b.bookmark.id),
    selectedIds,
    setSelectedIds
  );

  const handleApply = () => {
    onApplyToSelected(Array.from(selectedIds));
  };

  // Render function for bookmark items
  const renderBookmark = (bookmark: DashboardBookmark) => {
    const label = [...bookmark.autoAppliedLabels, ...bookmark.remainingLabels].find(l =>
      l.label === pattern.label && l.category === pattern.category
    );

    return (
      <>
        <span className="text-sm truncate min-w-0">
          {bookmark.bookmark.title}
        </span>
        <span className="text-xs text-muted-foreground text-right w-12">
          {Math.round((label?.confidence || 0) * 100)}%
        </span>
      </>
    );
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
      <ConfidenceGroupSection
        level="High"
        items={grouped.high}
        isExpanded={expandedGroup === 'high'}
        onToggle={() => setExpandedGroup(prev => prev === 'high' ? null : 'high')}
        groupCheckboxState={highCheckbox.state}
        onGroupToggle={highCheckbox.toggle}
        selectedIds={selectedIds}
        getId={(b) => b.bookmark.id}
        onItemToggle={handleToggle}
        renderItem={renderBookmark}
      />

      <ConfidenceGroupSection
        level="Medium"
        items={grouped.medium}
        isExpanded={expandedGroup === 'medium'}
        onToggle={() => setExpandedGroup(prev => prev === 'medium' ? null : 'medium')}
        groupCheckboxState={mediumCheckbox.state}
        onGroupToggle={mediumCheckbox.toggle}
        selectedIds={selectedIds}
        getId={(b) => b.bookmark.id}
        onItemToggle={handleToggle}
        renderItem={renderBookmark}
      />

      <ConfidenceGroupSection
        level="Low"
        items={grouped.low}
        isExpanded={expandedGroup === 'low'}
        onToggle={() => setExpandedGroup(prev => prev === 'low' ? null : 'low')}
        groupCheckboxState={lowCheckbox.state}
        onGroupToggle={lowCheckbox.toggle}
        selectedIds={selectedIds}
        getId={(b) => b.bookmark.id}
        onItemToggle={handleToggle}
        renderItem={renderBookmark}
      />

      {/* Selection Controls */}
      <SelectionControls
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        selectedCount={selectedIds.size}
        totalCount={bookmarks.length}
      />

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
