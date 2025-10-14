import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Clock, Zap, Sparkles, Loader2 } from 'lucide-react';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';
import { getCategoryStyles } from '../../lib/label-styles';

interface BookmarkOverviewColumnProps {
  bookmarks: DashboardBookmark[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  getConfidenceLevel: (confidence: number) => 'high' | 'medium' | 'low';
  isAnalyzing?: boolean;
  hoveredPatternId?: string | null;
  onBookmarkHover?: (bookmarkId: string | null) => void;
  lastClickedId?: string | null;
  onSetLastClickedId?: (id: string | null) => void;
}

interface BookmarkGroupProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bookmarks: DashboardBookmark[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  hoveredPatternId?: string | null;
  onBookmarkHover?: (bookmarkId: string | null) => void;
  lastClickedId?: string | null;
  onSetLastClickedId?: (id: string | null) => void;
  allBookmarks: DashboardBookmark[];
}

const BookmarkItem: React.FC<{
  bookmark: DashboardBookmark;
  isSelected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  onHover?: (bookmarkId: string | null) => void;
}> = ({ bookmark, isSelected, onToggle, isHighlighted = false, isDimmed = false, onHover }) => {
  const totalLabels = bookmark.remainingLabels.length + bookmark.autoAppliedLabels.length;
  const autoAppliedCount = bookmark.autoAppliedLabels.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`flex items-start gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50 transition-all duration-200 overflow-hidden ${
        isSelected ? 'bg-accent border-primary' : 'bg-card'
      } ${
        isHighlighted ? 'ring-2 ring-blue-500/50 bg-blue-50 dark:bg-blue-950/20' : ''
      } ${
        isDimmed ? 'opacity-40' : 'opacity-100'
      }`}
      onClick={(e) => onToggle(e)}
      onMouseDown={(e) => {
        // Prevent text selection on shift-click by stopping the mousedown event early
        if (e.shiftKey) {
          e.preventDefault();
        }
      }}
      onMouseEnter={() => onHover?.(bookmark.bookmark.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(bookmark.bookmark.id)}
      onBlur={() => onHover?.(null)}
      tabIndex={0}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => {
          // Checkbox state is managed by parent click handler
        }}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium truncate min-w-0">{bookmark.bookmark.title}</p>
        <div className="flex flex-wrap items-center gap-1 mt-1 min-w-0 overflow-hidden">
          {/* Show first 3 labels with color coding and confidence */}
          {[...bookmark.autoAppliedLabels, ...bookmark.remainingLabels].slice(0, 3).map((label, idx) => (
            <Badge
              key={`${label.label}-${label.category}-${idx}`}
              variant="outline"
              className={`text-xs h-5 flex-shrink-0 ${getCategoryStyles(label.category)} flex items-center gap-1 min-w-0 max-w-full`}
            >
              <span className="truncate min-w-0 max-w-[120px]">{label.label}</span>
              <span className="opacity-60 flex-shrink-0">{Math.round(label.confidence * 100)}%</span>
            </Badge>
          ))}
          {/* Show "+X more" if there are additional labels */}
          {totalLabels > 3 && (
            <Badge variant="outline" className="text-xs h-5 flex-shrink-0">
              +{totalLabels - 3}
            </Badge>
          )}
          {/* Show auto-applied indicator */}
          {autoAppliedCount > 0 && (
            <Badge variant="outline" className="text-xs h-5 flex-shrink-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
              <Sparkles className="h-3 w-3 mr-0.5 flex-shrink-0" />
              {autoAppliedCount} auto
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const BookmarkGroup: React.FC<BookmarkGroupProps> = ({
  title,
  count,
  icon,
  color,
  bookmarks,
  selectedIds,
  onToggleSelection,
  expanded = true,
  onToggleExpanded,
  hoveredPatternId,
  onBookmarkHover,
  lastClickedId,
  onSetLastClickedId,
  allBookmarks
}) => {
  if (count === 0) return null;

  const handleBookmarkClick = (bookmarkId: string, event: React.MouseEvent) => {
    // Determine the action based on current selection state
    const action = selectedIds.has(bookmarkId) ? 'deselect' : 'select';

    if (event.shiftKey && lastClickedId && onSetLastClickedId) {
      // Find indices in the full bookmarks array
      const allIds = allBookmarks.map(b => b.bookmark.id);
      const lastIndex = allIds.indexOf(lastClickedId);
      const currentIndex = allIds.indexOf(bookmarkId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Apply the SAME action to all items in the range
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        for (let i = start; i <= end; i++) {
          const id = allIds[i];
          const isCurrentlySelected = selectedIds.has(id);

          // Only toggle if the current state doesn't match the desired action
          if (action === 'select' && !isCurrentlySelected) {
            onToggleSelection(id);
          } else if (action === 'deselect' && isCurrentlySelected) {
            onToggleSelection(id);
          }
        }
      }
    } else {
      // Normal click - toggle selection
      onToggleSelection(bookmarkId);
    }

    // Update last clicked ID
    if (onSetLastClickedId) {
      onSetLastClickedId(bookmarkId);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${color}`}>
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{count} bookmark{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5 pl-2"
          >
            {bookmarks.map((bookmark) => {
              // Check if this bookmark should be highlighted
              const isHighlighted = hoveredPatternId &&
                [...bookmark.autoAppliedLabels, ...bookmark.remainingLabels].some(
                  l => `${l.label}::${l.category}` === hoveredPatternId
                );
              const isDimmed = hoveredPatternId && !isHighlighted;

              return (
                <BookmarkItem
                  key={bookmark.bookmark.id}
                  bookmark={bookmark}
                  isSelected={selectedIds.has(bookmark.bookmark.id)}
                  onToggle={(e) => handleBookmarkClick(bookmark.bookmark.id, e)}
                  isHighlighted={!!isHighlighted}
                  isDimmed={!!isDimmed}
                  onHover={onBookmarkHover}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const BookmarkOverviewColumn: React.FC<BookmarkOverviewColumnProps> = ({
  bookmarks,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  getConfidenceLevel,
  isAnalyzing = false,
  hoveredPatternId,
  onBookmarkHover,
  lastClickedId,
  onSetLastClickedId
}) => {
  const [expandedGroups, setExpandedGroups] = React.useState({
    high: true,
    medium: true,
    low: true,
    none: true
  });

  // Group bookmarks by confidence level
  const groups = React.useMemo(() => {
    const result = {
      high: [] as DashboardBookmark[],
      medium: [] as DashboardBookmark[],
      low: [] as DashboardBookmark[],
      none: [] as DashboardBookmark[]
    };

    bookmarks.forEach((b) => {
      if (b.remainingLabels.length === 0 && b.autoAppliedLabels.length === 0) {
        result.none.push(b);
      } else {
        const maxConfidence = Math.max(...b.remainingLabels.map(l => l.confidence), 0);
        const level = getConfidenceLevel(maxConfidence);
        result[level].push(b);
      }
    });

    return result;
  }, [bookmarks, getConfidenceLevel]);

  const toggleGroup = (group: keyof typeof expandedGroups) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const selectedCount = selectedIds.size;
  const totalCount = bookmarks.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Analyzed Bookmarks</h2>
          <Badge variant="secondary">{totalCount}</Badge>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="flex-1 text-xs px-3 py-1.5 rounded border hover:bg-accent transition-colors font-medium"
            disabled={totalCount === 0}
            title="Select all bookmarks in this view"
          >
            Select All ({totalCount})
          </button>
          <button
            onClick={onClearSelection}
            className="flex-1 text-xs px-3 py-1.5 rounded border hover:bg-accent transition-colors font-medium"
            disabled={selectedCount === 0}
            title="Clear all selections"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Bookmark Groups */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <BookmarkGroup
            title="High Confidence"
            count={groups.high.length}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            color="bg-emerald-100 dark:bg-emerald-900/30"
            bookmarks={groups.high}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            expanded={expandedGroups.high}
            onToggleExpanded={() => toggleGroup('high')}
            hoveredPatternId={hoveredPatternId}
            onBookmarkHover={onBookmarkHover}
            lastClickedId={lastClickedId}
            onSetLastClickedId={onSetLastClickedId}
            allBookmarks={bookmarks}
          />

          <BookmarkGroup
            title="Medium Confidence"
            count={groups.medium.length}
            icon={<Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            color="bg-blue-100 dark:bg-blue-900/30"
            bookmarks={groups.medium}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            expanded={expandedGroups.medium}
            onToggleExpanded={() => toggleGroup('medium')}
            hoveredPatternId={hoveredPatternId}
            onBookmarkHover={onBookmarkHover}
            lastClickedId={lastClickedId}
            onSetLastClickedId={onSetLastClickedId}
            allBookmarks={bookmarks}
          />

          <BookmarkGroup
            title="Low Confidence"
            count={groups.low.length}
            icon={<AlertCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
            color="bg-slate-100 dark:bg-slate-800"
            bookmarks={groups.low}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            expanded={expandedGroups.low}
            onToggleExpanded={() => toggleGroup('low')}
            hoveredPatternId={hoveredPatternId}
            onBookmarkHover={onBookmarkHover}
            lastClickedId={lastClickedId}
            onSetLastClickedId={onSetLastClickedId}
            allBookmarks={bookmarks}
          />

          <BookmarkGroup
            title="No Suggestions"
            count={groups.none.length}
            icon={<Clock className="h-4 w-4 text-gray-600" />}
            color="bg-gray-100 dark:bg-gray-800"
            bookmarks={groups.none}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            expanded={expandedGroups.none}
            onToggleExpanded={() => toggleGroup('none')}
            hoveredPatternId={hoveredPatternId}
            onBookmarkHover={onBookmarkHover}
            lastClickedId={lastClickedId}
            onSetLastClickedId={onSetLastClickedId}
            allBookmarks={bookmarks}
          />

          {totalCount === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
                  <p className="text-sm font-medium">Analyzing bookmarks...</p>
                  <p className="text-xs mt-1">Results will appear as they're processed</p>
                </>
              ) : (
                <p className="text-sm">No bookmarks to display</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
