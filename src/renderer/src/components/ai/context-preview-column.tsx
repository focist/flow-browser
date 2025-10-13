import { motion, AnimatePresence } from 'motion/react';
import { StatsView } from './stats-view';
import { PatternPreviewView } from './pattern-preview-view';
import { BookmarkPreviewView } from './bookmark-preview-view';
import { BulkImpactView } from './bulk-impact-view';
import { ScrollArea } from '../ui/scroll-area';
import type { LabelPattern } from '../../hooks/use-pattern-detection';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';

export type PreviewMode = 'stats' | 'pattern' | 'bookmark' | 'bulk-impact';

interface ContextPreviewColumnProps {
  mode: PreviewMode;
  stats: {
    totalLabels: number;
    uniqueLabels: number;
    avgLabelsPerBookmark: number;
    highConfidencePatterns: number;
    mediumConfidencePatterns: number;
    lowConfidencePatterns: number;
    totalDomains: number;
  };
  selectedPattern?: LabelPattern | null;
  selectedBookmark?: DashboardBookmark | null;
  selectedBookmarks?: DashboardBookmark[];
  affectedBookmarks?: DashboardBookmark[];
  onApplyPattern?: (bookmarkIds: string[]) => void;
  onApplyBookmarkLabels?: (labelIds: string[]) => void;
  onApplyBulk?: (bookmarkIds: string[], labelSelections: Map<string, Set<string>>) => void;
  onColumnHover?: (isHovered: boolean) => void;
}

export function ContextPreviewColumn({
  mode,
  stats,
  selectedPattern,
  selectedBookmark,
  selectedBookmarks = [],
  affectedBookmarks = [],
  onApplyPattern,
  onApplyBookmarkLabels,
  onApplyBulk,
  onColumnHover
}: ContextPreviewColumnProps) {
  // Simply use the mode prop directly - no local state management
  // The dashboard handles all mode logic and timing
  const renderContent = (): React.ReactNode => {
    switch (mode) {
      case 'pattern':
        if (selectedPattern && affectedBookmarks.length > 0 && onApplyPattern) {
          return (
            <PatternPreviewView
              pattern={selectedPattern}
              bookmarks={affectedBookmarks}
              onApplyToSelected={onApplyPattern}
            />
          );
        }
        return <StatsView stats={stats} />;

      case 'bookmark':
        if (selectedBookmark && onApplyBookmarkLabels) {
          return (
            <BookmarkPreviewView
              bookmark={selectedBookmark}
              onApplySelectedLabels={onApplyBookmarkLabels}
            />
          );
        }
        return <StatsView stats={stats} />;

      case 'bulk-impact':
        return (
          <BulkImpactView
            selectedBookmarks={selectedBookmarks}
            onApplyToSelected={onApplyBulk || (() => {})}
          />
        );

      case 'stats':
      default:
        return <StatsView stats={stats} />;
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      onMouseEnter={() => onColumnHover?.(true)}
      onMouseLeave={() => onColumnHover?.(false)}
    >
      {/* Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <h2 className="text-lg font-semibold">
          {mode === 'pattern' && 'Pattern Preview'}
          {mode === 'bookmark' && 'Bookmark Preview'}
          {mode === 'bulk-impact' && 'Bulk Impact'}
          {mode === 'stats' && 'Overview'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'pattern' && 'Hover over patterns to see affected bookmarks'}
          {mode === 'bookmark' && 'Hover over bookmarks to see applicable labels'}
          {mode === 'bulk-impact' && 'Review and customize bulk operations'}
          {mode === 'stats' && 'Statistics and overview'}
        </p>
      </div>

      {/* Content Area with Transition */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 w-full min-w-0">
          <AnimatePresence mode="sync">
            <motion.div
              key={mode}
              className="w-full min-w-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
