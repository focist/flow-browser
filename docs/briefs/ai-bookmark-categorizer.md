---
title: "AI Bookmark Categorizer"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [ai, feature, ui]
related: []
---

# AI Bookmark Categorizer

## Intent

Refine the existing AI bookmark labeling feature — the engine that sends a
bookmark to an LLM, gets back topic/type/priority labels with confidence and
reasoning, and surfaces them for review in the three-column labeling
dashboard — from "roughly working" into something reliable and pleasant to use.
This is a refinement effort, not a greenfield build: the core is shipped.
Source ticket: ClickUp `86b6p3bx5` (🤖 AI Labeling Dashboard, urgent, in
progress).

## Why

Bookmark categorization is the flagship AI capability of the browser. The
happy path works, but rough edges (wrong-colored labels, bulk actions that
over-apply, API errors rendered as bookmark descriptions) undercut trust in
the labels. A user who can't trust the labels won't use the feature.

## Knowns

Shipped and working today:

- LLM label analysis: `src/main/modules/ai-service.ts` (`analyzeBookmark`,
  `buildAnalysisPrompt`, `parseAIResponse`) with confidence + reasoning, JSON
  parsing, threshold filtering, dedup against existing labels.
- Local (non-LLM) fallback analysis via keyword/URL pattern matching.
- Description generation, duplicate detection (local Levenshtein + URL
  normalization), and an HTML content fetcher.
- Three-column labeling dashboard (`components/ai/ai-labeling-dashboard.tsx`
  - ~16 sibling components), pattern detection, and bulk auto-apply with
    toast undo.
- Provider abstraction over OpenAI + Anthropic (`src/main/modules/ai/`,
  untracked in git but load-bearing — imported by `ai-service.ts`).

Known refinement gaps (open ClickUp tickets):

- `86b6p843c` (high) — "Apply & Next" applies ALL labels instead of only the
  AI-applied ones.
- `86b6p842f` — AI-applied label color is wrong (should be original blue).
- `86b6p81x1` — manually-accepted label has wrong color styling.

Known code-level issues surfaced during survey (candidate scope):

- `providers/anthropic-provider.ts:58` — `validateApiKey()` fires a real
  billable `/messages` request on every `initialize()`, and `initialize()`
  runs on every settings save.
- `ai-service.ts:232` — `analyzeBookmark` swallows provider errors and returns
  a fake analysis with the error text stuffed into the description field, so
  the UI can render an API error as a bookmark description.
- `ai-service.ts` is heavily `console.log`-instrumented; debug `AI TEST`
  logging remains in `routes/bookmarks/page.tsx:450-451`.

## Unknowns

- What does "major refinement" mean concretely to the owner beyond the known
  bugs — accuracy of labels, UX of the review flow, performance, or all three?
- Is the billable-key-on-save and error-swallowing behavior in scope for this
  brief, or tracked separately?
- Are there quality/accuracy complaints about the labels themselves (wrong
  topics, low-value labels) that aren't yet captured as tickets?
- Should the untracked `src/main/modules/ai/` refactor be committed as part of
  stabilizing this feature?
