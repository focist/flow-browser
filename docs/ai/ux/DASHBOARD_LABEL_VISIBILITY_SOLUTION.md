# AI Dashboard Label Visibility Solution

## Problem Statement

Users currently cannot see the relationship between labels and bookmarks in the AI Labeling Dashboard. When clicking "Apply All" on a pattern, they have no visibility into:

1. Which specific bookmarks will receive that label
2. What labels a specific bookmark will get if they apply all patterns
3. The impact of bulk operations before execution

This creates a blind spot that reduces user confidence and makes it difficult to understand the consequences of bulk operations.

## Current State Analysis

### Data Already Available
The system already has the necessary data through `LabelPattern.bookmarkIds` and the `getBookmarksWithLabel()` helper function. The problem is purely one of visibility and interaction design.

### Three-Column Layout
- **Column 1**: Bookmarks grouped by confidence (high/medium/low/none)
- **Column 2**: Label patterns with "Apply All" buttons
- **Column 3**: Statistics and bulk actions (currently stats-only)

### Key Constraints
- Must maintain the three-column layout
- Cannot significantly increase UI clutter
- Must work for both individual patterns and bulk operations
- Should provide fast, intuitive visual feedback

---

## Solution 1: Bidirectional Hover Highlighting

### Interaction Pattern

**Pattern → Bookmark Direction:**
When hovering over a pattern item in Column 2, visually highlight all bookmarks in Column 1 that will receive that label.

**Bookmark → Pattern Direction:**
When hovering over a bookmark in Column 1, show an indicator of which patterns/labels will apply to it.

### Visual Treatment

**On Pattern Hover:**
1. Dim all non-affected bookmarks in Column 1 (reduce opacity to 40%)
2. Highlight affected bookmarks with:
   - Subtle blue border glow (`ring-2 ring-blue-500/50`)
   - Slightly elevated background (`bg-blue-50 dark:bg-blue-950/20`)
   - Smooth transition animation (200ms)
3. Update pattern card to show exact count: "Will apply to 12 bookmarks" (emphasized text)

**On Bookmark Hover:**
1. Expand bookmark card slightly to show a compact list of patterns that would apply
2. Display as small pill badges below the bookmark title
3. Color-code by category (topic/type/priority)
4. Show confidence level as a small indicator dot

**Enhanced "Apply All" Button:**
When hovering over the "Apply All" button specifically:
- Show tooltip: "Apply 'JavaScript' to 12 bookmarks"
- Instantly trigger the highlight effect without needing to hover the whole card

### Implementation Details

**Component Changes:**

1. **`LabelSuggestionsColumn` (Pattern Items):**
   ```tsx
   const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);

   // Pass to parent dashboard
   onPatternHover={setHoveredPatternId}

   // On PatternItem
   onMouseEnter={() => onPatternHover(`${pattern.label}::${pattern.category}`)}
   onMouseLeave={() => onPatternHover(null)}
   ```

2. **`BookmarkOverviewColumn` (Bookmark Items):**
   ```tsx
   // Receive hoveredPatternId from parent
   const isHighlighted = hoveredPatternId &&
     bookmark.remainingLabels.some(l => `${l.label}::${l.category}` === hoveredPatternId);

   className={`
     transition-all duration-200
     ${isHighlighted ? 'ring-2 ring-blue-500/50 bg-blue-50 dark:bg-blue-950/20' : ''}
     ${hoveredPatternId && !isHighlighted ? 'opacity-40' : 'opacity-100'}
   `}
   ```

3. **`AILabelingDashboard` (Coordination):**
   - Manage `hoveredPatternId` state
   - Pass down to both columns
   - Coordinate highlighting logic

**New Helper Function:**
```tsx
// In use-pattern-detection.tsx
const getBookmarkIdsForPattern = useCallback((patternKey: string): string[] => {
  const pattern = labelPatterns.find(p => `${p.label}::${p.category}` === patternKey);
  return pattern?.bookmarkIds || [];
}, [labelPatterns]);
```

### Pros
1. **Immediate visual feedback** - Users see exactly what will happen in real-time
2. **No additional clicks** - Pure hover interaction is fast and intuitive
3. **Bidirectional understanding** - Works both ways (pattern→bookmark and bookmark→pattern)
4. **Non-intrusive** - Doesn't add permanent UI elements
5. **Works with existing layout** - No structural changes needed
6. **Scales well** - Even with hundreds of bookmarks, highlighting is clear
7. **Familiar pattern** - Similar to filter highlighting in other applications

