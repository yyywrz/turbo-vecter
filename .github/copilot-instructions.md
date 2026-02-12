# Copilot instructions for turbo-vecter

## Project overview
- Plasmo-based browser extension (Manifest V3) with React UI and content scripts.
- Cursor effects are rendered via DOM classes and full-screen canvas overlays.
- Includes color mode system (dark/light) for optimal visibility on different website backgrounds.
- Build outputs are generated under `build/` (e.g., `build/chrome-mv3-dev/` for dev).

## Key files and patterns
- Popup UI entry: `popup.tsx` re-exports the UI from `popup/Popup.tsx`.
- Popup state is persisted with `chrome.storage.sync` (falls back to `chrome.storage.local`).
- Content script entry: `content.ts` initializes logic from `content/index.ts`.
- Effect modules live in `content/effects/` and are registered via `content/effects/index.ts`.
- Canvas overlays: `content/lightCanvas.ts`, `content/magneticCanvas.ts`, `content/electricCanvas.ts`.
- TypeScript config extends Plasmo base config in `tsconfig.json` and supports `~*` path aliases.
- Manifest settings (including permissions/host permissions) are defined in `package.json` under `manifest`.

## Developer workflows
- Dev server: `pnpm dev` (or `npm run dev`). Load the unpacked extension from `build/chrome-mv3-dev` in Chrome.
- Production build: `pnpm build` (or `npm run build`).
- Packaging for store upload: `pnpm package`.

## Project conventions
- New extension surfaces follow Plasmo's root-file convention:
  - Options page: add `options.tsx` with a default React component export.
  - Content script: add `content.ts` and reload the extension.
- Popup state persists via `chrome.storage` keys: `turboEffect`, `turboLanguage`, `turboColorMode`.
- Supported effects: `off`, `magnetic`, `light`, `electric`.
- Effects are controlled by CSS classes defined per module (e.g., `turbo-vecter-hover-light`).
- Canvas overlays use fixed, full-viewport `<canvas>` elements with pointer events disabled.

## Color Mode System

### Architecture
- **Centralized configuration**: `content/colors.ts` exports color constants for all effects
- **Storage key**: `turboColorMode` ("dark" or "light")
- **Dynamic switching**: Each canvas module loads color mode on initialization and listens for storage changes
- **Color schemes**:
  - Dark mode: Bright cyan/blue colors (rgba(140-220, 220-255, 255, ...)) for dark websites
  - Light mode: Deep blue colors (rgba(0-40, 60-120, 140-220, ...)) for light websites

### Implementation Pattern
Each canvas module (`magneticCanvas.ts`, `lightCanvas.ts`, `electricCanvas.ts`):
1. Imports `ColorMode` type and color constants from `content/colors.ts`
2. Maintains `colorMode` state property (default: "dark")
3. Calls `loadColorMode()` in `ensure()` to read from storage and listen for changes
4. Uses `EFFECT_COLORS[this.colorMode]` to get current color scheme in rendering code

## Effect Implementation Details

### Magnetic Effect
- **Movement trail**: Distance-based spawning (25px intervals) creates shrinking circles at cursor position
- **Circle behavior**: Fade in (alpha 0→1), then shrink (radius 40px→5px) while fading out
- **Hover animation**: 5-stage cycle managed in `magneticCanvas.ts`:
  1. Box shadow (800ms)
  2. Solid border with 8px corner radius (800ms)
  3. Dotted border with smooth transition (800ms)
  4. Flowing dotted pattern using `lineDashOffset` (800ms)
  5. Continues flowing + adds 1.5px shake effect (stays until hover ends)
- **Configuration**: `MAGNETIC_SPAWN_DISTANCE = 25`, `MAGNETIC_MAX_CIRCLES = 50`, `MAGNETIC_SHRINK_SPEED = 1.2`
- **Colors**: Circle stroke, glow, inner ring, border, and box-shadow all use color mode

### Light Effect
- **Movement trail**: Distance-based spawning (8px intervals) draws connected line segments
- **Trail rendering**: Outer glow (8px width) + inner core (3px width) with gradual fade
- **Hover animation**: Snake ring that travels around element border with speed based on element size
- **Colors**: Trail outer/inner, shadow, snake ring, and box-shadow all use color mode

### Electric Effect
- **Movement arcs**: Spawns lightning arcs with jitter and branching (60% chance)
- **Hover charging**: Lightning strike from top, hit sparks, then element gets enhanced static glow
- **Charged state**: Multi-layer box-shadow, 3px outline with offset, brightness(1.2) + saturate(1.3) filters - no animation
- **Colors**: Arc outer/core, shadow, spark glow/core, charged box-shadow, and outline all use color mode

### Spawn Pattern
- Both magnetic and light use distance-based spawning tracked in `content/index.ts`
- `lastMagneticSpawnPosition` and `lastSpawnPosition` track last spawn points
- Spawning only occurs when cursor moves (not time-based), preventing spawns during hover/idle
- State cleanup: Position trackers reset when switching effects to prevent cross-contamination

## Integration points
- Plasmo framework (`plasmo`) provides dev server, build pipeline, and extension scaffolding.
- React 18 is the UI layer for popup and other extension pages.
- Content scripts run on HTTPS pages per `manifest.host_permissions` and render canvas overlays for cursor effects.
