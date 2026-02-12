# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo-Vecter is a Plasmo-based browser extension (Manifest V3) that provides sci-fi cursor visual effects. The extension offers four effect modes (Off, Magnetic, Light, Electric) using DOM classes and full-screen canvas overlays.

## Development Commands

- `pnpm dev` or `npm run dev` - Start dev server; load unpacked extension from `build/chrome-mv3-dev/` in Chrome
- `pnpm build` or `npm run build` - Production build
- `pnpm package` - Package for Chrome Web Store upload

## Architecture

### Content Script Flow

The content script architecture follows this flow:

1. **Entry**: `content.ts` → `content/index.ts` (main orchestrator)
2. **Effect Selection**: Reads `turboEffect` from `chrome.storage.sync` (fallback: `chrome.storage.local`)
3. **Event Handling**: Tracks mouse position, movement distance, and idle state
4. **Canvas Rendering**: Coordinates three canvas overlays (`lightCanvas`, `magneticCanvas`, `electricCanvas`)
5. **State Transitions**:
   - Moving (≥12px movement) → applies CSS classes to `document.body`
   - Still (140ms delay) → triggers hover effects on current element
   - Idle (2000ms) → effects wind down

### Effect System

Effects are modular (`content/effects/`):
- Each effect exports `EffectDefinition` with `type`, `classNames`, and `css`
- `content/effects/index.ts` registers all effects and injects CSS via `ensureEffectStyles()`
- Supported types: `"off"`, `"magnetic"`, `"light"`, `"electric"`

### Canvas Modules

Each canvas (`lightCanvas.ts`, `magneticCanvas.ts`, `electricCanvas.ts`):
- Creates fixed, full-viewport `<canvas>` with `pointer-events: none`
- Implements: `start()`, `stop()`, `resize()`, `cleanup()`
- Uses `requestAnimationFrame` for animations
- Handles mode-specific hover effects (e.g., `startSnake()` for light, `startHoverWaves()` for magnetic)

### Popup UI

- Entry: `popup.tsx` → `popup/Popup.tsx`
- React component that syncs with `chrome.storage` for effect selection and language preference
- Storage keys: `turboEffect`, `turboLanguage` ("en" or "zh")

## Key Patterns

### Extension Context Invalidation

The codebase handles extension reload gracefully:
- Global error handlers in `content.ts` suppress "context invalidated" errors
- Event handlers wrap logic in try-catch to log context errors without crashing

### Plasmo Conventions

- Root-file convention: `popup.tsx`, `content.ts` at root export/initialize their respective modules
- Manifest settings in `package.json` under `manifest` key
- TypeScript path aliases: `~*` maps to root (configured in `tsconfig.json`)
- Build outputs: `build/chrome-mv3-dev/` (dev), `build/chrome-mv3-prod/` (production)

## Important Constants

- `STILL_DELAY`: 140ms - delay before hover effects activate
- `MIN_ACTIVE_DISTANCE`: 12px - minimum movement to trigger effects
- `IDLE_TIMEOUT`: 2000ms - inactivity timeout before effects stop
- `DEBUG`: boolean in `content/index.ts` for console logging

## Effect Behavior

- **Moving**: CSS classes applied to `document.body` based on current effect
- **Hovering**: Element-specific effects after cursor becomes still
- **Scroll**: Clears hover effects to prevent visual artifacts
- **Canvas lifecycle**: Started on movement, stopped on idle/effect change