### Cons
1. **Mobile/touch limitations** - Hover doesn't work on touch devices (but this is a desktop app)
2. **High bookmark counts** - With 100+ bookmarks, scrolling while highlighted might be needed
3. **No persistent preview** - Highlighting disappears when mouse moves away
4. **Accessibility concern** - Screen reader users won't get this visual feedback
5. **Performance** - Need to ensure smooth transitions with many bookmarks

### Accessibility Enhancements
- Add `aria-describedby` to pattern items: "Applies to 12 bookmarks: [list of bookmark IDs]"
- Provide keyboard navigation to trigger highlight states (focus instead of hover)
- Add screen reader announcements when patterns are focused

---

## Solution 2: Dynamic Preview Column with Expandable Controls

### Interaction Pattern

**Repurpose Column 3** as a dynamic context panel with expandable sections that shows:
- **Default state**: Overall statistics (current behavior)
- **On pattern hover**: Preview of affected bookmarks with expandable list and exclusion controls
- **On bookmark hover**: Preview of applicable patterns with expandable details and label selection
- **On multi-select**: Impact analysis with expandable breakdowns for granular control

### Visual Treatment

**Default State (Stats):**
```
┌─ Overview ──────────────────────┐
│ Statistics                      │
│ • 45 Unique Labels              │
│ • 3.2 Avg Labels/Bookmark       │
│ • 12 High Confidence Patterns   │
└─────────────────────────────────┘
```

**Pattern Hover State:**
```
┌─ Pattern Preview ───────────────┐
│ JavaScript (Topic)              │
│ 12 bookmarks will receive this  │
│                                 │
│ High Confidence (8) [▼ Expand]  │
│ Medium Confidence (4)           │
│                                 │
│ [Apply to All (12)]             │
└─────────────────────────────────┘

When expanded:

┌─ Pattern Preview ───────────────┐
│ JavaScript (Topic)              │
│ 12 bookmarks will receive this  │
│                                 │
│ High Confidence (8) [▲ Collapse]│
│ ☑ React Documentation (95%)     │
│ ☑ Node.js Tutorial (93%)        │
│ ☑ Express.js Guide (91%)        │
│ ☑ TypeScript Handbook (90%)     │
│ ☑ Webpack Config Guide (89%)    │
│ ☑ Babel Setup Tutorial (88%)    │
│ ☑ ESLint Documentation (87%)    │
│ ☑ NPM Package Guide (86%)       │
│                                 │
│ Medium Confidence (4)           │
│                                 │
│ [Select All] [Deselect All]     │
│ [Apply to Selected (8)]         │
└─────────────────────────────────┘
```

**Bookmark Hover State:**
```
┌─ Bookmark Preview ──────────────┐
│ React Documentation             │
│ Will receive 3 labels           │
│                                 │
│ High Confidence (2) [▼ Expand]  │
│ Medium Confidence (1)           │
│ Auto-applied (1)                │
└─────────────────────────────────┘

When expanded:

┌─ Bookmark Preview ──────────────┐
│ React Documentation             │
│ Will receive 3 labels           │
│                                 │
│ High Confidence (2) [▲ Collapse]│
│ ☑ JavaScript (Topic) - 95%      │
│ ☑ Tutorial (Type) - 88%         │
│                                 │
│ Medium Confidence (1) [▼ Expand]│
│                                 │
│ Auto-applied (1)                │
│ • Documentation (Type) - 96%    │
│                                 │
│ [Apply Selected Labels (2)]     │
└─────────────────────────────────┘
```

