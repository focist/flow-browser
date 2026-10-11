---
title: "Space-Associated Bookmark Folders"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [feature, ui, backend]
related: []
---

# Space-Associated Bookmark Folders

## Intent

Associate bookmark folders with specific spaces so bookmarks are organized in
the context they belong to, with a clearer visual hierarchy in the sidebar.
Source ticket: ClickUp `86b6p3bxf` (🏷️ Space-Associated Bookmarks Folders,
backlog, p1-critical).

## Why

Bookmarks today live in a flat structure disconnected from spaces. Tying
folders to spaces lets users see and filter only what's relevant to the space
they're working in, reducing clutter and matching the browser's space-centric
model.

## Knowns

Scope decomposed in ClickUp subtasks:

- Extend the database schema for space↔folder associations (`86b6p3ea9`) and
  migrate existing folders (`86b6p3eaq`).
- Space assignment UI for folders (`86b6p3ea8`).
- Space filtering in the bookmarks manager (`86b6p3ea7`).
- Visual space indicators on folders (`86b6p3eat`) and sidebar visual
  hierarchy integration (`86b6p3eap`).
- Backend uses Better SQLite3 + Knex (existing project stack), so schema and
  migration work fits the established data layer.

## Unknowns

- Can a folder belong to multiple spaces, or exactly one?
- How are existing (space-less) folders migrated — assigned to a default,
  left global, or prompted for assignment?
- What's the interaction with the AI labeling dashboard, which operates over
  bookmark collections — does space association scope what gets analyzed?
- Visual hierarchy specifics (indicators, nesting, collapse) need design.
