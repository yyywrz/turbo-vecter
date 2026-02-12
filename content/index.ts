import {
  allMovingClasses,
  effectRegistry,
  ensureEffectStyles
} from "./effects"
import type { EffectType } from "./effects/types"
import { lightCanvas } from "./lightCanvas"
import { magneticCanvas } from "./magneticCanvas"
import { electricCanvas } from "./electricCanvas"

try {
  document.documentElement.setAttribute("data-turbo-vecter-module", "loaded")
} catch (error) {
  console.warn("[Turbo‑Vecter] Failed to tag module", error)
}

console.log("[Turbo‑Vecter] Content script module loaded")

const STILL_DELAY = 140
const DEFAULT_EFFECT: EffectType = "off"
const STORAGE_KEY = "turboEffect"
const MIN_ACTIVE_DISTANCE = 12
const SPAWN_DISTANCE = 8
const MAGNETIC_SPAWN_DISTANCE = 25
const IDLE_TIMEOUT = 2000
const DEBUG = true

const removeClasses = (element: Element | null, classes: string[]) => {
  if (!element) return
  classes.forEach((className) => element.classList.remove(className))
}

const addClass = (element: Element | null, className: string) => {
  if (!element) return
  element.classList.add(className)
}

const applyMovingEffect = (effect: EffectType) => {
  removeClasses(document.body, allMovingClasses)
  addClass(document.body, effectRegistry[effect].classNames.moving)
}

const clearMovingEffect = () => {
  removeClasses(document.body, allMovingClasses)
}

