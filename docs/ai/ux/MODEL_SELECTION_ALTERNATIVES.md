# Model Selection UI Alternatives

## Context

The current AI Settings interface uses a standard dropdown (Radix UI Select) for model selection. While functional, this approach has significant limitations:

**Current Problems:**

- Text gets "smushed" within the select trigger
- Limited space to display rich model metadata (pricing, capabilities, context window)
- Model details are only visible in a small info card AFTER selection
- Difficult to compare models side-by-side
- Poor discoverability of model capabilities

**Available Data Per Model:**

```typescript
{
  id: string                    // e.g., "gpt-4o", "claude-opus-4-5"
  name: string                  // Display name
  provider: string              // "openai", "anthropic"
  description: string           // What the model is good for
  contextWindow: number         // e.g., 128000
  pricing: {
    inputCostPerMillion: number
    outputCostPerMillion: number
  }
  capabilities: {
    vision: boolean
    functionCalling: boolean
    streaming: boolean
    batchProcessing: boolean
  }
  tags: string[]               // e.g., ["recommended", "budget", "fast"]
}
```

---

## Alternative 1: Radio Card Grid

### Visual Description

A grid of card-style radio buttons, each displaying comprehensive model information. Cards would be arranged in a 2-column or 3-column grid (depending on available width), with each card containing:

```
┌─────────────────────────────────────────┐
│ ○ GPT-4o                     [RECOMMENDED]│
│   Most capable model                      │
│                                           │
│   💰 $2.50 / $10.00 per 1M tokens        │
│   📝 128K context                         │
│   👁️ Vision  🔧 Functions                 │
└─────────────────────────────────────────┘
```

### Behavior

- Click anywhere on the card to select
- Selected card has distinct visual state (border, background color, checkmark)
- Cards can expand vertically to show full descriptions without truncation
- Hover states show additional details or subtle elevation

### Implementation Pattern

```tsx
<RadioGroup value={selectedModel} onValueChange={setModel}>
  <div className="grid grid-cols-2 gap-3">
    {models.map((model) => (
      <RadioCard key={model.id} value={model.id} model={model} />
    ))}
  </div>
</RadioGroup>
```

### Pros

- **High information density** - Shows all key details at a glance
- **Easy comparison** - Users can compare models side-by-side
- **Clear selection state** - Obvious which model is selected
- **Scannable** - Visual hierarchy makes it easy to find the right model
- **Familiar pattern** - Common in pricing pages, plan selection
- **Accessible** - Native radio semantics, keyboard navigable

### Cons

- **Takes more vertical space** - With 10+ models, could require scrolling
- **Fixed layout** - Less flexible than a dropdown for very long model lists
- **May feel overwhelming** - If there are many models (20+)

### Best For

- 3-15 models per provider
- Settings pages with dedicated real estate
- Users who need to compare options
- Desktop/tablet interfaces (this app fits)

---

## Alternative 2: Combobox with Rich Preview

### Visual Description

A hybrid between a dropdown and autocomplete. The trigger shows the selected model name, but when opened, displays a searchable list with rich previews for each option.

**Closed state:**

```
┌─────────────────────────────────┐
│ GPT-4o                        ▼ │
└─────────────────────────────────┘
```

**Open state with rich items:**

```
┌─────────────────────────────────────────────────────┐
│ Search models...                                    │
├─────────────────────────────────────────────────────┤
│ ● GPT-4o                            [RECOMMENDED]   │
│   Most capable model                                │
│   $2.50 / $10.00 per 1M • 128K context             │
│   Vision, Functions                                 │
├─────────────────────────────────────────────────────┤
│   GPT-4o mini                            [BUDGET]   │
│   Fast and affordable                               │
│   $0.15 / $0.60 per 1M • 128K context              │
│   Vision, Functions                                 │
├─────────────────────────────────────────────────────┤
│   ...                                               │
└─────────────────────────────────────────────────────┘
```

### Behavior

- Opens like a dropdown but with larger, richer items
- Optional search/filter at top of popover
- Scrollable list for many models
- Selected model highlighted with checkmark
- Hover shows additional tooltip with full description

### Implementation Pattern

Uses Radix UI Combobox or enhanced Select with custom item rendering:

