import { useState, useCallback, Dispatch, SetStateAction } from 'react';

interface UseShiftClickSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string;
  initialSelection?: Set<string>;
}

interface UseShiftClickSelectionReturn {
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  lastClickedId: string | null;
  handleToggle: (id: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

/**
 * Hook for managing selection state with shift-click range selection support.
 *
 * Provides:
 * - Selection state management with Set-based storage
 * - Shift-click to select/deselect ranges
 * - Select all / deselect all functionality
 *
 * @param items - Array of items that can be selected
 * @param getId - Function to extract unique ID from an item
 * @param initialSelection - Optional initial set of selected IDs
 */
export function useShiftClickSelection<T>({
  items,
  getId,
  initialSelection
}: UseShiftClickSelectionOptions<T>): UseShiftClickSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    initialSelection || new Set()
  );
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string, event?: React.ChangeEvent<HTMLInputElement>) => {
    // Determine action based on checkbox state (what we're transitioning TO)
    const action = event?.target.checked ? 'select' : 'deselect';

    if ((event?.nativeEvent as any)?.shiftKey && lastClickedId) {
      // Find indices in the items array
      const allIds = items.map(getId);
      const lastIndex = allIds.indexOf(lastClickedId);
      const currentIndex = allIds.indexOf(id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        // Apply the action to all items in the range
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        setSelectedIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const itemId = allIds[i];
            if (action === 'select') {
              next.add(itemId);
            } else {
              next.delete(itemId);
            }
          }
          return next;
        });
      }
    } else {
      // Normal click - apply action
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (action === 'select') {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    }

    // Update last clicked ID
    setLastClickedId(id);
  }, [items, getId, lastClickedId]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    lastClickedId,
    handleToggle,
    selectAll,
    deselectAll
  };
}