**Bulk Selection State:**
```
┌─ Bulk Impact Preview ───────────┐
│ 5 bookmarks selected            │
│                                 │
│ "Accept All Labels" will:       │
│ • Apply 18 total labels         │
│ • 12 high confidence            │
│ • 4 medium confidence           │
│ • 2 low confidence              │
│                                 │
│ Bookmarks (5) [▼ Expand]        │
│                                 │
│ [Continue] [Cancel]             │
└─────────────────────────────────┘

When expanded:

┌─ Bulk Impact Preview ───────────┐
│ 5 bookmarks selected            │
│                                 │
│ Bookmarks (5) [▲ Collapse]      │
│                                 │
│ ☑ React Docs (+3) [▼ Details]   │
│ ☑ Node.js Tutorial (+4)         │
│ ☑ Express Guide (+2)            │
│ ☑ Vue.js Intro (+5)             │
│ ☑ TypeScript Guide (+4)         │
│                                 │
│ Total: 18 labels                │
│                                 │
│ [Select All] [Deselect All]     │
│ [Apply to Selected (5)]         │
└─────────────────────────────────┘

When bookmark details expanded:

┌─ Bulk Impact Preview ───────────┐
│ 5 bookmarks selected            │
│                                 │
│ Bookmarks (5) [▲ Collapse]      │
│                                 │
│ ☑ React Docs (+3) [▲ Details]   │
│   ☑ JavaScript (Topic) - 95%    │
│   ☑ Tutorial (Type) - 88%       │
│   ☑ Web Dev (Topic) - 82%       │
│                                 │
│ ☑ Node.js Tutorial (+4)         │
│ ☑ Express Guide (+2)            │
│ ☑ Vue.js Intro (+5)             │
│ ☑ TypeScript Guide (+4)         │
│                                 │
│ [Apply to Selected]             │
└─────────────────────────────────┘
```

### Implementation Details

**Component Restructure:**

1. **Create `ContextPreviewColumn` Component:**
   ```tsx
   type PreviewMode = 'stats' | 'pattern' | 'bookmark' | 'bulk-impact';

   interface ContextPreviewColumnProps {
     mode: PreviewMode;
     stats: PatternStats;
     selectedPattern?: LabelPattern;
     selectedBookmark?: DashboardBookmark;
     selectedBookmarks?: DashboardBookmark[];
     onApplyToSelected?: (ids: string[]) => void;
     onApplySelectedLabels?: (bookmarkId: string, labelIds: string[]) => void;
     // ... other props
   }
   ```

2. **State Management in `AILabelingDashboard`:**
   ```tsx
   const [previewMode, setPreviewMode] = useState<PreviewMode>('stats');
   const [previewContext, setPreviewContext] = useState<any>(null);

   // On pattern hover
   const handlePatternHover = (pattern: LabelPattern | null) => {
     if (pattern) {
       setPreviewMode('pattern');
       setPreviewContext(pattern);
     } else {
       setPreviewMode('stats');
       setPreviewContext(null);
     }
   };
   ```

3. **Sub-components for Each Mode with Expandable Sections:**
   - `StatsView` (default)
   - `PatternPreviewView` (shows affected bookmarks with expandable list and checkboxes)
   - `BookmarkPreviewView` (shows applicable labels with expandable confidence groups)
   - `BulkImpactView` (shows bulk operation consequences with expandable bookmark details)

**Interaction Flow:**
- Hover on pattern → Column 3 switches to pattern preview mode
- Click expand → Shows full list of affected bookmarks with checkboxes
- Uncheck bookmarks → "Apply to Selected" button updates count
- Hover on bookmark → Column 3 switches to bookmark preview mode
- Click expand confidence group → Shows labels with checkboxes to exclude specific labels
- Select bookmarks → Column 3 switches to bulk impact mode
- Click expand bookmarks list → Shows all affected bookmarks with checkboxes
- Click expand bookmark details → Shows labels for that specific bookmark
- Mouse leaves → Column 3 returns to stats mode (with 300ms delay to prevent flicker)

**Expandable Section States:**
```tsx
interface ExpandableState {
  // For pattern preview
  expandedConfidenceGroups: Set<'high' | 'medium' | 'low'>;
  selectedBookmarkIds: Set<string>; // Bookmarks included in apply operation

  // For bookmark preview
  expandedLabelGroups: Set<'high' | 'medium' | 'low'>;
  selectedLabelIds: Set<string>; // Labels to apply

  // For bulk impact
  expandedBookmarkList: boolean;
  expandedBookmarkDetails: Set<string>; // Which bookmarks show label details
  selectedOperations: Map<string, Set<string>>; // bookmarkId -> labelIds to apply
}
```

