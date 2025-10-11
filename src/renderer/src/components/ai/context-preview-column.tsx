import { useEffect, useState } from 'react';
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
  const [displayMode, setDisplayMode] = useState<PreviewMode>(mode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isColumnHovered, setIsColumnHovered] = useState(false);

  useEffect(() => {
    // If the mode is changing TO a preview mode (pattern/bookmark/bulk-impact), switch immediately
    if (mode !== 'stats' && mode !== displayMode) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayMode(mode);
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    }

    // If mode is 'stats' but we're showing a preview, only switch back if:
    // 1. User is NOT hovering over this column, AND
    // 2. Enough time has passed (to allow mouse movement between columns)
    if (mode === 'stats' && displayMode !== 'stats') {
      if (isColumnHovered) {
        // User is hovering over the column - keep the preview visible
        return;
      }

      // Add delay to allow user to move mouse from source to column 3
      const timer = setTimeout(() => {
        setDisplayMode('stats');
      }, 1200); // Longer delay to give user time to move mouse to column 3
      return () => clearTimeout(timer);
    }

    // If both mode and displayMode are 'stats', ensure we're in sync
    if (mode === 'stats' && displayMode === 'stats') {
      // Already in stats mode, nothing to do
      return;
    }
  }, [mode, displayMode, isColumnHovered]);

  const renderContent = (): React.ReactNode => {
    switch (displayMode) {
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
        if (selectedBookmarks.length > 0 && onApplyBulk) {
          return (
            <BulkImpactView
              selectedBookmarks={selectedBookmarks}
              onApplyToSelected={onApplyBulk}
            />
          );
        }
        return <StatsView stats={stats} />;

      case 'stats':
      default:
        return <StatsView stats={stats} />;
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      onMouseEnter={() => {
        setIsColumnHovered(true);
        onColumnHover?.(true);
      }}
      onMouseLeave={() => {
        setIsColumnHovered(false);
        onColumnHover?.(false);
      }}
    >
      {/* Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <h2 className="text-lg font-semibold">
          {displayMode === 'pattern' && 'Pattern Preview'}
          {displayMode === 'bookmark' && 'Bookmark Preview'}
          {displayMode === 'bulk-impact' && 'Bulk Impact'}
          {displayMode === 'stats' && 'Overview'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {displayMode === 'pattern' && 'Hover over patterns to see affected bookmarks'}
          {displayMode === 'bookmark' && 'Hover over bookmarks to see applicable labels'}
          {displayMode === 'bulk-impact' && 'Review and customize bulk operations'}
          {displayMode === 'stats' && 'Statistics and overview'}
        </p>
      </div>

      {/* Content Area with Transition */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 w-full min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={displayMode}
              className="w-full min-w-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isTransitioning ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
