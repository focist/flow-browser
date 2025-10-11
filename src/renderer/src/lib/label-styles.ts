/**
 * Utility functions for label styling in the AI dashboard
 */

export type LabelCategory = 'topic' | 'type' | 'priority';

export interface LabelStyleConfig {
  bg: string;
  text: string;
  border: string;
  bgDark: string;
  textDark: string;
  borderDark: string;
}

/**
 * Get Tailwind CSS classes for a label category
 */
export function getCategoryStyles(category: LabelCategory): string {
  const styles: Record<LabelCategory, string> = {
    topic: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
    type: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800',
    priority: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
  };

  return styles[category];
}

/**
 * Get category icon emoji
 */
export function getCategoryIcon(category: LabelCategory): string {
  const icons: Record<LabelCategory, string> = {
    topic: '🏷️',
    type: '📁',
    priority: '⭐'
  };

  return icons[category];
}

/**
 * Get category display name
 */
export function getCategoryName(category: LabelCategory): string {
  const names: Record<LabelCategory, string> = {
    topic: 'Topics',
    type: 'Types',
    priority: 'Priority'
  };

  return names[category];
}