### Pros
1. **Dedicated space** - Doesn't interfere with existing columns
2. **Rich context** - Can show more detailed information
3. **Maintains clean layout** - Expandable sections keep UI clean when not needed
4. **Supports all interactions** - Works for patterns, bookmarks, and bulk ops
5. **Granular control** - Checkboxes allow precise selection/exclusion of items
6. **Clear separation** - Users know where to look for preview info
7. **Better for large datasets** - More space to display bookmark lists
8. **Progressive disclosure** - Complexity hidden until user expands sections
9. **Actionable** - Can modify selections before applying
10. **Persistent view** - Expanded information stays visible until collapsed

### Cons
1. **Eye travel** - Users need to look at Column 3 while interacting with Columns 1-2
2. **Less direct** - Not as immediately connected as highlighting
3. **Column 3 loses stats** - Statistics become secondary (though still accessible)
4. **Cognitive load** - Users need to understand the mode switching and expansion behavior
5. **Hover delay needed** - Must prevent flickering on quick mouse movements
6. **State complexity** - Managing mode transitions and expansion states adds complexity
7. **Extra interactions** - Requires clicks to expand and manage selections

### Expandable Section Interaction Patterns

**Expand/Collapse Behavior:**
- Click anywhere on the confidence group header to toggle
- Chevron icon rotates to indicate state (▼ collapsed, ▲ expanded)
- Smooth animation (200ms) when expanding/collapsing
- Only one confidence group expanded at a time (accordion pattern)
- Expanding a new group auto-collapses the previous one

**Checkbox Behavior:**
- All items checked by default
- Unchecking an item excludes it from the operation
- "Select All" / "Deselect All" buttons for quick control
- Button text updates to show selected count: "Apply to Selected (8)"
- Disabled state when no items selected

**Nested Expansion (Bulk Impact):**
- First level: Expand to see all affected bookmarks
- Second level: Click individual bookmark to see its labels
- Independent expansion states for each bookmark
- Scroll within expanded section if content exceeds available space

---

## Recommended Solution: Hybrid Approach (Solutions 1 + 2)

After analyzing both approaches, I recommend implementing a **hybrid of Solutions 1 and 2** to get the best of both worlds.

### Why This Combination Works

**Solution 1 (Hover Highlighting)** provides:
- Immediate, intuitive visual feedback
- Direct connection between patterns and bookmarks
- Low cognitive overhead
- Fast interaction for power users

**Solution 2 (Dynamic Preview Column with Expandable Controls)** provides:
- Detailed information when needed
- Dedicated space for context
- Granular control through expandable sections with checkboxes
- Support for complex bulk operations
- Better accessibility

**Together**, they create a comprehensive visibility system where:
1. **Quick glances** are served by hover highlighting
2. **Detailed inspection** is served by the preview column
3. **Precise control** is provided through expandable sections
4. **Both work simultaneously** - highlighting shows "where," preview shows "what," expandable controls show "how to customize"

### Implementation Strategy

**Phase 1: Core Highlighting (Solution 1)**
1. Add hover state management to `AILabelingDashboard`
2. Implement bidirectional highlighting between Columns 1 and 2
3. Add smooth transitions and visual polish
4. Ensure accessibility with focus states

**Phase 2: Preview Column with Expandable Sections (Solution 2)**
1. Refactor Column 3 from `BulkActionsColumn` to `ContextPreviewColumn`
2. Implement mode switching (stats/pattern/bookmark/bulk)
3. Create sub-components for each preview mode with expandable section support
4. Add expansion/collapse state management
5. Implement checkbox selection logic
6. Add transition animations for both mode switching and expand/collapse

**Phase 3: Integration**
1. Coordinate hover highlighting with preview column updates
2. Synchronize checkbox states with apply operations
3. Update button labels to reflect selections ("Apply to Selected (X)")
4. Implement keyboard navigation for accessibility
5. Polish animations and timing

### User Experience Flow

**Scenario 1: Quick Pattern Application**
1. User hovers over "JavaScript" pattern in Column 2
2. Affected bookmarks highlight in Column 1 (immediate feedback)
3. Column 3 shows summary: "12 bookmarks will receive this label"
4. User clicks "Apply All" with full confidence

**Scenario 2: Selective Pattern Application**
1. User hovers over "JavaScript" pattern in Column 2
2. Affected bookmarks highlight in Column 1
3. Column 3 shows preview with "High Confidence (8) [▼ Expand]"
4. User clicks expand to see full list of 8 bookmarks
5. User unchecks 2 bookmarks they want to exclude
6. Button updates to "Apply to Selected (6)"
7. User clicks apply, only 6 bookmarks receive the label

