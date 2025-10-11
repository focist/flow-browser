import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Tag, Sparkles, TrendingUp } from 'lucide-react';
import type { LabelPattern, CategoryPattern } from '../../hooks/use-pattern-detection';
import { getCategoryStyles } from '../../lib/label-styles';

interface LabelSuggestionsColumnProps {
  labelPatterns: LabelPattern[];
  categoryPatterns: CategoryPattern[];
  onApplyPattern: (pattern: LabelPattern) => void;
  onApplyCategory: (category: CategoryPattern) => void;
  isProcessing: boolean;
  selectedBookmarkCount: number;
  onPatternHover?: (patternId: string | null) => void;
  hoveredBookmarkId?: string | null;
}

interface PatternItemProps {
  pattern: LabelPattern;
  onApply: () => void;
  isProcessing: boolean;
  onHover?: (patternId: string | null) => void;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

const PatternItem: React.FC<PatternItemProps> = ({ pattern, onApply, isProcessing, onHover, isHighlighted = false, isDimmed = false }) => {
  const confidenceColor = {
    high: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
    medium: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
    low: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
  };

  const patternId = `${pattern.label}::${pattern.category}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200 overflow-hidden ${
        isHighlighted ? 'ring-2 ring-blue-500/50 bg-blue-50 dark:bg-blue-950/20' : ''
      } ${
        isDimmed ? 'opacity-40' : 'opacity-100'
      }`}
      onMouseEnter={() => onHover?.(patternId)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(patternId)}
      onBlur={() => onHover?.(null)}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate min-w-0">{pattern.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs h-5 flex-shrink-0 ${getCategoryStyles(pattern.category)}`}>
              {pattern.category}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {pattern.count} bookmark{pattern.count !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onApply}
            disabled={isProcessing}
          >
            <Check className="h-3 w-3 mr-1" />
            Apply All
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

interface CategorySectionProps {
  category: CategoryPattern;
  onApplyPattern: (pattern: LabelPattern) => void;
  onApplyCategory: () => void;
  isProcessing: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onPatternHover?: (patternId: string | null) => void;
  hoveredBookmarkId?: string | null;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  onApplyPattern,
  onApplyCategory,
  isProcessing,
  expanded,
  onToggleExpanded,
  onPatternHover,
  hoveredBookmarkId
}) => {
  const categoryIcons = {
    topic: '🏷️',
    type: '📁',
    priority: '⭐'
  };

  const categoryNames = {
    topic: 'Topics',
    type: 'Types',
    priority: 'Priority'
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryIcons[category.category]}</span>
          <div className="text-left">
            <h3 className="font-medium text-sm">{categoryNames[category.category]}</h3>
            <p className="text-xs text-muted-foreground">
              {category.labels.length} pattern{category.labels.length !== 1 ? 's' : ''} • {category.totalBookmarks} bookmark{category.totalBookmarks !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onApplyCategory();
            }}
            disabled={isProcessing}
          >
            <Check className="h-3 w-3 mr-1" />
            Apply All
          </Button>
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
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 pl-2"
          >
            {category.labels.map((pattern) => {
              const patternId = `${pattern.label}::${pattern.category}`;
              const isHighlighted = hoveredBookmarkId && pattern.bookmarkIds.includes(hoveredBookmarkId);
              const isDimmed = hoveredBookmarkId && !pattern.bookmarkIds.includes(hoveredBookmarkId);

              return (
                <PatternItem
                  key={patternId}
                  pattern={pattern}
                  onApply={() => onApplyPattern(pattern)}
                  isProcessing={isProcessing}
                  onHover={onPatternHover}
                  isHighlighted={!!isHighlighted}
                  isDimmed={!!isDimmed}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LabelSuggestionsColumn: React.FC<LabelSuggestionsColumnProps> = ({
  labelPatterns,
  categoryPatterns,
  onApplyPattern,
  onApplyCategory,
  isProcessing,
  selectedBookmarkCount,
  onPatternHover,
  hoveredBookmarkId
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState({
    topic: true,
    type: true,
    priority: true
  });

  const toggleCategory = (category: 'topic' | 'type' | 'priority') => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const topPatterns = labelPatterns.slice(0, 5);
  const hasPatterns = labelPatterns.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Label Suggestions</h2>
          <Badge variant="secondary">{labelPatterns.length}</Badge>
        </div>
        {selectedBookmarkCount > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {selectedBookmarkCount} bookmark{selectedBookmarkCount !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      {/* Patterns List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Top Patterns */}
          {hasPatterns && topPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">Top Patterns</h3>
              </div>
              <div className="space-y-2">
                {topPatterns.map((pattern) => {
                  const patternId = `${pattern.label}::${pattern.category}`;
                  const isHighlighted = hoveredBookmarkId && pattern.bookmarkIds.includes(hoveredBookmarkId);
                  const isDimmed = hoveredBookmarkId && !pattern.bookmarkIds.includes(hoveredBookmarkId);

                  return (
                    <PatternItem
                      key={patternId}
                      pattern={pattern}
                      onApply={() => onApplyPattern(pattern)}
                      isProcessing={isProcessing}
                      onHover={onPatternHover}
                      isHighlighted={!!isHighlighted}
                      isDimmed={!!isDimmed}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Sections */}
          {categoryPatterns.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="font-medium text-sm mb-3">By Category</h3>
                <div className="space-y-3">
                  {categoryPatterns.map((category) => (
                    <CategorySection
                      key={category.category}
                      category={category}
                      onApplyPattern={onApplyPattern}
                      onApplyCategory={() => onApplyCategory(category)}
                      isProcessing={isProcessing}
                      expanded={expandedCategories[category.category as keyof typeof expandedCategories]}
                      onToggleExpanded={() => toggleCategory(category.category as 'topic' | 'type' | 'priority')}
                      onPatternHover={onPatternHover}
                      hoveredBookmarkId={hoveredBookmarkId}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!hasPatterns && (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No Label Patterns</p>
              <p className="text-xs mt-1">Analyze bookmarks to see suggested labels</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
