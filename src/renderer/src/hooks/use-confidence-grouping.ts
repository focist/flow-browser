import { useMemo } from 'react';

interface ConfidenceGroups<T> {
  high: T[];
  medium: T[];
  low: T[];
}

/**
 * Hook for grouping items by confidence level.
 *
 * Groups items into three categories:
 * - High: confidence >= 0.85
 * - Medium: confidence >= 0.60 and < 0.85
 * - Low: confidence < 0.60
 *
 * @param items - Array of items to group
 * @param getConfidence - Function to extract confidence value from an item
 * @returns Object with high, medium, and low arrays
 */
export function useConfidenceGrouping<T>(
  items: T[],
  getConfidence: (item: T) => number
): ConfidenceGroups<T> {
  return useMemo(() => {
    const high: T[] = [];
    const medium: T[] = [];
    const low: T[] = [];

    items.forEach(item => {
      const confidence = getConfidence(item);
      if (confidence >= 0.85) {
        high.push(item);
      } else if (confidence >= 0.60) {
        medium.push(item);
      } else {
        low.push(item);
      }
    });

    return { high, medium, low };
  }, [items, getConfidence]);
}