**Scenario 3: Bookmark Label Inspection**
1. User hovers over bookmark in Column 1
2. Column 3 shows preview with confidence groups
3. User expands "High Confidence (2)" to see specific labels
4. User unchecks "Tutorial" label (wants to exclude it)
5. User clicks "Apply Selected Labels (1)"
6. Only "JavaScript" label is applied, "Tutorial" is skipped

**Scenario 4: Bulk Operation with Granular Control**
1. User selects 5 bookmarks
2. Column 3 switches to bulk impact preview
3. Shows "18 total labels" with "Bookmarks (5) [▼ Expand]"
4. User expands to see all 5 bookmarks
5. User expands "React Docs (+3)" to see its 3 labels
6. User unchecks one label to exclude it
7. User unchecks entire "Vue.js Intro" bookmark
8. Button updates to "Apply to Selected (4)"
9. User executes with precise control over what gets applied

### Visual Harmony

**Color Coding:**
- Blue highlights for pattern-bookmark relationships
- Emerald for high confidence operations
- Amber for medium confidence operations
- Slate for low confidence operations

**Animation Timing:**
- Highlight transitions: 200ms ease-in-out
- Preview column mode switch: 300ms ease-in-out
- Expand/collapse animations: 200ms ease-in-out
- Checkbox state changes: 100ms ease-in-out
- Hover delay before mode switch: 150ms (prevents flicker)
- Return to stats delay: 500ms (allows mouse movement)

**Typography Hierarchy:**
- Preview column headers: 16px semibold
- Expandable section headers: 14px medium
- Bookmark/label titles in preview: 14px regular
- Confidence scores: 12px regular
- Counts and stats: 12px tabular numbers
- Button labels: 14px medium

### Accessibility Features

**Keyboard Navigation:**
- Tab through patterns, focus triggers highlight + preview
- Tab into preview column to interact with expandable sections
- Arrow keys to navigate within expanded lists
- Space to toggle checkboxes
- Enter to expand/collapse sections or apply operations
- Escape to collapse expanded sections or return to stats mode
- Screen reader announces affected bookmark counts and selection states

**ARIA Labels:**
- Pattern items: `aria-label="JavaScript topic pattern, applies to 12 bookmarks"`
- Highlighted bookmarks: `aria-label="Will receive JavaScript label"`
- Preview column: `role="complementary" aria-label="Context preview"`
- Expandable sections: `aria-expanded="true/false"` and `aria-controls="section-id"`
- Checkboxes: `aria-label="Include React Documentation (95% confidence)"`
- Action buttons: `aria-label="Apply JavaScript label to 6 selected bookmarks"`

**Focus Management:**
- Focus ring matches highlight color scheme
- Focus within preview column scrolls into view
- Focus moves to first checkbox when section expands
- Focus returns to expand button when section collapses
- Modal focus trap for bulk operation confirmations

### Technical Considerations

**Performance:**
- Debounce hover events (50ms) to reduce re-renders
- Virtual scrolling for expanded bookmark lists > 50 items
- Memoize highlight calculations and checkbox state computations
- Use CSS transforms for smooth animations (GPU acceleration)
- Lazy render expanded sections (only render when expanded)
- Optimize checkbox state updates with Set operations

**State Management:**
```tsx
interface PreviewState {
  mode: 'stats' | 'pattern' | 'bookmark' | 'bulk-impact';
  hoveredPatternId: string | null;
  hoveredBookmarkId: string | null;

  // Expandable section states
  expandedSections: {
    confidenceGroups: Set<'high' | 'medium' | 'low'>;
    bookmarkDetails: Set<string>; // bookmark IDs
  };

  // Selection states for granular control
  selections: {
    bookmarkIds: Set<string>; // For pattern preview
    labelIds: Set<string>; // For bookmark preview
    bulkOperations: Map<string, Set<string>>; // bookmarkId -> labelIds
  };
}
```

**Data Flow:**
```
AILabelingDashboard (state coordinator)
  ├─> BookmarkOverviewColumn (receives hoveredPatternId)
  ├─> LabelSuggestionsColumn (sends onPatternHover)
  └─> ContextPreviewColumn
      ├─ receives previewState
      ├─ sends onExpandSection
      ├─ sends onToggleSelection
      ├─ sends onApplyToSelected
      └─ manages internal expansion and selection state
```

