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
      transform-origin: center;
      animation: turbo-vecter-magnetic-snap 900ms ease-out;
      transition: transform 900ms ease-out !important;
      transform: scale(1.08);
    }

    @keyframes turbo-vecter-magnetic-snap {
      0% {
        transform: scale(1);
      }
      25% {
        transform: scale(1.02);
      }      
      50% {
        transform: scale(1.04);
      }
      75% {
        transform: scale(1.06);
      }
      100% {
        transform: scale(1.08);
      }
    }
  `
}

export default magnetic
