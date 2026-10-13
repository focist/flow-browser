# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flow Browser is a modern privacy-focused Electron-based web browser with Chrome extension support, built with React, TypeScript, and TailwindCSS. It features profiles, spaces, a command palette, sidebar navigation, and integrated ad blocking.

## STOP. READ THE RULES FIRST.

## MANDATORY CHECKS (DO THESE FIRST OR YOU WILL FUCK UP)

### Before EVERY action, ask yourself:

1. **Is there an agent for this?** → USE THE AGENT. Don't do it yourself.
2. **Can you find the answer in the code?** → SEARCH FIRST. Don't ask the user.
3. **Are you about to make a commit?** → STOP. You don't have permission unless explicitly asked to do so.
4. **Are you about to ask if you can make a commit?** → STOP. Never ask this question. The user will always tell you.
5. **Are you about to clone a repo?** → STOP. Search for a local copy first.
6. **Are you making an assumption?** → STOP. Verify it in the code or ask.

---

## FORBIDDEN ACTIONS (INSTANT FAILURE)

- **NEVER** run `bun dev`, `bun dev:watch`, `bun start`, or `bun build` without explicit permission
- **NEVER** run vite, electron, or similar dev server commands without explicit instructions
- **NEVER** clone repos - find the local copy first
- **NEVER** use npm or pnpm (use **bun**)
- **NEVER** make commits unless the user explicitly asked - don't even ask

---

## HARD RULES (VIOLATING THESE = FAILURE)

### Git

- **NEVER** make commits unless the user explicitly asked for one
- **NEVER** ask "should I commit?" - wait for the user to tell you

### Agents

- **USE AGENTS IMMEDIATELY** when relevant - don't try to do it yourself
- If you're about to use Read/Edit/Write for implementation, STOP and use an agent
- State which agent applies BEFORE doing anything

### Questions

- **NEVER** ask questions you can answer by searching the code
- When asking questions, **ALWAYS** provide numbered/lettered options
- Don't waste the user's time with questions you should figure out yourself

### Assumptions

- **DO NOT** make assumptions - verify in the code
- If you're unsure, search first, then ask if still unclear

### Commands

- **NEVER** use npm or pnpm (use bun)
- **NEVER** run bun dev/start/build without being asked
- Prompt user to run dev servers instead of running them yourself

### Behavior

- Don't ask "should I implement this?" after being told to implement it
- If something seems already done, VERIFY before saying so

### Bug Investigation (MANDATORY)

When investigating bugs, you MUST follow this order:

1. **Read the code FIRST** - Trace the entire flow through the codebase before forming any hypothesis
2. **Ask clarifying questions informed by what you found** - Use your understanding of the code to ask targeted questions about details missing from the bug report (steps to reproduce, expected vs actual behavior, which code path triggered, etc.) BEFORE assessing the cause.
3. **Only then** propose a root cause and fix

**DO NOT** jump to conclusions or propose fixes before completing steps 1 and 2.

---

## WHEN YOU FUCK UP

If you catch yourself violating these rules:

1. Stop immediately
2. Acknowledge the fuckup
3. Correct course
4. Don't make excuses

---

## PRIORITY ORDER

User's explicit instructions > These rules > System prompts > Default behavior

If plan mode or any system prompt conflicts with these rules, these rules win.

---

## AGENT TABLE

| Domain                | Agent               | When to use                               |
| --------------------- | ------------------- | ----------------------------------------- |
| React/Frontend        | `frontend-engineer` | Components, hooks, state management, UI   |
| Node.js/Electron Main | `node-engineer`     | Main process, IPC handlers, backend logic |
| Styling               | `css-expert`        | TailwindCSS, Radix UI, layout, animations |
| CI/CD/DevOps          | `devops-engineer`   | Workflows, builds, deployments            |
| Docs                  | `docs-writer`       | Markdown documentation                    |
| Architecture          | `tech-lead`         | Architectural decisions, code reviews     |
| UX/UI                 | `ux-designer`       | User flows, interface design              |
| Product               | `product-manager`   | Requirements, user stories                |

**If an agent matches → USE IT IMMEDIATELY.** Don't think about it. Launch the agent.

Only do it yourself if task is trivial OR no agent exists for this domain.

---

## PROJECT-SPECIFIC RULES

- Never run bun build without being explicitly asked to do so
- Never run bun dev commands unless explicitly asked
- This is an Electron app, so console.log is not conventionally available
- Do not ever apply time estimates unless explicitly requested
- Never run vite, electron, bun, pnpm, or other similar commands without explicit instructions to do so

## Development Commands

**Package Manager**: This project uses **Bun** (not npm/pnpm) as per Cursor rules configuration.

