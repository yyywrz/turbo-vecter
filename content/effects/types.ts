export type EffectType = "off" | "magnetic" | "light" | "electric"

export type EffectDefinition = {
  type: EffectType
  classNames: {
    moving: string
    hover: string
  }
  css: string
}
