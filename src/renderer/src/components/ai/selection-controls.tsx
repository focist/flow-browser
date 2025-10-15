import { Button } from '../ui/button';

interface SelectionControlsProps {
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedCount: number;
  totalCount: number;
}

/**
 * Reusable selection control buttons for Select All / Deselect All.
 *
 * Automatically disables buttons when appropriate:
 * - Select All disabled when all items are selected
 * - Deselect All disabled when no items are selected
 */
export function SelectionControls({
  onSelectAll,
  onDeselectAll,
  selectedCount,
  totalCount
}: SelectionControlsProps) {
  return (
    <div className="flex gap-2 min-w-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        disabled={selectedCount === totalCount}
        className="flex-1 min-w-0"
      >
        Select All
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDeselectAll}
        disabled={selectedCount === 0}
        className="flex-1 min-w-0"
      >
        Deselect All
      </Button>
    </div>
  );
}
