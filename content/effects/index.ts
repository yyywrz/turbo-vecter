import electric from "./electric"
import light from "./light"
import magnetic from "./magnetic"
import off from "./off"
import type { EffectDefinition, EffectType } from "./types"

const effects: EffectDefinition[] = [off, magnetic, light, electric]

const registry = effects.reduce<Record<EffectType, EffectDefinition>>(
  (acc, effect) => {
    acc[effect.type] = effect
    return acc
  },
  {} as Record<EffectType, EffectDefinition>
)

const styleId = "turbo-vecter-effects"

const ensureEffectStyles = () => {
  if (document.getElementById(styleId)) {
    return
  }

  const style = document.createElement("style")
  style.id = styleId
  style.textContent = effects.map((effect) => effect.css).join("\n")
  document.head.appendChild(style)
}

const allHoverClasses = effects.map((effect) => effect.classNames.hover)
const allMovingClasses = effects.map((effect) => effect.classNames.moving)

export {
  allHoverClasses,
  allMovingClasses,
  ensureEffectStyles,
  registry as effectRegistry
}
