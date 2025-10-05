import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Zap, Check, X, Sparkles, BarChart3, Package, RefreshCw } from 'lucide-react';
import type { BulkOperationProgress } from '../../hooks/use-bulk-operations';
import type { DashboardBookmark } from '../../hooks/use-dashboard-state';

interface BulkActionsColumnProps {
  selectedBookmarks: DashboardBookmark[];
  isProcessing: boolean;
  progress: BulkOperationProgress | null;
  onAcceptHighConfidence: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onReprocess: () => void;
  stats: {
    totalLabels: number;
    uniqueLabels: number;
    avgLabelsPerBookmark: number;
    highConfidencePatterns: number;
    mediumConfidencePatterns: number;
    lowConfidencePatterns: number;
    totalDomains: number;
  };
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  variant = 'default'
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      title={description}
      className={`h-auto px-4 py-2 flex items-center gap-2 justify-start hover:bg-accent/50 ${
        variant === 'destructive' ? 'border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30' : ''
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{title}</span>
    </Button>
  );
};

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon }) => {
  return (
    <div className="flex items-center justify-between p-3 rounded border bg-card">
      <div className="flex items-center gap-2">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
};

export const BulkActionsColumn: React.FC<BulkActionsColumnProps> = ({
  selectedBookmarks,
  isProcessing,
  progress,
  onAcceptHighConfidence,
  onAcceptAll,
  onRejectAll,
  onReprocess,
  stats
}) => {
  const selectedCount = selectedBookmarks.length;
  const hasSelection = selectedCount > 0;

  // Calculate stats for selected bookmarks
  const selectedStats = React.useMemo(() => {
    if (!hasSelection) {
      return {
        totalLabels: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0
      };
    }

    let totalLabels = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    selectedBookmarks.forEach(b => {
      const labels = [...b.autoAppliedLabels, ...b.remainingLabels];
      totalLabels += labels.length;

      labels.forEach(l => {
        if (l.confidence >= 0.85) highConfidence++;
        else if (l.confidence >= 0.60) mediumConfidence++;
        else lowConfidence++;
      });
    });

    return { totalLabels, highConfidence, mediumConfidence, lowConfidence };
  }, [selectedBookmarks, hasSelection]);

  const progressPercentage = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">Bulk Actions</h2>
        {hasSelection ? (
          <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium">
              {selectedCount} bookmark{selectedCount !== 1 ? 's' : ''} selected
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select bookmarks to perform bulk operations
          </p>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Progress Indicator */}
          {isProcessing && progress && (
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing...</span>
                <Badge variant="secondary">{progressPercentage}%</Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {progress.current && (
                <p className="text-xs text-muted-foreground truncate">
                  {progress.current}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {progress.completed} of {progress.total} completed
              </p>
            </div>
          )}

          {/* Selection Stats */}
          {hasSelection && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">Selection Stats</h3>
              </div>
              <div className="space-y-2">
                <StatItem
                  label="Total Labels"
                  value={selectedStats.totalLabels}
                  icon={<Package className="h-4 w-4" />}
                />
                <StatItem
                  label="High Confidence"
                  value={selectedStats.highConfidence}
                  icon={<div className="h-2 w-2 rounded-full bg-emerald-500" />}
                />
                <StatItem
                  label="Medium Confidence"
                  value={selectedStats.mediumConfidence}
                  icon={<div className="h-2 w-2 rounded-full bg-blue-500" />}
                />
                <StatItem
                  label="Low Confidence"
                  value={selectedStats.lowConfidence}
                  icon={<div className="h-2 w-2 rounded-full bg-slate-500" />}
                />
              </div>
            </div>
          )}

          {/* Overall Stats */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">Overall Statistics</h3>
            </div>
            <div className="space-y-2">
              <StatItem
                label="Unique Labels"
                value={stats.uniqueLabels}
              />
              <StatItem
                label="Avg Labels/Bookmark"
                value={stats.avgLabelsPerBookmark.toFixed(1)}
              />
              <StatItem
                label="High Conf. Patterns"
                value={stats.highConfidencePatterns}
              />
              <StatItem
                label="Domains"
                value={stats.totalDomains}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
