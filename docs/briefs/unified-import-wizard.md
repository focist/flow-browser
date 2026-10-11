---
title: "Unified Import Wizard"
type: brief
status: draft
created: 2026-07-17
updated: 2026-07-17
tags: [import, feature, epic]
related: []
---

# Unified Import Wizard

## Intent

A single import wizard that brings a user's existing browsing data into the
browser from many sources — bookmarks (all formats), URL lists, Chrome
profiles, Chrome extensions, Workona workspaces, and Arc — with cancellable
operations and clear success/failure reporting. Source ticket: ClickUp
`86b6p65yn` (📥 Import Feature - Unified Import Wizard, backlog, high).

## Why

Switching browsers is the biggest adoption barrier. A reliable, unified
importer that handles the formats people actually have — and reports honestly
what came in and what didn't — removes the "I'd lose everything" objection.

## Knowns

Scope decomposed in ClickUp subtasks:

- Wizard framework + UI/UX (`86b6p6633`, `86b6p6631`) — unified flow with
  drag/drop and manual source selection.
- Bookmarks import, all formats — HTML, Chrome JSON, Firefox JSON
  (`86b6p663h`).
- URL lists import as tabs or bookmarks (`86b6p663g`).
- Chrome profile import (`86b6p663n`) and Chrome extensions import
  (`86b6p6697`).
- Workona workspace migration (`86b6p6698`).
- Arc import (`86b6p6699`), preceded by research into Arc's export format
  (`86b6p6632`).
- Cross-cutting: cancellable operations, detailed success/failure reports,
  integration testing (`86b6p669h`), and feature documentation (`86b6p669n`).

## Unknowns

- Which sources are must-have for v1 vs. later — the ticket lists six, but they
  differ wildly in effort (HTML bookmarks vs. Arc's undocumented format).
- Arc's export/data format is explicitly unresearched (`86b6p6632`) — feasibility
  unknown.
- How should duplicates against existing bookmarks be handled on import?
- Does importing URL lists "as tabs" interact with the Pinned Tabs / Tab Snooze
  systems?
- What's the failure model — partial import with a report, or all-or-nothing?
