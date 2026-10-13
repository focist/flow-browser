---
title: "Model Selection in AI Dashboard"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [ai, feature, ui]
related: []
---

# Model Selection in AI Dashboard

## Intent

Let users choose which AI model runs their bookmark analysis and reprocessing,
directly from the AI Labeling Dashboard — not just from settings. Source
ticket: ClickUp `86b6yt7g2` (🎛️ Add Model Selection to AI Labeling Dashboard,
in progress).

## Why

Different models trade off cost, speed, and quality. Users reprocessing a
large bookmark set want to pick a cheap/fast model for a first pass and a
stronger model for the labels that matter, without leaving the dashboard.

## Knowns

- Model selection already exists in **settings** today: a radio-card grid
  (`components/ai/ai-settings.tsx`) driven by `ai:listModels`, with pricing,
  context, and capability badges, plus connection testing.
- Dynamic model discovery is wired for OpenAI (`GET /v1/models`, filtered to
  `gpt`, 1h cache, hardcoded fallback). Anthropic models are hardcoded only.
- Current default: `provider: 'openai'`, `model: 'gpt-5-nano'`, persisted via
  `SettingsDataStore` under `'ai-settings'`.
- The gap is surfacing that selection **in the dashboard** and applying it to
  analysis/reprocessing runs, rather than only as a global setting.
- Caveat from survey: hardcoded Anthropic model IDs/pricing look unreliable
  (two models share an identical date suffix) and should be verified before
  they drive user-facing cost/quality choices.

## Unknowns

- Should model choice in the dashboard be per-run, per-session, or override
  the global setting persistently?
- Does reprocessing with a different model replace prior labels, or produce a
  diffable comparison?
- Where should the control live in the three-column layout without cluttering
  the review flow?
- Should cost/latency estimates for the chosen model be shown before a bulk
  run kicks off?
