import type { EffectDefinition } from "./types"

const light: EffectDefinition = {
  type: "light",
  classNames: {
    moving: "turbo-vecter-moving-light",
    hover: "turbo-vecter-hover-light"
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

    .turbo-vecter-hover-light {
      position: relative !important;
      outline: 0 !important;
      border-radius: inherit !important;
      box-shadow: 0 0 0 6px rgba(225, 255, 255, 1),
        0 0 90px rgba(205, 255, 255, 1),
        0 0 180px rgba(170, 240, 255, 0.98),
        0 0 280px rgba(130, 210, 255, 0.92),
        0 0 380px rgba(90, 170, 255, 0.85) !important;
      transition: box-shadow 8s ease, border-color 8s ease !important;
      border-color: rgba(235, 255, 255, 1) !important;
    }

    .turbo-vecter-hover-light::after {
      content: "";
      position: absolute;
      inset: -5px;
      border-radius: inherit;
      padding: 5px;
      background: linear-gradient(
        90deg,
        rgba(120, 200, 255, 0.55),
        rgba(255, 255, 255, 1),
        rgba(120, 200, 255, 0.55)
      );
      background-size: 460% 100%;
      animation: turbo-vecter-flow 1.6s linear infinite;
      filter: drop-shadow(0 0 34px rgba(200, 245, 255, 1));
      pointer-events: none;
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }

    @keyframes turbo-vecter-flow {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: 200% 50%;
      }
    }

    .turbo-vecter-hover-light.turbo-vecter-hover-light-charged {
      box-shadow: 0 0 0 8px rgba(255, 255, 255, 1),
        0 0 140px rgba(235, 255, 255, 1),
        0 0 260px rgba(200, 245, 255, 1),
        0 0 420px rgba(150, 220, 255, 0.98),
        0 0 620px rgba(110, 190, 255, 0.95) !important;
      border-color: rgba(255, 255, 255, 1) !important;
      filter: saturate(1.6) brightness(1.35) !important;
      transition: box-shadow 1.5s ease, border-color 1.5s ease, filter 1.5s ease !important;
    }

    .turbo-vecter-hover-light.turbo-vecter-hover-light-charged::after {
      inset: -7px;
      padding: 7px;
      background-size: 520% 100%;
      animation: turbo-vecter-flow 0.8s linear infinite;
      filter: drop-shadow(0 0 48px rgba(220, 255, 255, 1));
    }
  `
}

export default light