const setupCursorEffects = () => {
  console.log("[Turbo‑Vecter] Content script initialized")
  try {
    document.documentElement.setAttribute("data-turbo-vecter", "initialized")
  } catch (error) {
    console.warn("[Turbo‑Vecter] Failed to tag document", error)
  }
  ensureEffectStyles()

  let currentEffect: EffectType = DEFAULT_EFFECT
  const storage = globalThis.chrome?.storage?.sync ?? globalThis.chrome?.storage?.local
  let lastTarget: Element | null = null
  let lastPosition = { x: 0, y: 0 }
  let lastMovePosition: { x: number; y: number } | null = null
  let lastSpawnPosition: { x: number; y: number } | null = null
  let lastDrawPosition: { x: number; y: number } | null = null
  let lastMagneticSpawnPosition: { x: number; y: number } | null = null
  let stillTimeout: number | undefined
  let isMoving = false
  let idleTimeout: number | undefined
  let electricLastSpawn = 0
  const ELECTRIC_SPAWN_INTERVAL = 70
  const ELECTRIC_MOVE_ARC_COUNT = 3
  const ELECTRIC_MOVE_SEGMENTS = 7

  const scheduleStill = () => {
    if (stillTimeout) {
      window.clearTimeout(stillTimeout)
    }

    stillTimeout = window.setTimeout(() => {
      isMoving = false
      clearMovingEffect()
      if (currentEffect === "electric") {
        electricCanvas.stop()
      }

      const target = document.elementFromPoint(lastPosition.x, lastPosition.y)
      if (currentEffect === "light" && target) {
        // Start snake only if we don't already have one running on this element
        if (target !== lastTarget || !lightCanvas.isSnakeRunning()) {
          lastTarget = target
          lightCanvas.startSnake(lastTarget)
        }
      } else if (target && target !== lastTarget) {
        lastTarget = target
      }
      if (currentEffect === "magnetic" && lastTarget) {
        magneticCanvas.start()
        magneticCanvas.startHoverWaves(lastTarget)
      }
      if (currentEffect === "electric" && lastTarget) {
        electricCanvas.start()
        electricCanvas.startHoverArcs(lastTarget)
      }
    }, STILL_DELAY)
  }

  const setEffectFromStorage = (value?: EffectType) => {
    if (value && effectRegistry[value]) {
      currentEffect = value
    } else {
      currentEffect = DEFAULT_EFFECT
    }

    if (DEBUG) {
      console.log("[Turbo‑Vecter] Effect set", currentEffect)
    }

    if (currentEffect !== "light") {
      lightCanvas.stop()
      lightCanvas.stopSnake()
      lastSpawnPosition = null
      lastDrawPosition = null
    }
    if (currentEffect !== "magnetic") {
      magneticCanvas.stop()
      magneticCanvas.stopHoverWaves()
      lastMagneticSpawnPosition = null
    }
    if (currentEffect !== "electric") {
      electricCanvas.stop()
      electricCanvas.stopHoverArcs()
    }
  }

  const handleResize = () => {
    lightCanvas.resize()
    magneticCanvas.resize()
    electricCanvas.resize()
  }

  if (storage) {
    storage.get([STORAGE_KEY], (result) => {
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Storage read", result)
      }
      setEffectFromStorage(result[STORAGE_KEY])
    })

    chrome.storage.onChanged.addListener((changes, area) => {
      const storageArea = storage === chrome.storage.sync ? "sync" : "local"
      if (area !== storageArea || !changes[STORAGE_KEY]) {
        return
      }

      if (DEBUG) {
        console.log("[Turbo‑Vecter] Storage changed", changes[STORAGE_KEY])
      }
      setEffectFromStorage(changes[STORAGE_KEY].newValue)
    })
  }

  const handleMove = (event: MouseEvent) => {
    lastPosition = { x: event.clientX, y: event.clientY }
    if (DEBUG && Math.random() < 0.02) {
      console.log("[Turbo‑Vecter] Mouse move", lastPosition)
    }

    const moveDx = lastMovePosition ? lastPosition.x - lastMovePosition.x : 0
    const moveDy = lastMovePosition ? lastPosition.y - lastMovePosition.y : 0
    const moveDistance = Math.hypot(moveDx, moveDy)
    lastMovePosition = { ...lastPosition }

    // Check if we moved to a different element (even slow movement)
    const currentTarget = document.elementFromPoint(lastPosition.x, lastPosition.y)
    if (currentEffect === "light" && currentTarget !== lastTarget) {
      lightCanvas.stopSnake()
      lastTarget = currentTarget
    }

    if (moveDistance < MIN_ACTIVE_DISTANCE && currentEffect !== "magnetic") {
      clearMovingEffect()
      lightCanvas.stop()
      magneticCanvas.stop()
      magneticCanvas.stopHoverWaves()
      electricCanvas.stop()
      electricCanvas.stopHoverArcs()
      scheduleStill()
      return
    }

    if (!isMoving) {
      isMoving = true
    }

    if (currentEffect !== "magnetic") {
      applyMovingEffect(currentEffect)
    }

    if (currentEffect === "light") {
      lightCanvas.start()
      const dx = lastSpawnPosition ? lastPosition.x - lastSpawnPosition.x : 0
      const dy = lastSpawnPosition ? lastPosition.y - lastSpawnPosition.y : 0
      const distance = Math.hypot(dx, dy)
      if (!lastSpawnPosition || distance >= SPAWN_DISTANCE) {
        if (DEBUG) {
          console.log("[Turbo‑Vecter] Trail step", { distance })
        }
        if (!lastDrawPosition) {
          lightCanvas.drawTrail(lastPosition, {
            x: lastPosition.x + 0.1,
            y: lastPosition.y + 0.1
          })
        }
        if (lastDrawPosition) {
          lightCanvas.drawTrail(lastDrawPosition, lastPosition)
        }
        lastDrawPosition = { ...lastPosition }
        lastSpawnPosition = { ...lastPosition }
      }

      if (idleTimeout) {
        window.clearTimeout(idleTimeout)
      }
      idleTimeout = window.setTimeout(() => {
        lightCanvas.stop()
      }, IDLE_TIMEOUT)
    }
    if (currentEffect === "magnetic") {
      magneticCanvas.start()
      const dx = lastMagneticSpawnPosition ? lastPosition.x - lastMagneticSpawnPosition.x : 0
      const dy = lastMagneticSpawnPosition ? lastPosition.y - lastMagneticSpawnPosition.y : 0
      const distance = Math.hypot(dx, dy)
      if (!lastMagneticSpawnPosition || distance >= MAGNETIC_SPAWN_DISTANCE) {
        magneticCanvas.spawnCircle(lastPosition.x, lastPosition.y)
        lastMagneticSpawnPosition = { ...lastPosition }
      }
    }
    if (currentEffect === "electric") {
      electricCanvas.start()
      const now = performance.now()
      if (now - electricLastSpawn > ELECTRIC_SPAWN_INTERVAL) {
        const target = lastTarget ?? document.elementFromPoint(lastPosition.x, lastPosition.y)
        if (target instanceof HTMLElement) {
          const rect = target.getBoundingClientRect()
          const endX = Math.min(Math.max(lastPosition.x, rect.left), rect.right)
          const endY = Math.min(Math.max(lastPosition.y, rect.top), rect.bottom)
          for (let i = 0; i < ELECTRIC_MOVE_ARC_COUNT; i += 1) {
            electricCanvas.spawnArc(lastPosition, { x: endX, y: endY }, ELECTRIC_MOVE_SEGMENTS)
          }
        }
        electricLastSpawn = now
      }
    }
    scheduleStill()
  }

  const handleLeave = () => {
    clearMovingEffect()
    lightCanvas.stop()
    lightCanvas.stopSnake()
    magneticCanvas.stop()
    magneticCanvas.stopHoverWaves()
    electricCanvas.stop()
    electricCanvas.stopHoverArcs()
    lastTarget = null
  }

  const handleScroll = () => {
    // Clear hover effects during scroll to prevent snake ring staying on old position
    lightCanvas.stopSnake()
    if (DEBUG) {
      console.log("[Turbo‑Vecter] Scroll detected, cleared snake")
    }
  }

  window.addEventListener("mousemove", (event) => {
    try {
      handleMove(event)
    } catch (error) {
      if (error instanceof Error && error.message.includes("context")) {
        console.warn("[Turbo‑Vecter] Context invalidated in mousemove handler")
      } else {
        console.error("[Turbo‑Vecter] Error in mousemove handler:", error)
      }
    }
  }, { passive: true })
  window.addEventListener("mouseleave", () => {
    try {
      handleLeave()
    } catch (error) {
      if (error instanceof Error && error.message.includes("context")) {
        console.warn("[Turbo‑Vecter] Context invalidated in mouseleave handler")
      } else {
        console.error("[Turbo‑Vecter] Error in mouseleave handler:", error)
      }
    }
  })
  window.addEventListener("blur", () => {
    try {
      handleLeave()
    } catch (error) {
      if (error instanceof Error && error.message.includes("context")) {
        console.warn("[Turbo‑Vecter] Context invalidated in blur handler")
      } else {
        console.error("[Turbo‑Vecter] Error in blur handler:", error)
      }
    }
  })
  window.addEventListener("resize", () => {
    try {
      handleResize()
    } catch (error) {
      if (error instanceof Error && error.message.includes("context")) {
        console.warn("[Turbo‑Vecter] Context invalidated in resize handler")
      } else {
        console.error("[Turbo‑Vecter] Error in resize handler:", error)
      }
    }
  }, { passive: true })
  window.addEventListener("scroll", () => {
    try {
      handleScroll()
    } catch (error) {
      if (error instanceof Error && error.message.includes("context")) {
        console.warn("[Turbo‑Vecter] Context invalidated in scroll handler")
      } else {
        console.error("[Turbo‑Vecter] Error in scroll handler:", error)
      }
    }
  }, { passive: true })

  return () => {
    window.removeEventListener("mousemove", handleMove)
    window.removeEventListener("mouseleave", handleLeave)
    window.removeEventListener("blur", handleLeave)
    window.removeEventListener("resize", handleResize)
    window.removeEventListener("scroll", handleScroll)
    lightCanvas.cleanup()
    magneticCanvas.cleanup()
    electricCanvas.cleanup()
  }
}

export default setupCursorEffects
