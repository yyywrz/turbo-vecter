// Color configuration for dark and light mode websites
export type ColorMode = "dark" | "light"

export const MAGNETIC_COLORS = {
  dark: {
    circle: "rgba(140, 220, 255, 0.9)",
    circleGlow: "rgba(140, 220, 255, 1)",
    circleInner: "rgba(200, 240, 255, 1)",
    border: "rgba(140, 220, 255, 0.9)",
    boxShadow: "0 0 20px rgba(140, 220, 255, 0.6), 0 0 40px rgba(140, 220, 255, 0.4), inset 0 0 15px rgba(140, 220, 255, 0.2)"
  },
  light: {
    circle: "rgba(0, 100, 200, 0.9)",
    circleGlow: "rgba(0, 80, 180, 1)",
    circleInner: "rgba(0, 60, 140, 1)",
    border: "rgba(0, 100, 200, 0.9)",
    boxShadow: "0 0 20px rgba(0, 100, 200, 0.7), 0 0 40px rgba(0, 80, 180, 0.5), inset 0 0 15px rgba(0, 100, 200, 0.3)"
  }
}

export const LIGHT_COLORS = {
  dark: {
    trail: "rgba(160, 230, 255, 1)",
    trailGlow: "rgba(90, 180, 255, 0.9)",
    trailShadow: "rgba(120, 200, 255, 0.95)",
    snakeRing: "rgba(100, 200, 255, 1)",
    boxShadow: "0 0 20px rgba(100, 200, 255, 0.6), 0 0 40px rgba(100, 200, 255, 0.3)"
  },
  light: {
    trail: "rgba(0, 120, 220, 1)",
    trailGlow: "rgba(20, 80, 180, 0.95)",
    trailShadow: "rgba(0, 100, 200, 0.95)",
    snakeRing: "rgba(0, 80, 180, 1)",
    boxShadow: "0 0 20px rgba(0, 100, 200, 0.7), 0 0 40px rgba(0, 80, 180, 0.5)"
  }
}

export const ELECTRIC_COLORS = {
  dark: {
    arcOuter: "rgba(180, 240, 255, 1)",
    arcCore: "rgba(255, 255, 255, 1)",
    arcShadow: "rgba(180, 240, 255, 1)",
    sparkGlow: "rgba(150, 220, 255, 1)",
    sparkCore: "rgba(200, 240, 255, 1)",
    chargedBoxShadow: "0 0 30px rgba(100, 200, 255, 1), 0 0 60px rgba(100, 200, 255, 0.8), 0 0 90px rgba(50, 150, 255, 0.6), inset 0 0 30px rgba(150, 220, 255, 0.5)",
    chargedOutline: "rgba(150, 220, 255, 0.9)"
  },
  light: {
    arcOuter: "rgba(40, 100, 200, 1)",
    arcCore: "rgba(0, 60, 140, 1)",
    arcShadow: "rgba(0, 100, 200, 1)",
    sparkGlow: "rgba(0, 80, 180, 1)",
    sparkCore: "rgba(40, 100, 200, 1)",
    chargedBoxShadow: "0 0 30px rgba(0, 100, 200, 1), 0 0 60px rgba(0, 80, 180, 0.9), 0 0 90px rgba(0, 60, 140, 0.7), inset 0 0 30px rgba(0, 100, 200, 0.6)",
    chargedOutline: "rgba(0, 100, 200, 0.95)"
  }
}
