---
title: "Model Selection in AI Dashboard — Research"
type: research
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [ai, feature, ui]
related:
  - briefs/model-selection-ai-dashboard.md
---

# Model Selection in AI Dashboard — Research

## Context

Investigates the open questions from the brief `model-selection-ai-dashboard.md`
(ClickUp `86b6yt7g2`): whether model choice should be per-run or global; whether
reprocessing replaces or diffs labels; where a picker attaches; whether cost/
latency should be shown; and the brief's flagged caveat that the hardcoded model
IDs/pricing look unreliable. Three lines of investigation: reading the current
analysis/model-selection code path, verifying Anthropic model facts against the
current catalog, and verifying OpenAI model facts against live docs.

## Findings

### Key Insights

**1. There is no per-run model path in the code — the model is global-only.**
The `ai:analyzeBookmark` IPC channel carries only bookmark data (`url`, `title`,
`content`, `existingLabels`); it has no model or provider field. Provider and
model are read from the persisted `AISettings` (`this.settings`) at call time in
the main process, not passed per request (`ai-service.ts:174` provider,
`ai-service.ts:186` model). So "per-run vs global vs persistent override" is not
merely a UX decision — **per-run selection is currently impossible without adding
a new argument threaded through the preload → IPC → service chain.**

**2. A reprocess path already exists and is the natural attach point.** The
dashboard's "Reprocess Selected" button (`ai-labeling-dashboard.tsx:595`, handler
`:380-428`) re-runs the same `analyzeBookmark` call. Because that call takes no
model argument, reprocessing today always uses the single global model. This is
exactly where a per-run model override would need to be threaded. The other AI
trigger is the bulk "AI Analyze" button on the bookmarks page
(`page.tsx:2504-2578`), an inline `onClick` loop.

**3. Model selection already exists in settings, but only mutates one global
value.** `ai-settings.tsx` renders a radio-card grid from `ai:listModels` and, on
selection, calls `handleSettingChange('model', model.id)` (`:411`), persisting to
the single `settings.model` in the `'ai-settings'` store. No per-run override
mechanism exists anywhere; `updateSettings` is the only mutation and it's global.

**4. Cost/latency data is produced but never surfaced.** Every analyze call
returns token usage, cost, and `latencyMs` on the provider `LLMResponse`
(`base-provider.ts:30-51`), but `analyzeBookmark` only `console.log`s them
(`ai-service.ts:206-213`) — none is included in the returned `CategoryAnalysis`,
so nothing reaches the dashboard. `estimateCost` is fully implemented across
service/IPC/preload layers but **called by nothing in `src/renderer`** — dead
UI-side.

**5. The model-card UI already renders pricing, context, and capability badges**
from `ModelMetadata` (`ai-settings.tsx` `ModelCard` `:31-102`): input/output
price per 1M, context window, vision + function-calling badges, and
`recommended`/`budget`/`fast` tags. `limits`, streaming/batch capability, cache
pricing, and `deprecatedAt`/`replacedBy` are returned but not shown.

**6. The hardcoded Anthropic model IDs are wrong.** The app hardcodes
`claude-sonnet-4-5-20250514` and `claude-opus-4-1-20250514`. Per the current
Anthropic catalog, the correct IDs are `claude-sonnet-4-5-20250929` and
`claude-opus-4-1-20250805`; `-20250514` is actually the suffix for the older
`claude-opus-4-0` / `claude-sonnet-4-0`. So the table has mismatched date
suffixes. `claude-opus-4-1` is **deprecated (retires 2026-08-05)**. Current-
generation Anthropic models (Opus 4.8 `claude-opus-4-8`, Sonnet 5
`claude-sonnet-5`, Haiku 4.5 `claude-haiku-4-5`) are absent entirely.

**7. The hardcoded OpenAI table is likely stale, and the `gpt-4o` price is
wrong.** OpenAI's current lineup as of 2026-07-17 is the GPT-5.6 family
(`gpt-5.6-sol`/`terra`/`luna`, launched 2026-07-09); plain `gpt-5`/`gpt-4o` are
labeled "previous generation." The app's default `gpt-5-nano` is confirmed real
and current-callable ($0.05/$0.40 per 1M, 400K context) — a legitimate cheap
default. But the app lists `gpt-4o` at `$3/$10`; the actual price is **$2.50/$10**.
The OpenAI provider also filters `GET /v1/models` to `id.includes('gpt')`, which
silently drops o1/o3 reasoning models — while the code carries o1/o3
temperature-compat branches that can therefore never execute (from prior survey).

