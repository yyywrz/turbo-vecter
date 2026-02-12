import type { EffectDefinition } from "./types"

const light: EffectDefinition = {
  type: "light",
  classNames: {
    moving: "turbo-vecter-moving-light",
    hover: ""
  },
  css: `
    body.turbo-vecter-moving-light * {
      cursor: none !important;
    }

    .turbo-vecter-light-canvas {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
  `
}

export default light