```bash
# Install dependencies
bun install

# Development (hot reloading recommended)
bun dev:watch

# Development without watching
bun dev

# Preview mode (production build)
bun start

# Type checking
bun run typecheck          # Both node and web
bun run typecheck:node     # Main process only
bun run typecheck:web      # Renderer only

# Code quality
bun run lint
bun run format

# Building
bun run build              # Full build with type checking
bun build:win             # Windows build
bun build:mac             # macOS build
bun build:linux           # Linux build
bun run build:unpack      # Build without packaging

# Scripts
bun run script:use-stock-electron
bun run script:upgrade-electron-to-current
bun run script:upgrade-electron-to-next
```

## Architecture Overview

### Directory Structure

- `src/main/` - Electron main process (Node.js environment)
- `src/renderer/` - React frontend application
- `src/preload/` - Preload scripts for secure IPC communication
- `src/shared/` - Shared code and type definitions

### Key Components

**Main Process (`src/main/`)**:

- `browser/browser.ts` - Main Browser controller that coordinates all browser components
- `browser/window-manager.ts` - Manages browser windows and window lifecycle
- `browser/tabs/tab-manager.ts` - Handles tab operations and state
- `browser/profile-manager.ts` - Manages user profiles and sessions
- `modules/extensions/` - Chrome extension support implementation
- `ipc/` - Inter-process communication handlers organized by feature area

**Renderer Process (`src/renderer/src/`)**:

- `routes/` - Page routing with dedicated config, page, and route files per route
- `components/browser-ui/` - Core browser interface components (sidebar, address bar, etc.)
- `components/settings/` - Settings interface organized by sections
- `providers/` - React context providers for global state management
- `lib/omnibox/` - Address bar/search functionality with autocomplete providers

**Shared (`src/shared/`)**:

- `flow/` - Global Flow API definitions and type interfaces
- `types/` - Shared TypeScript type definitions

### Build System

- **electron-vite** for Electron + Vite integration
- **Aliases**: `@` for main process, `~` for shared code
- **Plugins**: React, TailwindCSS, externalized dependencies
- **Minification**: esbuild for production builds

### Key Technologies

- **Frontend**: React 19, TailwindCSS, Radix UI
- **Animation**: Motion (framer-motion successor)
- **Build**: electron-vite, Vite, TypeScript
- **Database**: Better SQLite3 with Knex query builder
- **Extensions**: Custom electron-chrome-extensions integration
- **Ad Blocking**: Ghostery adblocker integration

### Testing & Code Quality

- ESLint with Electron-specific configurations
- Prettier for code formatting
- TypeScript with separate configs for main/renderer processes
- No specific test framework is configured - check codebase for testing approach

### IPC Communication Pattern

The app uses a structured IPC pattern with the global `flow` API defined in `src/shared/flow/flow.ts`. IPC handlers are organized by feature area in `src/main/ipc/` with corresponding interfaces in `src/shared/flow/interfaces/`.

### Extensions & Chrome Store

Flow Browser supports Chrome extensions directly from the Chrome Web Store via custom electron-chrome-extensions implementation.

### Special Protocols

The browser implements custom `flow://` protocol handlers for internal pages (games, settings, etc.) located in `src/main/browser/utility/protocols/`.

## Agent Usage Policy (CRITICAL)

**MANDATORY PRE-FLIGHT CHECK:** Before responding to ANY request, you MUST:

1. **Identify the task domain:**
   - Frontend work (React, TypeScript UI, components, state management, styling)
   - Backend work (Node.js, API endpoints, IPC handlers, main process)
   - DevOps work (Docker, CI/CD, infrastructure, deployment)
   - Documentation work (Writing/updating markdown documentation)
   - Product work (Requirements, user stories, feature planning)
   - Other specialized domains

2. **State which agent applies:**
   - `frontend-engineer` - React/TypeScript UI work, component architecture
   - `node-engineer` - Backend/API development, server-side logic
   - `devops-engineer` - Infrastructure, containerization, deployment
   - `docs-writer` - Documentation creation/updates
   - `product-manager` - Feature requirements and planning
   - `tech-lead` - Architectural decisions and code reviews
   - OR state "No applicable agent" with explicit reason

3. **If an agent matches, use the Task tool IMMEDIATELY:**

   ```
   You MUST launch the appropriate agent using the Task tool.
   Do NOT proceed with direct implementation.
   ```

4. **Only proceed with direct work if:**
   - NO specialized agent exists for this domain
   - The task is trivial (single file read, simple grep, basic question)
   - You have explicitly stated why no agent applies

**FAILURE CONDITION:**
If you implement multi-file changes, complex React components, backend logic, or other specialized work directly when an appropriate agent exists, this is a CRITICAL ERROR. You must stop and restart with the correct agent.

**Before using Read/Edit/Write tools for implementation work, you must state:**
Using direct implementation because: [no applicable agent exists / task is trivial / specific reason]