### Edge Cases Handled

1. **No bookmarks for pattern**: Preview shows "No bookmarks will be affected", expand button disabled
2. **No patterns for bookmark**: Preview shows "No label suggestions available"
3. **Large lists (>50 items)**: Use virtual scrolling in expanded sections
4. **All items unchecked**: Apply button becomes disabled with tooltip "Select at least one item"
5. **Rapid hovering**: Debounce prevents flickering during mode transitions
6. **Rapid expansion/collapse**: Prevent animation stacking with proper cleanup
7. **Mode change while expanded**: Collapse all sections when switching preview modes
8. **Multi-monitor**: Preview column remains within viewport
9. **Dark mode**: All colors and checkbox styles have dark mode variants
10. **Long bookmark/label names**: Truncate with ellipsis and show full name on hover

### Success Metrics

The solution succeeds when:
1. Users can identify affected bookmarks in <2 seconds
2. Users can exclude specific items from bulk operations without confusion
3. Zero "Apply All" operations are executed blindly
4. Users can explain what a bulk operation will do before executing
5. Checkbox interactions are intuitive and responsive
6. Accessibility score remains 100%
7. No performance degradation with 500+ bookmarks
8. Expandable sections load and animate smoothly

---

## Implementation Recommendations

### Recommended Path: Hybrid (1 + 2)

**Reason:** Provides the most comprehensive UX solution that serves both quick interactions and detailed inspection needs. The combination addresses all user scenarios with granular control capabilities.

**Rollout Strategy:**
1. Start with Solution 1 (hover highlighting) - lower complexity, high impact
2. Validate with users and gather feedback
3. Add Solution 2 base (preview column with mode switching) without expandable sections
4. Validate preview column behavior and information display
5. Add expandable sections and checkbox controls for granular selection
6. Polish integration, transitions, and accessibility
7. Optimize performance for large datasets

### Alternative Path: Solution 1 Only

**Reason:** If development resources are limited or the full hybrid approach proves too complex initially, Solution 1 provides immediate value with minimal complexity.

**Rollout Strategy:**
1. Implement hover highlighting between columns
2. Gather user feedback on visibility improvements
3. Plan expansion to full hybrid approach based on user needs
4. Consider adding simple hover tooltips showing counts as interim enhancement

---

## Component Architecture Changes

### New Files to Create

1. **`src/renderer/src/components/ai/context-preview-column.tsx`**
   - Main preview column component
   - Mode switching logic
   - Sub-component coordination

2. **`src/renderer/src/components/ai/pattern-preview-view.tsx`**
   - Shows affected bookmarks for a pattern
   - Expandable confidence group sections
   - Checkbox selection for excluding bookmarks
   - Dynamic "Apply to Selected" button

3. **`src/renderer/src/components/ai/bookmark-preview-view.tsx`**
   - Shows applicable labels for a bookmark
   - Expandable confidence group sections
   - Checkbox selection for excluding labels
   - Dynamic "Apply Selected Labels" button

4. **`src/renderer/src/components/ai/bulk-impact-view.tsx`**
   - Shows consequences of bulk operations
   - Expandable bookmark list section
   - Nested expandable bookmark details
   - Checkbox selection at bookmark and label levels
   - Dynamic "Apply to Selected" button

5. **`src/renderer/src/components/ai/stats-view.tsx`**
   - Extracted from current `BulkActionsColumn`
   - Overall statistics display

6. **`src/renderer/src/components/ai/expandable-section.tsx`**
   - Reusable expandable section component
   - Handles expand/collapse animations
   - Manages ARIA attributes
   - Supports accordion pattern

### Files to Modify

1. **`src/renderer/src/components/ai/ai-labeling-dashboard.tsx`**
   - Add preview state management
   - Coordinate hover events
   - Replace `BulkActionsColumn` with `ContextPreviewColumn`

2. **`src/renderer/src/components/ai/bookmark-overview-column.tsx`**
   - Accept `hoveredPatternId` prop
   - Apply highlighting styles
   - Emit `onBookmarkHover` events

3. **`src/renderer/src/components/ai/label-suggestions-column.tsx`**
   - Emit `onPatternHover` events
   - Update hover states
   - Add enhanced tooltips

