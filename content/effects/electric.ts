import type { EffectDefinition } from "./types"

const electric: EffectDefinition = {
  type: "electric",
  classNames: {
    moving: "turbo-vecter-moving-electric",
    hover: "turbo-vecter-hover-electric"
  },
  css: `
    body.turbo-vecter-moving-electric * {
      cursor: none !important;
    }

    .turbo-vecter-hover-electric {
    }
  `
}

export default electric
