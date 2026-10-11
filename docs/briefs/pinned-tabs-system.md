---
title: "Pinned Tabs System"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [feature, ui]
related: []
---

# Pinned Tabs System

## Intent

A grid of pinned tabs — up to 12 in a responsive 4×3 layout — with
drag-and-drop reordering and cross-space support. Source ticket: ClickUp
`86b6p3bw9` (📌 Pinned Tabs System, backlog, urgent).

## Why

Users keep a handful of tabs they return to constantly. A dedicated, spatially
stable pinned-tab grid makes those reachable at a glance instead of hunting
through a tab strip, and carrying them across spaces keeps essentials always
present.

## Knowns

Scope decomposed in ClickUp subtasks:

- 4×3 responsive grid layout for up to 12 tabs (`86b6p3e68`).
- Drag-and-drop reordering (`86b6p3e6e`).
- Pin/unpin via context menu (`86b6p3e67`).
- Session persistence for pinned tabs (`86b6p3e6m`).
- Cross-space support so pins appear across spaces (`86b6p3e6n`).
- Visual styling and interaction states (`86b6p3e6p`).

## Unknowns

- Is the 12-tab cap firm, or should it scale with window size / be
  configurable?
- What does "cross-space" mean precisely — the same pins everywhere, or
  per-space pin sets with some shared?
- How do pinned tabs relate to the Tab Snooze system (can a pinned tab be
  snoozed)?
- Where does the grid live in the UI — sidebar, new-tab surface, both?
- Persistence scope: per-profile, per-window, synced?