4. **`src/renderer/src/hooks/use-pattern-detection.tsx`**
   - Add helper: `getPatternById(patternId: string)`
   - Add helper: `getBookmarksForPattern(patternId: string)`
   - Add helper: `getPatternsForBookmark(bookmarkId: string)`

### Code Examples

**ExpandableSection Component:**
```tsx
interface ExpandableSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  level?: number; // For nested sections
}

export function ExpandableSection({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  level = 0
}: ExpandableSectionProps) {
  const contentId = useId();

  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700', level > 0 && 'ml-4')}>
      <button
        className="w-full flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="text-sm font-medium">
          {title} ({count})
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <motion.div
        id={contentId}
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="pb-2">{children}</div>
      </motion.div>
    </div>
  );
}
```

**PatternPreviewView with Expandable Sections:**
```tsx
interface PatternPreviewViewProps {
  pattern: LabelPattern;
  bookmarks: DashboardBookmark[];
  onApplyToSelected: (bookmarkIds: string[]) => void;
}

export function PatternPreviewView({
  pattern,
  bookmarks,
  onApplyToSelected
}: PatternPreviewViewProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(bookmarks.map(b => b.id))
  );

  // Group bookmarks by confidence
  const grouped = useMemo(() => {
    const high = bookmarks.filter(b => {
      const label = b.remainingLabels.find(l =>
        l.label === pattern.label && l.category === pattern.category
      );
      return label && label.confidence >= 85;
    });
    const medium = bookmarks.filter(b => {
      const label = b.remainingLabels.find(l =>
        l.label === pattern.label && l.category === pattern.category
      );
      return label && label.confidence >= 70 && label.confidence < 85;
    });
    const low = bookmarks.filter(b => {
      const label = b.remainingLabels.find(l =>
        l.label === pattern.label && l.category === pattern.category
      );
      return label && label.confidence < 70;
    });
    return { high, medium, low };
  }, [bookmarks, pattern]);

  const handleToggle = (bookmarkId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(bookmarks.map(b => b.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{pattern.label}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {bookmarks.length} bookmarks will receive this label
        </p>
      </div>

      {grouped.high.length > 0 && (
        <ExpandableSection
          title="High Confidence"
          count={grouped.high.length}
          isExpanded={expandedGroup === 'high'}
          onToggle={() => setExpandedGroup(prev => prev === 'high' ? null : 'high')}
        >
          <div className="space-y-1 px-3">
            {grouped.high.map(bookmark => {
              const label = bookmark.remainingLabels.find(l =>
                l.label === pattern.label && l.category === pattern.category
              );
              return (
                <label
                  key={bookmark.id}
                  className="flex items-center gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bookmark.id)}
                    onChange={() => handleToggle(bookmark.id)}
                    className="rounded"
                    aria-label={`Include ${bookmark.title} (${label?.confidence}% confidence)`}
                  />
                  <span className="flex-1 text-sm truncate">{bookmark.title}</span>
                  <span className="text-xs text-gray-500">
                    {label?.confidence}%
                  </span>
                </label>
              );
            })}
          </div>
        </ExpandableSection>
      )}

      {/* Similar sections for medium and low */}

      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          disabled={selectedIds.size === bookmarks.length}
        >
          Select All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeselectAll}
          disabled={selectedIds.size === 0}
        >
          Deselect All
        </Button>
      </div>

      <Button
        className="w-full"
        onClick={() => onApplyToSelected(Array.from(selectedIds))}
        disabled={selectedIds.size === 0}
      >
        Apply to Selected ({selectedIds.size})
      </Button>
    </div>
  );
}
```

