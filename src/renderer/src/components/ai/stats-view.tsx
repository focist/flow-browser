import { BarChart3, Package } from 'lucide-react';

interface StatsViewProps {
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

export function StatsView({ stats }: StatsViewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Overview</h3>
        <p className="text-sm text-muted-foreground">
          Statistics across all analyzed bookmarks
        </p>
      </div>

      {/* Overall Stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">Statistics</h4>
        </div>
        <div className="space-y-2">
          <StatItem
            label="Unique Labels"
            value={stats.uniqueLabels}
            icon={<Package className="h-4 w-4" />}
          />
          <StatItem
            label="Avg Labels/Bookmark"
            value={stats.avgLabelsPerBookmark.toFixed(1)}
          />
          <StatItem
            label="High Conf. Patterns"
            value={stats.highConfidencePatterns}
            icon={<div className="h-2 w-2 rounded-full bg-emerald-500" />}
          />
          <StatItem
            label="Medium Conf. Patterns"
            value={stats.mediumConfidencePatterns}
            icon={<div className="h-2 w-2 rounded-full bg-blue-500" />}
          />
          <StatItem
            label="Low Conf. Patterns"
            value={stats.lowConfidencePatterns}
            icon={<div className="h-2 w-2 rounded-full bg-slate-500" />}
          />
          <StatItem
            label="Domains"
            value={stats.totalDomains}
          />
        </div>
      </div>
    </div>
  );
}