**8. o1/o3 reject standard sampling params — and always have.** o1/o3-family
reasoning models do not accept `temperature`/`top_p`/etc. via Chat Completions;
they use `reasoning_effort`. Any code path assuming these models take `temperature`
is wrong independent of the mid-2026 model churn.

### Sources

- Code path (all `src/` paths under repo root): subagent code trace, file:line
  citations for `ai-service.ts`, `ipc/ai.ts`, `preload/index.ts`,
  `shared/flow/interfaces/ai.ts`, `use-ai-analysis.tsx`,
  `ai-labeling-dashboard.tsx`, `ai-settings.tsx`, `routes/bookmarks/page.tsx`,
  `providers/base-provider.ts`, `providers/openai-provider.ts`.
- Anthropic model IDs/pricing/status: `claude-api` skill catalog (cached
  2026-06-24) — Current Models table and `shared/models.md` legacy/deprecated
  tables.
- OpenAI models/pricing/deprecations/Batch: web research accessed 2026-07-17 —
  developers.openai.com `/api/docs/models`, `/pricing`, `/deprecations`,
  `/guides/batch`; OpenAI announcement blog and GitHub Changelog (GPT-5.6
  launch 2026-07-09); OpenAI Community + LibreChat issue (o-series param
  restrictions).
- Prior repo AI survey (shipped/half-built inventory, provider filter behavior).

## Analysis

### Implications

- **Model Selection in the dashboard is a backend change first, UI second.** The
  headline UX question the brief raised ("per-run, per-session, or persistent?")
  can't be answered purely in the renderer — any answer except "reuse the global
  setting" requires extending `ai:analyzeBookmark` (and the service method) to
  accept an optional `provider`/`model`. That's the load-bearing decision.
- **Reprocessing is the highest-value surface.** It already exists and today
  silently uses the global model. Letting a user pick a stronger model for a
  reprocess pass — the exact "cheap first pass, strong second pass" workflow in
  the brief's Why — is the feature's core, and it lands on the existing button.
- **Showing cost/latency before a bulk run is cheap to wire.** The data is
  already computed and thrown away; surfacing it is plumbing (add fields to
  `CategoryAnalysis` or a side channel), not new capability. `estimateCost`
  already exists for a pre-run estimate but is unused.
- **The model tables can't be trusted for a user-facing cost/quality choice
  until corrected.** Wrong Anthropic IDs would 404 or silently mislabel; the
  `gpt-4o` price is overstated. A picker that shows these drives bad decisions.

### Recommendations

- Treat "correct + refresh the model metadata tables" as a prerequisite sub-task
  (it also serves the parent Categorizer brief). Fix the Anthropic IDs, drop the
  invented date suffixes, add current-gen models, and correct `gpt-4o` pricing.
- Scope the spec around **per-run override on reprocess** as the primary flow:
  add an optional `{provider?, model?}` to `ai:analyzeBookmark` → service, default
  to global settings when absent. This is the minimal change that unlocks the
  feature without disturbing the existing global path.
- Surface the already-computed token/cost/latency in the dashboard as a second,
  smaller deliverable — low effort, directly supports the "show estimates before
  a bulk run" question.
- This brief has enough concrete grounding to proceed to `/atlas:spec`; the
  provider-model-table correction may warrant its own decision record if it
  changes how models are sourced (hardcoded vs. dynamic).

## Open Questions

- **Per-run vs per-session vs persistent override** — the code makes per-run
  _possible to add_ but doesn't decide _which_ the product wants. Still a product
  call for the owner; the brief's Unknown stands.
- **Replace vs diff on reprocess** — reprocessing currently overwrites the
  bookmark's labels with the new run's output; whether a different-model rerun
  should instead produce a comparison is undecided and unbuilt.
- **Exact current pricing for several models** could not be fully confirmed:
  `gpt-5-mini` output price, `gpt-4o` max-output tokens, and o1/o3 per-token
  pricing (dropped from the fetched pricing-page excerpt). Verify directly at
  developers.openai.com/api/docs/pricing before hardcoding.
- **Whether model discovery should stay hardcoded at all** — Anthropic models are
  hardcoded with no refresh; the drift found here argues for dynamic discovery,
  but that's a design decision beyond this brief.
- **Post-cutoff OpenAI model facts** (GPT-5.6 family) come from web research dated
  2026-07-17 and are cited but not independently re-verified here; confirm before
  relying on specific new model IDs.