```tsx
<Combobox value={selectedModel} onValueChange={setModel}>
  <ComboboxTrigger>
    <ComboboxValue />
  </ComboboxTrigger>
  <ComboboxContent className="w-[500px]">
    <ComboboxInput placeholder="Search models..." />
    <ComboboxList>
      {models.map((model) => (
        <ComboboxItem key={model.id} value={model.id} className="min-h-[80px] py-3">
          <ModelRichPreview model={model} />
        </ComboboxItem>
      ))}
    </ComboboxList>
  </ComboboxContent>
</Combobox>
```

### Pros

- **Compact when closed** - Doesn't take up space until needed
- **Searchable** - Can filter through many models quickly
- **Rich information** - Shows all details without requiring selection first
- **Familiar interaction** - Still feels like a dropdown/select
- **Scales well** - Works with 5 or 50 models
- **Progressive disclosure** - Hides complexity until user opens it

### Cons

- **Requires click to see options** - Not immediately visible
- **Harder to compare** - Only see one screenful at a time
- **More complex** - Combobox behavior is more involved than radio buttons
- **Scrolling required** - For long lists, must scroll through popover

### Best For

- 10+ models per provider
- When screen space is limited
- Users who know what they're looking for (via search)
- When model list might grow over time

---

## Alternative 3: Segmented List with Expandable Details

### Visual Description

A vertical list where each model is initially shown in a compact row. Clicking a model both selects it AND expands it to show full details.

**List view:**

```
┌─────────────────────────────────────────────────────┐
│ ● GPT-4o                            [RECOMMENDED] ▼ │
│                                                      │
│   Most capable GPT-4 model with vision and function │
│   calling. Best for complex reasoning and analysis. │
│                                                      │
│   💰 Input: $2.50 per 1M tokens                     │
│   💰 Output: $10.00 per 1M tokens                   │
│   📝 Context: 128,000 tokens                        │
│   ✅ Vision  ✅ Functions  ✅ Streaming              │
│                                                      │
├─────────────────────────────────────────────────────┤
│   GPT-4o mini                            [BUDGET] ▶ │
├─────────────────────────────────────────────────────┤
│   o1                                              ▶ │
├─────────────────────────────────────────────────────┤
│   o1-mini                                [FAST]   ▶ │
└─────────────────────────────────────────────────────┘
```

### Behavior

- Click to select AND expand
- Only one model expanded at a time (accordion-style)
- Collapsed models show just name + tags
- Expanded model shows all metadata
- Visual indicator (radio or checkmark) shows selected state
- Chevron indicates expandable state

### Implementation Pattern

```tsx
<RadioGroup value={selectedModel} onValueChange={setModel}>
  <Accordion type="single" value={expandedModel} onValueChange={setExpandedModel}>
    {models.map((model) => (
      <AccordionItem key={model.id} value={model.id}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value={model.id} />
          <AccordionTrigger className="flex-1">
            <ModelHeader model={model} />
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <ModelDetails model={model} />
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
</RadioGroup>
```

### Pros

- **Progressive disclosure** - Compact by default, detailed on demand
- **Clear hierarchy** - Easy to scan model names
- **Focused information** - One expanded model prevents overwhelm
- **Good for learning** - Users can explore each model's details
- **Scalable** - Works well with any number of models
- **Combines selection + exploration** - One interaction does both

### Cons

- **Requires extra click to see details** - Unlike Radio Cards
- **Can only view one at a time** - Harder to compare multiple models
- **More complex interaction** - Managing selection + expansion state
- **May feel slow** - If users need to expand many models to compare

### Best For

- Users unfamiliar with models who need to explore
- When you want to teach users about options
- Medium to large model lists (5-30 models)
- Balancing compactness with rich information

---

## Alternative 4: Data Table with Radio Selection

### Visual Description

