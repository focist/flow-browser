# AI Model Selection UX Design

**Document Status:** Design Proposal
**Created:** 2025-10-17
**Component:** AI Settings - Model Selector
**Framework:** Radix UI Select with React + TailwindCSS

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [UX Analysis](#ux-analysis)
3. [Design Principles](#design-principles)
4. [Proposed Solutions](#proposed-solutions)
5. [Recommended Solution](#recommended-solution)
6. [Implementation Guide](#implementation-guide)
7. [Accessibility Considerations](#accessibility-considerations)
8. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### Context

Users need to select an AI model from a dropdown in the AI Settings interface. Each model has extensive metadata that users need to make informed decisions:

- **Model name** (e.g., "GPT-4 Turbo", "Claude 3.5 Sonnet")
- **Tags** (Recommended, Budget, Fast)
- **Description** (1-2 sentences about capabilities)
- **Pricing** (Input/output cost per 1M tokens)
- **Context window** (e.g., 128K tokens)
- **Capabilities** (Vision support, Function calling)

### Current Implementation Issues

1. **Content Compression:** When detailed model information is placed inside `SelectItem` components, the content becomes squished and unreadable due to the fixed-height dropdown design.

2. **Trigger Button Mirroring:** Radix UI Select copies the `SelectItem` children into the trigger button when selected, causing complex layouts (badges, pricing, descriptions) to appear in the collapsed trigger state.

3. **Information Overload:** Displaying all model details inline makes the dropdown overwhelming and difficult to scan.

4. **Visual Hierarchy Problems:** Equal visual weight on all information makes it hard for users to quickly identify key differentiators between models.

### User Goals

- **Primary:** Quickly identify and select the appropriate AI model
- **Secondary:** Understand cost implications before selection
- **Secondary:** Identify model capabilities relevant to their use case
- **Tertiary:** Learn about model differences and make informed decisions

---

## UX Analysis

### Heuristic Evaluation

**1. Recognition Rather Than Recall (Nielsen #6)**

- Users shouldn't need to remember model details from external documentation
- Key information should be visible during the selection process

**2. Aesthetic and Minimalist Design (Nielsen #8)**

- Current approach shows too much information at once
- Need to prioritize essential details while keeping secondary info accessible

**3. Consistency and Standards (Nielsen #4)**

- Dropdown patterns typically show brief labels with expanded details on hover/selection
- Users expect triggers to show only the selected value, not full details

### Information Architecture Issues

**Current:** Flat information hierarchy in dropdown items

```
Model Name + Tags + Description + Pricing + Context + Capabilities
(All at same visual level)
```

**Ideal:** Progressive disclosure with clear hierarchy

```
Primary: Model Name + Recommended Tag
Secondary: Key differentiator (price tier OR special capability)
Tertiary: Full details (revealed on hover/selection)
```

### Cognitive Load Analysis

**Decision-Making Factors:**

1. **Recognition** - Is this a model I've heard of?
2. **Recommendation** - Is this the suggested option?
3. **Budget** - Can I afford this?
4. **Speed** - Is this fast enough?
5. **Capabilities** - Does it support my needs (vision, functions)?
6. **Context Window** - Can it handle my use case?

**Priority Order:**
High → Recognition & Recommendation
Medium → Price & Capabilities
Low → Context window, detailed specifications

---

## Design Principles

### 1. Progressive Disclosure

Show minimal information by default, reveal details progressively as users engage with options.

### 2. Scannability

Users should be able to quickly scan the list to identify viable options using visual markers (tags, icons).

### 3. Informed Decision-Making

Provide sufficient context at the point of decision without overwhelming users.

### 4. Consistency

Maintain predictable interaction patterns consistent with standard dropdown behavior.

### 5. Accessibility

Ensure screen reader users and keyboard-only users can access all information.

---

## Proposed Solutions

### Solution 1: Hover Tooltip with Simplified Items

**Design Approach:** Keep SelectItems minimal, show full details in hover tooltip

#### Visual Design

**Dropdown Item (Collapsed State):**

```
┌─────────────────────────────────────────┐
│ GPT-4 Turbo [Recommended] [$$$]        │
│ Claude 3.5 Sonnet [Fast] [$$$]         │
│ GPT-3.5 Turbo [Budget] [$]             │
│ Claude 3 Opus [Vision] [$$$$]          │
└─────────────────────────────────────────┘
```

**Hover State with Tooltip:**

```
┌─────────────────────────────────────────┐
│ GPT-4 Turbo [Recommended] [$$$]        │ ┌────────────────────────────┐
│ ╔═══════════════════════════════════╗  │ │ GPT-4 Turbo                │
│ ║ Claude 3.5 Sonnet [Fast] [$$$]   ║  │ │ Recommended • Fast         │
│ ╚═══════════════════════════════════╝  │ │                            │
│ GPT-3.5 Turbo [Budget] [$]             │ │ Anthropic's most advanced  │
└─────────────────────────────────────────┘ │ model with vision support  │
                                            │                            │
                                            │ $3.00/$15.00 per 1M tokens │
                                            │ 200K context • Vision      │
                                            │ Function calling           │
                                            └────────────────────────────┘
```

**Selected State (Trigger):**

```
┌─────────────────────────────────────────┐
│ Claude 3.5 Sonnet              ▼        │
└─────────────────────────────────────────┘
```

#### Implementation Pattern

```tsx
<Select value={selectedModel} onValueChange={setSelectedModel}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {models.map((model) => (
      <Tooltip key={model.id} delayDuration={300}>
        <TooltipTrigger asChild>
          <SelectItem value={model.id}>
            <span className="flex items-center gap-2">
              <span>{model.name}</span>
              {model.tags.includes("recommended") && <Badge size="sm">Recommended</Badge>}
              <span className="text-muted-foreground ml-auto">{getPriceIndicator(model.pricing)}</span>
            </span>
          </SelectItem>
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          <ModelDetailsTooltip model={model} />
        </TooltipContent>
      </Tooltip>
    ))}
  </SelectContent>
</Select>
```

#### Pros

- Clean, scannable dropdown list
- Trigger shows only model name (solves mirroring issue)
- Details available on-demand without cluttering interface
- Familiar pattern for power users
- Low visual complexity

#### Cons

- Requires hover interaction (not ideal for touch devices)
- Details not immediately visible
- May increase time-to-decision for users comparing models
- Tooltip positioning can be tricky with scrolling dropdowns
- Not optimal for first-time users who need to compare multiple options

#### Accessibility Notes

- Need keyboard shortcut to show tooltip for focused item
- Screen reader users would need aria-describedby pointing to tooltip
- Consider adding brief description directly in SelectItem for screen readers

---

### Solution 2: Two-Panel Comparison View (Recommended)

**Design Approach:** Split interface into list + detail panel, show full details for focused/hovered item

#### Visual Design

**Full Interface:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Select AI Model                                                     │
├──────────────────────────┬──────────────────────────────────────────┤
│ Models                   │ Claude 3.5 Sonnet                        │
│                          │ ┌────┐ ┌──────┐                          │
│ ┌──────────────────────┐ │ │Rec.│ │ Fast │                          │
│ │ GPT-4 Turbo         →│ │ └────┘ └──────┘                          │
│ │ [Recommended]        │ │                                          │
│ └──────────────────────┘ │ Anthropic's most intelligent model, with │
│                          │ top-level performance on highly complex  │
│ ╔══════════════════════╗ │ tasks and strong vision capabilities.    │
│ ║ Claude 3.5 Sonnet   →║ │                                          │
│ ║ [Fast]               ║ │ PRICING                                  │
│ ╚══════════════════════╝ │ Input:  $3.00 per 1M tokens             │
│                          │ Output: $15.00 per 1M tokens            │
│ ┌──────────────────────┐ │                                          │
│ │ GPT-3.5 Turbo       →│ │ CONTEXT WINDOW                           │
│ │ [Budget]             │ │ 200,000 tokens                           │
│ └──────────────────────┘ │                                          │
│                          │ CAPABILITIES                             │
│ ┌──────────────────────┐ │ ✓ Vision support                         │
│ │ Claude 3 Opus       →│ │ ✓ Function calling                       │
│ │ [Vision]             │ │ ✓ Streaming                              │
│ └──────────────────────┘ │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
                           [Select Model]
```

**Mobile/Narrow View:**

```
┌─────────────────────────────────┐
│ Select AI Model                 │
│                                 │
│ ╔═══════════════════════════╗   │
│ ║ Claude 3.5 Sonnet        ▼║   │
│ ╚═══════════════════════════╝   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Claude 3.5 Sonnet           │ │
│ │ Recommended • Fast          │ │
│ │                             │ │
│ │ Anthropic's most advanced   │ │
│ │ model with vision support   │ │
│ │                             │ │
│ │ $3/$15 per 1M • 200K ctx    │ │
│ │ ✓ Vision ✓ Functions        │ │
│ └─────────────────────────────┘ │
│                                 │
│          [Select Model]         │
└─────────────────────────────────┘
```

#### Implementation Pattern

```tsx
const [focusedModel, setFocusedModel] = useState<string | null>(null);
const [selectedModel, setSelectedModel] = useState<string>('');

<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
  {/* Model List Panel */}
  <div className="space-y-2">
    <Label>Available Models</Label>
    <div className="border rounded-lg overflow-hidden">
      {models.map(model => (
        <button
          key={model.id}
          className={cn(
            "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
            "flex items-center justify-between border-b last:border-b-0",
            focusedModel === model.id && "bg-accent",
            selectedModel === model.id && "bg-primary/10"
          )}
          onMouseEnter={() => setFocusedModel(model.id)}
          onClick={() => setSelectedModel(model.id)}
          onFocus={() => setFocusedModel(model.id)}
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">{model.name}</span>
            <span className="flex gap-1">
              {model.tags.includes('recommended') && (
                <Badge size="xs">Recommended</Badge>
              )}
              {model.tags.includes('fast') && (
                <Badge size="xs" variant="secondary">Fast</Badge>
              )}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  </div>

  {/* Detail Panel */}
  <div className="border rounded-lg p-4">
    {focusedModel ? (
      <ModelDetailPanel model={models.find(m => m.id === focusedModel)} />
    ) : (
      <EmptyState>Hover or select a model to view details</EmptyState>
    )}
  </div>
</div>

<Button onClick={handleSave}>Select Model</Button>
```

#### Pros

- **Best for comparison:** Users can easily compare models by hovering through list
- **Full information visible:** No hidden details, no cognitive load from tooltips
- **Clear selection state:** Obvious which model is selected vs. focused
- **Scales well:** Can show extensive details without space constraints
- **Accessibility:** All information available to screen readers
- **Touch-friendly:** Works on tablets without hover
- **Professional appearance:** Suitable for power users and decision-makers
- **Context retention:** Users can read details while keeping list visible

#### Cons

- Requires more vertical/horizontal space
- Not suitable for inline forms (needs dedicated section)
- More complex implementation than standard dropdown
- May be overkill for users who already know which model they want
- Requires responsive design for mobile

#### Accessibility Notes

- Excellent keyboard navigation (arrow keys through list, details update automatically)
- All content available to screen readers without additional interaction
- Focus management straightforward
- High contrast visual states

---

### Solution 3: Expandable Accordion-Style Dropdown

**Design Approach:** Keep dropdown format but allow items to expand inline to show details

#### Visual Design

**Collapsed State:**

```
┌─────────────────────────────────────────┐
│ GPT-4 Turbo [Recommended] [+]          │
│ Claude 3.5 Sonnet [Fast] [+]           │
│ GPT-3.5 Turbo [Budget] [+]             │
└─────────────────────────────────────────┘
```

**One Item Expanded:**

```
┌─────────────────────────────────────────┐
│ GPT-4 Turbo [Recommended] [+]          │
│                                         │
│ ╔═══════════════════════════════════╗   │
│ ║ Claude 3.5 Sonnet [Fast] [-]     ║   │
│ ║                                   ║   │
│ ║ Anthropic's most advanced model   ║   │
│ ║ with vision support               ║   │
│ ║                                   ║   │
│ ║ $3.00/$15.00 per 1M tokens        ║   │
│ ║ 200K context • Vision • Functions ║   │
│ ║                                   ║   │
│ ║         [Select This Model]       ║   │
│ ╚═══════════════════════════════════╝   │
│                                         │
│ GPT-3.5 Turbo [Budget] [+]             │
└─────────────────────────────────────────┘
```

**Selected State (Trigger):**

```
┌─────────────────────────────────────────┐
│ Claude 3.5 Sonnet              ▼        │
└─────────────────────────────────────────┘
```

#### Implementation Pattern

```tsx
const [expandedModel, setExpandedModel] = useState<string | null>(null);

<Select value={selectedModel} onValueChange={setSelectedModel}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {models.map((model) => (
      <div key={model.id} className="border-b last:border-b-0">
        {/* Collapsed Header */}
        <div
          className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            setExpandedModel(expandedModel === model.id ? null : model.id);
          }}
        >
          <span className="flex items-center gap-2">
            <span>{model.name}</span>
            {model.tags.includes("recommended") && <Badge size="sm">Recommended</Badge>}
          </span>
          <button onClick={(e) => e.stopPropagation()}>
            {expandedModel === model.id ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {/* Expanded Details */}
        {expandedModel === model.id && (
          <div className="p-3 bg-muted/50 space-y-2">
            <p className="text-sm text-muted-foreground">{model.description}</p>
            <div className="text-xs space-y-1">
              <div>
                Pricing: ${model.pricing.input}/${model.pricing.output} per 1M
              </div>
              <div>Context: {model.contextWindow} tokens</div>
              <div>Capabilities: {model.capabilities.join(", ")}</div>
            </div>
            <Button size="sm" className="w-full" onClick={() => setSelectedModel(model.id)}>
              Select This Model
            </Button>
          </div>
        )}
      </div>
    ))}
  </SelectContent>
</Select>;
```

#### Pros

- Maintains familiar dropdown pattern
- Details visible without leaving dropdown context
- Works within Radix Select framework
- User controls information disclosure
- Touch-friendly with clear tap targets

#### Cons

- **Violates Radix Select paradigm:** Select dropdowns aren't designed for expandable content
- **Complex interaction:** Click to expand vs. click to select is confusing
- **Accessibility challenges:** Screen readers may struggle with nested interactive elements
- **Event bubbling issues:** Managing expand/collapse vs. select events is error-prone
- **Visual clutter:** Dropdown grows very tall when items expanded
- **Mobile issues:** Large expanded items may extend beyond viewport

#### Accessibility Notes

- Requires careful ARIA labeling for expand/collapse buttons
- Keyboard navigation becomes complex (Tab? Arrow keys? Enter?)
- May confuse screen reader users about purpose of each interactive element

---

### Solution 4: Modal Comparison Dialog

**Design Approach:** Simple dropdown for quick selection, "Compare Models" button opens detailed comparison modal

#### Visual Design

**Main Interface:**

```
┌─────────────────────────────────────────┐
│ Model                                   │
│ ┌─────────────────────────────────────┐ │
│ │ Claude 3.5 Sonnet            ▼     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Compare All Models]                    │
└─────────────────────────────────────────┘
```

**Simple Dropdown:**

```
┌─────────────────────────────────────────┐
│ GPT-4 Turbo [Recommended]              │
│ Claude 3.5 Sonnet [Fast]               │
│ GPT-3.5 Turbo [Budget]                 │
│ Claude 3 Opus [Vision]                 │
└─────────────────────────────────────────┘
```

**Comparison Modal:**

```
┌──────────────────────────────────────────────────────────────────┐
│ Compare AI Models                                          [X]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Feature        │ GPT-4 Turbo  │ Claude 3.5   │ GPT-3.5        │
│                 │              │ Sonnet       │ Turbo          │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Tags            │ Recommended  │ Fast         │ Budget         │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Description     │ OpenAI's     │ Anthropic's  │ Fast and       │
│                 │ most capable │ most         │ affordable     │
│                 │ model        │ advanced     │ model          │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Input Cost      │ $10.00       │ $3.00        │ $0.50          │
│ (per 1M tokens) │              │              │                │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Output Cost     │ $30.00       │ $15.00       │ $1.50          │
│ (per 1M tokens) │              │              │                │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Context Window  │ 128K         │ 200K         │ 16K            │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Vision          │ ✓            │ ✓            │ ✗              │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│ Function Call   │ ✓            │ ✓            │ ✓              │
└──────────────────────────────────────────────────────────────────┘
                       [Select GPT-4 Turbo]
                       [Select Claude 3.5 Sonnet]
                       [Select GPT-3.5 Turbo]
```

#### Implementation Pattern

```tsx
const [showComparison, setShowComparison] = useState(false);

<div className="space-y-2">
  <Label>AI Model</Label>
  <Select value={selectedModel} onValueChange={setSelectedModel}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {models.map(model => (
        <SelectItem key={model.id} value={model.id}>
          {model.name}
          {model.tags.includes('recommended') && ' (Recommended)'}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowComparison(true)}
  >
    <Sparkles className="h-4 w-4 mr-2" />
    Compare All Models
  </Button>
</div>

<Dialog open={showComparison} onOpenChange={setShowComparison}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
    <ModelComparisonTable
      models={models}
      onSelect={(modelId) => {
        setSelectedModel(modelId);
        setShowComparison(false);
      }}
    />
  </DialogContent>
</Dialog>
```

#### Pros

- Clean, simple primary interface
- Separates quick selection from detailed comparison
- Excellent for side-by-side comparison
- Doesn't complicate the dropdown
- Works well for both novice and expert users
- Can include extensive details without space constraints
- Comparison table is familiar pattern for enterprise users

#### Cons

- Requires extra click to see details
- Modal interrupts flow
- Overkill if user only needs to compare 2 models
- Requires additional UI component (modal)
- Details hidden behind interaction

#### Accessibility Notes

- Modal needs proper focus trap
- Table headers need proper association with cells
- "Select" buttons in table need to clearly identify which model they select

---

### Solution 5: Persistent Detail Card Below Dropdown

**Design Approach:** Standard dropdown + always-visible detail card showing selected model info

#### Visual Design

```
┌─────────────────────────────────────────┐
│ AI Model                                │
│ ┌─────────────────────────────────────┐ │
│ │ Claude 3.5 Sonnet            ▼     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Claude 3.5 Sonnet                   │ │
│ │ ┌────┐ ┌──────┐                     │ │
│ │ │Rec.│ │ Fast │                     │ │
│ │ └────┘ └──────┘                     │ │
│ │                                     │ │
│ │ Anthropic's most intelligent model, │ │
│ │ with top-level performance on       │ │
│ │ highly complex tasks.               │ │
│ │                                     │ │
│ │ PRICING                             │ │
│ │ Input:  $3.00 per 1M tokens        │ │
│ │ Output: $15.00 per 1M tokens       │ │
│ │                                     │ │
│ │ 200K context • Vision • Functions   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Dropdown (Simple):**

```
┌─────────────────────────────────────────┐
│ GPT-4 Turbo [Recommended]              │
│ Claude 3.5 Sonnet [Fast]               │
│ GPT-3.5 Turbo [Budget]                 │
└─────────────────────────────────────────┘
```

#### Implementation Pattern

```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="model-select">AI Model</Label>
    <Select value={selectedModel} onValueChange={setSelectedModel}>
      <SelectTrigger id="model-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <span className="flex items-center gap-2">
              {model.name}
              {model.tags.includes("recommended") && <Badge size="sm">Recommended</Badge>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Always visible detail card */}
  {selectedModel && (
    <Card>
      <CardContent className="pt-4">
        <ModelDetailPanel model={models.find((m) => m.id === selectedModel)} />
      </CardContent>
    </Card>
  )}
</div>
```

#### Pros

- Details always visible for selected model
- Simple, predictable interaction
- Easy to implement
- Works with standard Radix Select
- No hover/tooltip complexity
- Good for reviewing choice after selection

#### Cons

- Can't compare models easily
- Details only shown for selected model, not while browsing
- Takes up vertical space even when details aren't actively being reviewed
- Doesn't help with initial selection decision
- Poor for users switching between models to compare

#### Accessibility Notes

- Simple, straightforward implementation
- All information accessible to screen readers
- Standard keyboard navigation

---

## Recommended Solution

### Primary Recommendation: Solution 2 - Two-Panel Comparison View

**Rationale:**

After analyzing the use case, user goals, and technical constraints, the two-panel comparison view is the optimal solution for the following reasons:

#### 1. **Matches User Mental Model**

Users need to **compare** models to make informed decisions, not just select from a list. The side-by-side layout explicitly supports comparison behavior.

#### 2. **Progressive Disclosure Done Right**

- **Primary:** List of models with key tags (scannable)
- **Secondary:** Full details appear on hover/focus (no extra clicks)
- **Tertiary:** Selection happens after informed review

#### 3. **Solves Core Technical Issues**

- Trigger shows only model name (solves Radix mirroring problem)
- No complex tooltip positioning
- No dropdown height constraints
- Clean separation of concerns

#### 4. **Enterprise-Grade UX**

This pattern is common in professional tools (IDE extensions, cloud platform selectors, pricing pages) and conveys sophistication appropriate for AI model selection.

#### 5. **Accessibility Excellence**

- Keyboard navigation is straightforward (arrow keys through list)
- All content available to screen readers
- No hidden interactions or hover-dependent content
- Clear focus states

#### 6. **Scales with Future Needs**

As more models are added or model metadata expands, this pattern accommodates growth without redesign.

#### 7. **Mobile-Responsive**

Can collapse to stacked layout on narrow viewports while maintaining functionality.

---

### When to Use Alternative Solutions

**Use Solution 5 (Persistent Detail Card)** if:

- Space is extremely limited
- Users rarely change models after initial selection
- Comparison is not a primary user need
- Implementation timeline is very short

**Use Solution 4 (Modal Comparison)** if:

- The settings UI must remain compact
- Model comparison is important but infrequent
- You already have a design system with comparison table patterns

**Use Solution 1 (Hover Tooltips)** if:

- Desktop-only application (no touch support needed)
- Users are highly technical and familiar with models
- Vertical space is at a premium
- Quick selection is prioritized over detailed comparison

**Avoid Solution 3 (Expandable Accordion)** - it violates dropdown patterns and creates accessibility issues.

---

## Implementation Guide

### Phase 1: Core Two-Panel Implementation

#### Component Structure

```tsx
// ModelSelector.tsx
import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronRight, DollarSign, Eye, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelMetadata } from "~/flow/interfaces/ai";

interface ModelSelectorProps {
  models: ModelMetadata[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ models, selectedModel, onModelChange }: ModelSelectorProps) {
  const [focusedModel, setFocusedModel] = useState<string | null>(
    selectedModel || (models.length > 0 ? models[0].id : null)
  );

  const currentModel = models.find((m) => m.id === (focusedModel || selectedModel));

  return (
    <div className="space-y-4">
      <Label>Select AI Model</Label>

      {/* Two-panel layout - collapses to stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Model List Panel */}
        <Card>
          <CardContent className="p-2">
            <div className="space-y-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-md transition-colors",
                    "flex items-center justify-between group",
                    "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    focusedModel === model.id && "bg-accent",
                    selectedModel === model.id && "bg-primary/10 hover:bg-primary/15"
                  )}
                  onMouseEnter={() => setFocusedModel(model.id)}
                  onFocus={() => setFocusedModel(model.id)}
                  onClick={() => onModelChange(model.id)}
                  aria-label={`Select ${model.name}`}
                  aria-current={selectedModel === model.id ? "true" : undefined}
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="font-medium text-sm truncate">{model.name}</span>
                    <div className="flex gap-1 flex-wrap">
                      {model.tags.includes("recommended") && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          Recommended
                        </Badge>
                      )}
                      {model.tags.includes("fast") && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Fast
                        </Badge>
                      )}
                      {model.tags.includes("budget") && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Budget
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                      focusedModel === model.id && "translate-x-0.5"
                    )}
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card>
          <CardContent className="p-4">
            {currentModel ? (
              <ModelDetailPanel model={currentModel} isSelected={selectedModel === currentModel.id} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a model to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### Detail Panel Component

```tsx
// ModelDetailPanel.tsx
import { Badge } from "../ui/badge";
import { DollarSign, Eye, Code, Zap, Database } from "lucide-react";
import type { ModelMetadata } from "~/flow/interfaces/ai";

interface ModelDetailPanelProps {
  model: ModelMetadata;
  isSelected?: boolean;
}

export function ModelDetailPanel({ model, isSelected }: ModelDetailPanelProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-lg font-semibold">{model.name}</h3>
          {isSelected && <Badge variant="default">Selected</Badge>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {model.tags.includes("recommended") && (
            <Badge variant="default" className="text-xs">
              Recommended
            </Badge>
          )}
          {model.tags.includes("fast") && (
            <Badge variant="secondary" className="text-xs">
              Fast
            </Badge>
          )}
          {model.tags.includes("budget") && (
            <Badge variant="outline" className="text-xs">
              Budget
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{model.description}</p>

      {/* Pricing */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Input:</span>
            <span className="font-medium">${model.pricing.inputCostPerMillion.toFixed(2)} per 1M tokens</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Output:</span>
            <span className="font-medium">${model.pricing.outputCostPerMillion.toFixed(2)} per 1M tokens</span>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specifications</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{(model.contextWindow / 1000).toFixed(0)}K context</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{model.limits.tokensPerMinute.toLocaleString()} TPM</span>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capabilities</h4>
        <div className="flex flex-wrap gap-2">
          {model.capabilities.vision && (
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Vision
            </Badge>
          )}
          {model.capabilities.functionCalling && (
            <Badge variant="secondary" className="text-xs">
              <Code className="h-3 w-3 mr-1" />
              Function Calling
            </Badge>
          )}
          {model.capabilities.streaming && (
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Streaming
            </Badge>
          )}
        </div>
      </div>

      {/* Deprecation Warning */}
      {model.deprecatedAt && (
        <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            <strong>Deprecation Notice:</strong> This model will be deprecated on{" "}
            {new Date(model.deprecatedAt).toLocaleDateString()}.
            {model.replacedBy && ` Consider switching to ${model.replacedBy}.`}
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Integration with Existing AI Settings

```tsx
// In ai-settings.tsx, replace the existing model selection section:

{
  /* Model Selection - Replace lines 307-403 */
}
<div className="space-y-2">
  <ModelSelector
    models={models}
    selectedModel={settings.model || getDefaultModel(settings.provider)}
    onModelChange={(modelId) => handleSettingChange("model", modelId)}
  />

  {isLoadingModels && (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Loading models...
    </div>
  )}

  {models.length === 0 && !isLoadingModels && (
    <p className="text-xs text-amber-600">Enter your API key and test the connection to load available models</p>
  )}
</div>;
```

### Phase 2: Responsive Enhancement

```tsx
// Add mobile-specific behavior
const [isMobileView, setIsMobileView] = useState(false);

useEffect(() => {
  const checkMobile = () => setIsMobileView(window.innerWidth < 1024);
  checkMobile();
  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);

// On mobile, show detail panel as expandable section below list
{
  isMobileView ? <MobileModelSelector {...props} /> : <DesktopModelSelector {...props} />;
}
```

### Phase 3: Performance Optimization

```tsx
// Memoize model list to prevent unnecessary re-renders
const modelList = useMemo(
  () =>
    models.map((model) => (
      <ModelListItem
        key={model.id}
        model={model}
        isSelected={selectedModel === model.id}
        isFocused={focusedModel === model.id}
        onHover={setFocusedModel}
        onSelect={onModelChange}
      />
    )),
  [models, selectedModel, focusedModel]
);
```

### Phase 4: Advanced Features

1. **Search/Filter:**

```tsx
const [searchQuery, setSearchQuery] = useState("");
const filteredModels = models.filter(
  (m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
);
```

2. **Quick Select by Tag:**

```tsx
<div className="flex gap-2 mb-2">
  <Badge
    variant={filter === "recommended" ? "default" : "outline"}
    className="cursor-pointer"
    onClick={() => setFilter("recommended")}
  >
    Recommended Only
  </Badge>
  <Badge
    variant={filter === "budget" ? "default" : "outline"}
    className="cursor-pointer"
    onClick={() => setFilter("budget")}
  >
    Budget
  </Badge>
</div>
```

3. **Cost Estimator:**

```tsx
// In detail panel
{
  isSelected && (
    <div className="mt-4 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20">
      <p className="text-xs font-medium mb-1">Estimated Monthly Cost</p>
      <p className="text-lg font-bold">${estimateMonthlyUsage(model.pricing)}</p>
      <p className="text-xs text-muted-foreground">Based on 10,000 bookmarks analyzed</p>
    </div>
  );
}
```

---

## Accessibility Considerations

### WCAG 2.1 Level AA Compliance

#### 1. Keyboard Navigation

- **Tab:** Focus model list
- **Arrow Up/Down:** Navigate between models in list
- **Enter/Space:** Select focused model
- **Escape:** Clear focus (optional)

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      focusNextModel();
      break;
    case "ArrowUp":
      e.preventDefault();
      focusPreviousModel();
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      if (focusedModel) onModelChange(focusedModel);
      break;
  }
};
```

#### 2. Screen Reader Support

```tsx
<button
  role="option"
  aria-selected={selectedModel === model.id}
  aria-label={`${model.name}. ${model.tags.join(', ')}. ${model.description}`}
  aria-describedby={`model-details-${model.id}`}
>
  {/* Visual content */}
</button>

<div
  id={`model-details-${model.id}`}
  role="region"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only lg:not-sr-only"
>
  <ModelDetailPanel model={model} />
</div>
```

#### 3. Focus Management

```tsx
// Ensure focused model is visible in scrollable list
useEffect(() => {
  if (focusedModel && listRef.current) {
    const focusedElement = listRef.current.querySelector(`[data-model-id="${focusedModel}"]`);
    focusedElement?.scrollIntoView({ block: "nearest" });
  }
}, [focusedModel]);
```

#### 4. Color Contrast

- Ensure all badges meet 4.5:1 contrast ratio
- Focus indicators: 3:1 contrast with background
- Selected state: visually distinct without color alone

```css
/* Focus visible for keyboard users only */
.model-button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Selected state uses both color AND icon */
.model-button[aria-selected="true"]::before {
  content: "✓";
  margin-right: 0.5rem;
}
```

#### 5. Reduced Motion

```tsx
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

<motion.div
  initial={prefersReducedMotion.matches ? false : { opacity: 0 }}
  animate={prefersReducedMotion.matches ? false : { opacity: 1 }}
>
  <ModelDetailPanel />
</motion.div>;
```

---

## Future Enhancements

### 1. Saved Comparisons

Allow users to "pin" 2-3 models for side-by-side comparison view

```
[GPT-4] vs [Claude 3.5] vs [Gemini]
```

### 2. Usage Analytics

Show historical usage stats for each model if user has tried multiple

```
You've analyzed 243 bookmarks with this model
Avg. confidence: 87%
```

### 3. Smart Recommendations

Use machine learning to suggest models based on user's bookmark patterns

```
💡 Based on your bookmarks, Claude 3.5 Sonnet might work better for technical content
```

### 4. Cost Tracking

Display actual usage and costs over time

```
This month: $2.47 (234 API calls)
Last month: $1.82 (189 API calls)
```

### 5. Model Performance Metrics

Show real-world performance data

```
Avg. response time: 1.2s
Success rate: 99.2%
User rating: 4.7/5
```

---

## Appendix: Design Patterns Research

### Industry Examples

**1. VS Code Extension Marketplace**

- Left panel: Extension list with key tags
- Right panel: Full extension details
- Hover on list item shows preview
- Pattern: Two-panel master-detail

**2. AWS EC2 Instance Type Selection**

- Filterable list of instance types
- Detail panel shows specifications
- Comparison table available in modal
- Pattern: Two-panel + optional comparison modal

**3. Stripe Pricing Selector**

- Horizontal cards with pricing tiers
- Expandable sections for feature details
- Compare button opens comparison table
- Pattern: Card-based with comparison overlay

**4. Notion Template Gallery**

- Grid of template cards
- Hover shows preview
- Click opens full detail modal
- Pattern: Grid + modal detail view

### Learned Patterns

1. **Master-Detail is Standard** for complex selection with detailed specs
2. **Comparison Tables** are expected for feature/pricing comparison
3. **Progressive Disclosure** works better than showing everything at once
4. **Tags/Badges** are effective for quick scanning
5. **Hover Previews** reduce clicks but must have accessible alternatives

---

## Change Log

| Date       | Author      | Change                    |
| ---------- | ----------- | ------------------------- |
| 2025-10-17 | UX Designer | Initial document creation |

---

## References

- [Radix UI Select Documentation](https://www.radix-ui.com/docs/primitives/components/select)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Nielsen Norman Group: Comparison Tables](https://www.nngroup.com/articles/comparison-tables/)
- [Material Design: Selection Controls](https://m3.material.io/components/menus/guidelines)
