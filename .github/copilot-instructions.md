# Copilot instructions for turbo-vecter

## Project overview
- Plasmo-based browser extension (Manifest V3) with React UI and content scripts.
- Build outputs are generated under `build/` (e.g., `build/chrome-mv3-dev/` for dev).

## Key files and patterns
- Popup UI entry: `popup.tsx` re-exports the UI from `popup/Popup.tsx`.
- Content script entry: `content.ts` initializes logic from `content/index.ts`.
- Effect modules live in `content/effects/` and are registered via `content/effects/index.ts`.
- TypeScript config extends Plasmo base config in `tsconfig.json` and supports `~*` path aliases.
- Manifest settings (including permissions) are defined in `package.json` under `manifest`.

## Developer workflows
- Dev server: `pnpm dev` (or `npm run dev`). Load the unpacked extension from `build/chrome-mv3-dev` in Chrome.
- Production build: `pnpm build` (or `npm run build`).
- Packaging for store upload: `pnpm package`.

## Project conventions
- New extension surfaces follow Plasmo’s root-file convention:
  - Options page: add `options.tsx` with a default React component export.
  - Content script: add `content.ts` and reload the extension.
- Popup state persists via `chrome.storage` keys: `turboEffect`, `turboLanguage`.
- Effects are controlled by CSS classes defined per module (e.g., `turbo-vecter-hover-light`).

## Integration points
- Plasmo framework (`plasmo`) provides dev server, build pipeline, and extension scaffolding.
- React 18 is the UI layer for popup and other extension pages.
- Content scripts run on `<all_urls>` and render canvas overlays for cursor effects.