A traditional table layout where each row is a model, with columns for key attributes. First column has radio buttons for selection.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Select │ Model      │ Tags        │ Context │ Input Cost │ Output Cost │
├──────────────────────────────────────────────────────────────────────┤
│   ●    │ GPT-4o     │ 🏆 Budget   │ 128K    │ $2.50/1M   │ $10.00/1M   │
│        │            │ 👁️ Vision   │         │            │             │
├──────────────────────────────────────────────────────────────────────┤
│   ○    │ GPT-4o mini│ 💰 Budget   │ 128K    │ $0.15/1M   │ $0.60/1M    │
│        │            │ ⚡ Fast      │         │            │             │
├──────────────────────────────────────────────────────────────────────┤
│   ○    │ o1         │ 🧠 Advanced │ 200K    │ $15.00/1M  │ $60.00/1M   │
│        │            │             │         │            │             │
└──────────────────────────────────────────────────────────────────────┘
```

**Expandable row variant** - Click row to expand full description below:

```
┌──────────────────────────────────────────────────────────────────────┐
│   ●    │ GPT-4o     │ 🏆 Budget   │ 128K    │ $2.50/1M   │ $10.00/1M   │▼
│                                                                        │
│        Most capable GPT-4 model with vision and function calling.     │
│        Best for complex reasoning and analysis tasks.                 │
│        Capabilities: Vision, Functions, Streaming, Batch Processing   │
└──────────────────────────────────────────────────────────────────────┘
```

### Behavior

- Radio button in first column for selection
- Entire row clickable to select
- Sortable columns (by price, context window, etc.)
- Optional expandable rows for full descriptions
- Hover highlights row

### Implementation Pattern

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-12"></TableHead>
      <TableHead>Model</TableHead>
      <TableHead>Tags</TableHead>
      <TableHead sortable>Context</TableHead>
      <TableHead sortable>Input Cost</TableHead>
      <TableHead sortable>Output Cost</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <RadioGroup value={selectedModel} onValueChange={setModel}>
      {models.map((model) => (
        <ModelTableRow key={model.id} model={model} />
      ))}
    </RadioGroup>
  </TableBody>
</Table>
```

### Pros

- **Excellent for comparison** - Side-by-side data comparison
- **Dense information** - Lots of data in minimal space
- **Sortable** - Users can sort by price, context, etc.
- **Familiar pattern** - Everyone understands tables
- **Scannable** - Easy to scan columns for specific criteria
- **Professional appearance** - Feels polished and data-driven

### Cons

- **Less visual appeal** - More utilitarian than cards
- **Rigid layout** - Doesn't adapt well to narrow screens
- **Harder to show rich content** - Long descriptions don't fit
- **Can feel overwhelming** - Lots of columns/data at once
- **Requires good UX** - Easy to make too dense or confusing

### Best For

- Power users who want to compare specs
- Many models with quantifiable differences
- Desktop applications with horizontal space
- Users who care about specific metrics (price, context window)
- When sorting/filtering is valuable

---

## Recommendation

### Primary Recommendation: Radio Card Grid (Alternative 1)

**Why this is best for Flow Browser's AI Settings:**

1. **Matches the use case** - Users select a model infrequently (settings page), so taking vertical space is acceptable
2. **Desktop-first app** - Electron app has more screen real estate than mobile
3. **Model count** - With OpenAI and Anthropic, likely 5-15 models total per provider - perfect range
4. **Comparison is key** - Users need to understand tradeoffs (price vs capability)
5. **Current pattern** - The existing UI already shows model details in a card below - this extends that pattern
6. **Design system fit** - Flow Browser uses Cards throughout (seen in the existing code)
7. **Accessibility** - Radio buttons are the most accessible pattern for single selection

### Implementation Approach

**Phase 1: Basic Radio Cards**

- Replace Select with RadioGroup + Card grid
- 2-column layout on desktop
- Show model name, description, tags, pricing, context window
- Selected state via border + background color

**Phase 2: Enhanced Details**

- Add capability icons (vision, functions, etc.)
- Cost estimator tooltip ("~$X for 100 bookmarks")
- Deprecation warnings for old models
- "Recommended for your use case" logic

**Phase 3: Refinements**

- Collapsible details for power users
- Quick search/filter above cards
- Group by provider if showing all at once
- Responsive: 1 column on narrow widths

### Secondary Recommendation: Combobox with Rich Preview (Alternative 2)

**If** the model list grows to 20+ models per provider, or if vertical space becomes constrained, switch to the Combobox pattern. This provides:

- Compact closed state
- Searchability for long lists
- Still shows rich information per model
- Better scalability

### Not Recommended

