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

    @keyframes turbo-vecter-electric-pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(1.02);
        opacity: 0.95;
      }
    }
  `
}

export default electric