**BulkImpactView with Nested Expansion:**
```tsx
export function BulkImpactView({
  selectedBookmarks,
  onApplyToSelected
}: BulkImpactViewProps) {
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [expandedBookmarkIds, setExpandedBookmarkIds] = useState<Set<string>>(new Set());
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(
    new Set(selectedBookmarks.map(b => b.id))
  );
  const [labelSelections, setLabelSelections] = useState<Map<string, Set<string>>>(
    new Map(selectedBookmarks.map(b => [
      b.id,
      new Set(b.remainingLabels.map(l => `${l.label}::${l.category}`))
    ]))
  );

  const totalLabels = useMemo(() => {
    let total = 0;
    selectedBookmarkIds.forEach(bookmarkId => {
      total += labelSelections.get(bookmarkId)?.size || 0;
    });
    return total;
  }, [selectedBookmarkIds, labelSelections]);

  const toggleBookmarkExpansion = (bookmarkId: string) => {
    setExpandedBookmarkIds(prev => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Bulk Impact Preview</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedBookmarks.length} bookmarks selected
        </p>
      </div>

      <ExpandableSection
        title="Bookmarks"
        count={selectedBookmarks.length}
        isExpanded={isListExpanded}
        onToggle={() => setIsListExpanded(!isListExpanded)}
      >
        <div className="space-y-2 px-3">
          {selectedBookmarks.map(bookmark => (
            <div key={bookmark.id} className="border-l-2 border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBookmarkIds.has(bookmark.id)}
                  onChange={() => {
                    setSelectedBookmarkIds(prev => {
                      const next = new Set(prev);
                      if (next.has(bookmark.id)) {
                        next.delete(bookmark.id);
                      } else {
                        next.add(bookmark.id);
                      }
                      return next;
                    });
                  }}
                  className="rounded"
                />
                <span className="flex-1 text-sm truncate">{bookmark.title}</span>
                <span className="text-xs text-gray-500">
                  +{bookmark.remainingLabels.length}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleBookmarkExpansion(bookmark.id);
                  }}
                  className="p-1"
                >
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform',
                      expandedBookmarkIds.has(bookmark.id) && 'rotate-180'
                    )}
                  />
                </button>
              </label>

              {expandedBookmarkIds.has(bookmark.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-8 mt-1 space-y-1"
                >
                  {bookmark.remainingLabels.map(label => {
                    const labelKey = `${label.label}::${label.category}`;
                    const isSelected = labelSelections.get(bookmark.id)?.has(labelKey);

                    return (
                      <label
                        key={labelKey}
                        className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer rounded"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setLabelSelections(prev => {
                              const next = new Map(prev);
                              const bookmarkLabels = new Set(next.get(bookmark.id));
                              if (bookmarkLabels.has(labelKey)) {
                                bookmarkLabels.delete(labelKey);
                              } else {
                                bookmarkLabels.add(labelKey);
                              }
                              next.set(bookmark.id, bookmarkLabels);
                              return next;
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-xs flex-1">
                          {label.label} ({label.category})
                        </span>
                        <span className="text-xs text-gray-500">
                          {label.confidence}%
                        </span>
                      </label>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </ExpandableSection>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        Total: {totalLabels} labels across {selectedBookmarkIds.size} bookmarks
      </div>

      <Button
        className="w-full"
        onClick={() => onApplyToSelected(selectedBookmarkIds, labelSelections)}
        disabled={selectedBookmarkIds.size === 0 || totalLabels === 0}
      >
        Apply to Selected ({selectedBookmarkIds.size})
      </Button>
    </div>
  );
}
```

### No New Dependencies Required

All functionality can be implemented with existing dependencies:
- Motion (framer-motion) for animations
- Radix UI components for accessible interactions
- TailwindCSS for styling
- Existing React hooks

---

## Conclusion

The label visibility problem is critical for user confidence in the AI Labeling Dashboard. The recommended **hybrid approach combining hover highlighting and a dynamic preview column with expandable controls** provides the most comprehensive solution:

- **Immediate feedback** through visual highlighting
- **Detailed context** through the preview column
- **Granular control** through expandable sections with checkboxes
- **Progressive disclosure** that keeps UI clean until detailed control is needed
- **Works for all scenarios**: single patterns, bookmarks, and bulk operations
- **Accessible and performant** with proper implementation
- **Enhances rather than replaces** the existing three-column layout

This solution transforms the dashboard from a "blind application" tool into a "fully transparent, fully controllable" label management system where users:

1. **Immediately see** what will be affected (hover highlighting)
2. **Can inspect details** when needed (expandable sections)
3. **Have precise control** over what gets applied (checkboxes)
4. **Understand consequences** before executing (preview summaries)
5. **Can exclude specific items** without disrupting their workflow

The expandable preview functionality addresses the original visibility problem while adding a powerful layer of granular control that users didn't know they needed. This positions the AI Labeling Dashboard as a professional-grade tool that respects user agency and provides full transparency into automated operations.
