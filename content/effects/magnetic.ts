import type { EffectDefinition } from "./types"

const magnetic: EffectDefinition = {
  type: "magnetic",
  classNames: {
    moving: "turbo-vecter-moving-magnetic",
    hover: "turbo-vecter-hover-magnetic"
  },
  css: `
    body.turbo-vecter-moving-magnetic * {
      cursor: none !important;
    }

    .turbo-vecter-hover-magnetic {
    }
  `
}

export default magnetic
