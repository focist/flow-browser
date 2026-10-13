---
title: "OpenAI Batch API for Bulk Analysis"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [ai, backend, feature]
related: []
---

# OpenAI Batch API for Bulk Analysis

## Intent

Use the OpenAI Batch API to analyze bookmarks in bulk as a background job,
trading immediacy for roughly 50% lower cost. Source ticket: ClickUp
`86b6p3bxe` (⚡ OpenAI Batch API Implementation, backlog, phase-1).

## Why

Analyzing a large bookmark collection one synchronous request at a time is
expensive and slow. The Batch API cuts cost ~50% and moves the work
off the interactive path — the right shape for reprocessing an entire library.

## Knowns

- Today all analysis goes through synchronous, per-bookmark REST calls (axios)
  in `src/main/modules/ai-service.ts`; there is no batch path.
- Provider metadata already carries a decorative `supportsBatch: true` flag on
  Anthropic, but no `BatchProcessor` exists in `src/` — it is spec-only in
  `docs/ai/`.
- The provider abstraction (`src/main/modules/ai/`) is where a batch code path
  would slot in alongside the existing synchronous request flow.
- Batch is inherently asynchronous: results arrive later, so the dashboard's
  current synchronous "analyze → see labels" flow does not directly apply.

## Unknowns

- How should a submitted batch surface progress and completion in the UI
  (notifications, a jobs panel, badges on pending bookmarks)?
- What happens to a bookmark's state between submission and result — locked,
  editable, re-queueable?
- Batch API has latency in the minutes-to-hours range; what is the acceptable
  turnaround, and is there a fallback to synchronous for urgent items?
- Anthropic also offers a Batch API — is this OpenAI-only, or should the design
  be provider-agnostic from the start?
- How are partial failures within a batch reported and retried?
