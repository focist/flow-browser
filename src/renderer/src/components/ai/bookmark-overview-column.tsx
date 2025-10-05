import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Clock, Zap, Sparkles, Loader2 } from 'lucide-react';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';

interface BookmarkOverviewColumnProps {
  bookmarks: DashboardBookmark[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  getConfidenceLevel: (confidence: number) => 'high' | 'medium' | 'low';
  isAnalyzing?: boolean;
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
}

const BookmarkItem: React.FC<{
  bookmark: DashboardBookmark;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ bookmark, isSelected, onToggle }) => {
  const totalLabels = bookmark.remainingLabels.length + bookmark.autoAppliedLabels.length;
  const autoAppliedCount = bookmark.autoAppliedLabels.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`flex items-start gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors ${
        isSelected ? 'bg-accent border-primary' : 'bg-card'
      }`}
      onClick={onToggle}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{bookmark.bookmark.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {totalLabels > 0 && (
            <Badge variant="outline" className="text-xs h-5">
              {totalLabels} label{totalLabels !== 1 ? 's' : ''}
            </Badge>
          )}
          {autoAppliedCount > 0 && (
            <Badge variant="outline" className="text-xs h-5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
              <Sparkles className="h-3 w-3 mr-0.5" />
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
  onToggleExpanded
}) => {
  if (count === 0) return null;

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
            {bookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.bookmark.id}
                bookmark={bookmark}
                isSelected={selectedIds.has(bookmark.bookmark.id)}
                onToggle={() => onToggleSelection(bookmark.bookmark.id)}
              />
            ))}
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
  isAnalyzing = false
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