**Alternative 3 (Expandable List)** - Too many interactions (select + expand), harder to compare
**Alternative 4 (Table)** - Too utilitarian for this context, better suited to admin/power tools

---

## Design Specifications

### Radio Card Layout

```
Card Dimensions:
- Min width: 280px
- Min height: 160px (auto-expands for content)
- Padding: 16px
- Gap between cards: 12px
- Border radius: 8px

Selected State:
- Border: 2px solid primary color (e.g., blue-600)
- Background: subtle primary tint (e.g., blue-50)
- Checkmark or filled radio indicator

Unselected State:
- Border: 1px solid border color
- Background: card background
- Hover: subtle border color change + shadow

Typography:
- Model name: font-semibold text-base
- Description: text-sm text-muted-foreground
- Metadata: text-xs text-muted-foreground

Tags/Badges:
- Display as Badge components
- Max 3 visible, "+" indicator for more
- Color coding: Recommended (blue), Budget (green), Fast (purple)

Icons:
- Capability icons: 14px, muted color
- Pricing icon: 12px, inline with text
```

### Accessibility Requirements

- Proper radio button semantics (RadioGroup from Radix UI)
- Keyboard navigation: Arrow keys to move between options
- Space/Enter to select
- Focus visible indicators
- Screen reader announces: "[Model name], [description], [price], [capabilities]"
- Clear focus order through the grid

### Responsive Behavior

```
Desktop (>768px):   2 columns
Tablet (>640px):    2 columns
Mobile (<640px):    1 column
```

---

## Code Example

### Radio Card Component

```tsx
interface ModelCardProps {
  model: ModelMetadata;
  selected: boolean;
  onSelect: () => void;
}

function ModelCard({ model, selected, onSelect }: ModelCardProps) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition-all",
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
      )}
    >
      <input type="radio" checked={selected} onChange={onSelect} className="sr-only" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-base">{model.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
        </div>

        {selected && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
      </div>

      <div className="flex flex-wrap gap-1">
        {model.tags.includes("recommended") && (
          <Badge variant="default" className="text-xs">
            Recommended
          </Badge>
        )}
        {model.tags.includes("budget") && (
          <Badge variant="secondary" className="text-xs">
            Budget
          </Badge>
        )}
        {model.tags.includes("fast") && (
          <Badge variant="outline" className="text-xs">
            Fast
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          <span>
            ${model.pricing.inputCostPerMillion.toFixed(2)} / ${model.pricing.outputCostPerMillion.toFixed(2)} per 1M
            tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{(model.contextWindow / 1000).toFixed(0)}K context</span>
          {model.capabilities.vision && (
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" /> Vision
            </span>
          )}
          {model.capabilities.functionCalling && (
            <span className="flex items-center gap-0.5">
              <Code className="h-3 w-3" /> Functions
            </span>
          )}
        </div>
      </div>
    </label>
  );
}
```

### Usage in Settings

```tsx
{
  /* Model Selection - Radio Card Grid */
}
<div className="space-y-2">
  <Label>Select Model</Label>
  <div className="grid grid-cols-2 gap-3">
    {models.map((model) => (
      <ModelCard
        key={model.id}
        model={model}
        selected={settings.model === model.id}
        onSelect={() => handleSettingChange("model", model.id)}
      />
    ))}
  </div>
</div>;
```

---

## Migration Path

1. **Keep current dropdown as fallback** during development
2. **Build ModelCard component** with proper accessibility
3. **Test with real model data** from both providers
4. **A/B test** if possible (though probably not needed for settings)
5. **Remove old select** once validated
6. **Monitor user feedback** for any usability issues

---

## Future Enhancements

- **Model comparison mode** - Select 2-3 models to compare side-by-side
- **Cost estimator** - "This model will cost ~$X for 100 bookmarks"
- **Performance indicators** - Speed/latency estimates
- **Usage recommendations** - "Best for your use case" logic based on settings
- **Recently used** - Highlight recently used models
- **Provider switching** - Smooth transition when changing providers
- **Model search** - If list grows, add search filter above grid

---

## References

- Current implementation: `src/renderer/src/components/ai/ai-settings.tsx` (lines 306-342)
- Model interface: `src/shared/flow/interfaces/ai.ts` (lines 1-27)
- Select component: `src/renderer/src/components/ui/select.tsx`
