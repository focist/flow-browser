---
title: "Tab Snooze System"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [feature, ui, backend]
related: []
---

# Tab Snooze System

## Intent

Gmail-style snoozing for tabs (and bookmarks) — hide something now, have it
wake up later — with a unified snoozed section and cross-space wake-up
notifications. Source ticket: ClickUp `86b6p3bwz` (📑 Tab Snooze System,
backlog, p1-critical).

## Why

Not everything open is needed now, but closing it risks forgetting it. Snooze
lets users clear their workspace without losing the thread, resurfacing tabs
at the right moment instead of relying on memory or an ever-growing tab strip.

## Knowns

Scope decomposed in ClickUp subtasks:

- Snooze database schema (`86b6p3e2g`).
- Tab snooze (`86b6p3e2h`) and bookmark snooze (`86b6p3e2k`) functionality.
- Unified snoozed-section UI (`86b6p3e2v`).
- Wake-up notification system (`86b6p3e2x`) with cross-space handling
  (`86b6p3e2u`).
- Partial implementation already exists untracked in the working tree:
  `src/main/modules/snooze.ts`, `src/main/ipc/snooze.ts`,
  `src/shared/types/snooze.ts`, `src/shared/flow/interfaces/snooze.ts`, with
  human-readable presets ("Later today", "Tomorrow"). This is the "Phase 3B
  Reminder System" from `docs/ai/PHASE_3_AI_DESIGN.md`.

## Unknowns

- How much of the untracked snooze code is complete vs. stubbed — needs an
  audit before planning further work.
- Wake behavior: does a woken tab reopen automatically, or just notify?
- What snooze presets/custom-time options are in scope?
- Cross-space wake-up: does the tab wake in its original space, the current
  one, or prompt?
- Relationship to Pinned Tabs and to bookmark snooze — one unified snooze model
  or separate paths?
