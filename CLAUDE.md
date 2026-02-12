# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbo-Vecter is a Plasmo-based browser extension (Manifest V3) that provides sci-fi cursor visual effects. The extension offers four effect modes (Off, Magnetic, Light, Electric) using DOM classes and full-screen canvas overlays. It includes a color mode toggle (Dark/Light) that adapts effect colors for optimal visibility on different website backgrounds.

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
- React component that syncs with `chrome.storage` for effect selection, language preference, and color mode
- Storage keys: `turboEffect`, `turboLanguage` ("en" or "zh"), `turboColorMode` ("dark" or "light")

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

## Color Mode System

### Color Configuration
- Centralized color definitions in `content/colors.ts`
- Two color schemes: `dark` (bright cyan/blue for dark websites) and `light` (deep blue for light websites)
- Each canvas module reads `turboColorMode` from `chrome.storage` and applies appropriate colors
- Colors update dynamically when user switches mode in popup

### Color Schemes
**Dark Mode** (default - bright cyan/blue):
- Magnetic: `rgba(140, 220, 255, ...)` - Bright cyan
- Light: `rgba(160, 230, 255, ...)` - Light cyan
- Electric: `rgba(180, 240, 255, ...)` - Very light cyan

**Light Mode** (deep blue for visibility):
- Magnetic: `rgba(0, 100, 200, ...)` - Deep blue
- Light: `rgba(0, 120, 220, ...)` - Rich blue
- Electric: `rgba(40, 100, 200, ...)` - Medium-dark blue

## Effect Behavior

### Magnetic Effect
- **Moving**: Spawns shrinking circles at cursor position every 25px of movement
- **Trail**: Circles fade in from transparency, shrink concentrically, and disappear
- **Hovering**: 5-stage animation cycle:
  1. Box shadow (800ms)
  2. Solid border with 8px corner radius (800ms)
  3. Border transforms to dotted pattern with smooth transition (800ms)
  4. Dotted pattern flows clockwise using `lineDashOffset` (800ms)
  5. Continues flowing + adds 1.5px shake effect (stays until hover ends)
- **Configuration**:
  - Circle radius: 40px, shrink speed: 1.2px/frame, fade-in speed: 0.06/frame
  - Max circles: 50, spawn distance: 25px
  - Hover: Flow speed 0.5px/frame, shake amplitude 1.5px

### Light Effect
- **Moving**: Lightsaber-style trail drawn between cursor positions every 8px
- **Hovering**: Snake ring animation circles around hovered element border
- **Trail**: Gradual fade with outer glow (8px width) and inner core (3px width)
- **Snake ring**: Travels along element perimeter, adds box-shadow after first loop

### Electric Effect
- **Moving**: Arc segments with jitter and branching (60% chance per arc)
- **Hovering**: Lightning strike from top, hit sparks, then static charging state
- **Charged state**: Multi-layer bright box-shadow, 3px outline with offset, brightness(1.2) + saturate(1.3) filters - no animation or pulsing
- **Discharge**: After charging, element discharges energy outward in multiple arcs

### General
- **Scroll**: Clears hover effects to prevent visual artifacts
- **Canvas lifecycle**: Started on movement, stopped on idle/effect change
- **Distance-based spawning**: Both magnetic and light use movement distance tracking (not time-based)
- **Color adaptation**: All effects read `turboColorMode` and adapt colors dynamically
