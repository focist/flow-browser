import { ReactNode } from 'react';
import { ExpandableSection } from './expandable-section';

type ConfidenceLevel = 'High' | 'Medium' | 'Low';
type CheckboxState = 'checked' | 'unchecked' | 'indeterminate';

interface ConfidenceGroupSectionProps<T> {
  level: ConfidenceLevel;
  items: T[];
  isExpanded: boolean;
  onToggle: () => void;
  groupCheckboxState: CheckboxState;
  onGroupToggle: () => void;
  selectedIds: Set<string>;
  getId: (item: T) => string;
  onItemToggle: (id: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
}

/**
 * Generic component for rendering a confidence level section with items.
 *
 * Wraps ExpandableSection with:
 * - Group checkbox in header for selecting/deselecting all items
 * - Item list with individual checkboxes
 * - Automatic indeterminate state support
 *
 * @param level - Confidence level: High, Medium, or Low
 * @param items - Array of items to display
 * @param isExpanded - Whether section is currently expanded
 * @param onToggle - Callback when section is expanded/collapsed
 * @param groupCheckboxState - State of the group checkbox
 * @param onGroupToggle - Callback when group checkbox is clicked
 * @param selectedIds - Set of currently selected item IDs
 * @param getId - Function to extract ID from an item
 * @param onItemToggle - Callback when an item checkbox is clicked
 * @param renderItem - Function to render each item (receives item and isSelected flag)
 */
export function ConfidenceGroupSection<T>({
  level,
  items,
  isExpanded,
  onToggle,
  groupCheckboxState,
  onGroupToggle,
  selectedIds,
  getId,
  onItemToggle,
  renderItem
}: ConfidenceGroupSectionProps<T>) {
  if (items.length === 0) return null;

  return (
    <ExpandableSection
      title={`${level} Confidence`}
      count={items.length}
      isExpanded={isExpanded}
      onToggle={onToggle}
      headerAction={
        <input
          type="checkbox"
          checked={groupCheckboxState === 'checked'}
          ref={(el) => {
            if (el) {
              el.indeterminate = groupCheckboxState === 'indeterminate';
            }
          }}
          onChange={onGroupToggle}
          className="rounded"
          aria-label={`Select all ${level.toLowerCase()} confidence items`}
        />
      }
    >
      <div className="space-y-1 px-3 min-w-0">
        {items.map(item => {
          const id = getId(item);
          const isSelected = selectedIds.has(id);
          return (
            <label
              key={id}
              className="flex items-center gap-2 py-1 hover:bg-accent rounded px-2 cursor-pointer transition-colors min-w-0 max-w-full overflow-hidden"
              onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onItemToggle(id, e)}
                className="rounded flex-shrink-0"
              />
              {renderItem(item, isSelected)}
            </label>
          );
        })}
      </div>
    </ExpandableSection>
  );
}
