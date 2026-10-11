---
title: "Model Selection"
type: spec
status: draft
created: 2026-07-18
updated: 2026-07-18
tags: [ai, feature, settings]
related:
  - briefs/model-selection-ai-dashboard.md
  - research/model-selection-ai-dashboard.md
---

# Model Selection

## Overview

Let users choose which AI provider and model runs bookmark analysis and
reprocessing, configured in **Settings** (the AI section). This spec describes a
from-scratch build of that capability: pick a provider, pick a model from the
provider's available models shown with accurate metadata, persist the choice,
and have that choice actually drive analysis. Scope is model *selection* — not
cost optimization, failover, batching, or a per-run picker elsewhere in the app.

## Goals

- A user can select an AI provider and a specific model in Settings.
- The selected model is what actually runs analysis and reprocessing.
- The selection persists across app restarts.
- Models are presented with accurate, current metadata (name, pricing, context
  window, capabilities).
- The UI behaves sanely when no API key is set and when switching providers.

## Non-Goals

- Per-run or per-bookmark model override outside Settings.
- Cost optimization, model failover/fallback chains, response caching, or batch
  processing (separate briefs).
- Surfacing token/cost/latency of individual analysis runs.
- Adding new providers beyond those already supported (OpenAI, Anthropic, local).

## Requirements

### Functional

- **FR1 — Provider selection.** The user can choose a provider (OpenAI,
  Anthropic, or local). Local requires no API key and no model selection.
- **FR2 — Model selection.** For an API provider, the user can select one model
  from that provider's available models.
- **FR3 — Persistence.** The selected provider and model persist to the AI
  settings store and survive an app restart; on reload the previously selected
  model is shown as selected.
- **FR4 — Selection drives analysis.** Bookmark analysis and reprocessing use the
  currently selected provider and model.
- **FR5 — Accurate model metadata.** Each model is shown with a correct
  identifier, display name, current input/output pricing, context window, and
  capability indicators. Model identifiers and pricing must match the providers'
  current published values.
- **FR6 — No-API-key state.** When an API provider is selected but no valid API
  key is configured, the UI communicates that models require a key, without
  dead-ending or showing a stale/empty selection.
- **FR7 — Provider switch.** Switching providers presents that provider's models
  and a valid selection for it; it never leaves a model from the other provider
  selected or a non-existent model persisted.
- **FR8 — Connection validation.** The user can verify that the configured
  provider + API key work (e.g. by successfully retrieving that provider's
  models), with clear success/failure feedback.

### Non-Functional

- **NFR1 — No accidental billable calls.** Configuring or saving settings must
  not trigger billable provider requests as a side effect; validation happens
  only on an explicit user action.
- **NFR2 — Current data.** Model identifiers and pricing reflect current
  provider offerings at build time, including current-generation models; retired
  or renamed model IDs are not offered.
- **NFR3 — Resilience.** Failure to retrieve a provider's live model list does
  not leave the picker permanently empty when a known set of models can still be
  offered.

## User Stories

- As a user, I open Settings, pick my provider, enter my API key, and choose a
  model — and that model is what analyzes my bookmarks.
- As a user, I reopen the app later and my chosen model is still selected.
- As a user, I switch from OpenAI to Anthropic and immediately see Anthropic
  models with a valid one selected, not a leftover OpenAI model.
- As a user without an API key, I understand why no models are selectable and
  what to do about it.

## Acceptance Criteria

- [ ] Selecting a model in Settings and reopening Settings shows that same model
      selected (persistence verified across a restart).
- [ ] A bookmark analyzed after selecting model X is processed by model X (not a
      default or the previously selected model).
- [ ] Every model shown displays a name, input/output price per 1M tokens, and
      context window; the identifier and pricing match the provider's current
      published values.
- [ ] Current-generation models for each supported provider appear in the list;
      no offered model ID is a retired/renamed identifier.
- [ ] Switching provider updates the model list to the new provider and results
      in a valid selected model for that provider; no cross-provider or
      non-existent model remains selected or persisted.
- [ ] With an API provider selected and no valid key, the UI shows a clear
      "needs API key" state and no phantom selection.
- [ ] Saving settings does not itself issue a billable provider request; a
      billable/validating request occurs only on an explicit connection test.
- [ ] The connection test reports success or failure with a clear message.

## Constraints

- Persistence uses the existing `AISettings` store (`'ai-settings'`).
- Providers are OpenAI, Anthropic, and local; the provider vocabulary
  (`claude` ↔ `anthropic`) must resolve consistently between UI and service.

## Dependencies

- Accurate, current model metadata (IDs, pricing, current-gen models) for OpenAI
  and Anthropic is required (FR5/NFR2); sourcing it correctly is an
  implementation concern.
- No accepted decision records constrain this spec (none exist yet).
