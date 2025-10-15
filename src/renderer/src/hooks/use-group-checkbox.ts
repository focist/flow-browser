import { useMemo, useCallback, Dispatch, SetStateAction } from 'react';

type CheckboxState = 'checked' | 'unchecked' | 'indeterminate';

interface UseGroupCheckboxReturn {
  state: CheckboxState;
  toggle: () => void;
}

/**
 * Hook for managing group checkbox state and toggle behavior.
 *
 * Calculates the checkbox state based on how many items in the group are selected:
 * - 'checked': All items selected
 * - 'unchecked': No items selected
 * - 'indeterminate': Some items selected
 *
 * @param groupIds - Array of IDs in this group
 * @param selectedIds - Set of currently selected IDs
 * @param setSelectedIds - State setter for selected IDs
 * @returns Object with current state and toggle function
 */
export function useGroupCheckbox(
  groupIds: string[],
  selectedIds: Set<string>,
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>
): UseGroupCheckboxReturn {
  const state = useMemo((): CheckboxState => {
    const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === groupIds.length) return 'checked';
    return 'indeterminate';
  }, [groupIds, selectedIds]);

  const toggle = useCallback(() => {
    const allSelected = groupIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in group
        groupIds.forEach(id => next.delete(id));
      } else {
        // Select all in group
        groupIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, [groupIds, selectedIds, setSelectedIds]);

  return { state, toggle };
}
