import {
  allMovingClasses,
  effectRegistry,
  ensureEffectStyles
} from "./effects"
import type { EffectType } from "./effects/types"
import { lightCanvas } from "./lightCanvas"

try {
  document.documentElement.setAttribute("data-turbo-vecter-module", "loaded")
} catch (error) {
  console.warn("[Turbo‑Vecter] Failed to tag module", error)
}

console.log("[Turbo‑Vecter] Content script module loaded")

const STILL_DELAY = 140
const DEFAULT_EFFECT: EffectType = "off"
const STORAGE_KEY = "turboEffect"
const MAGNETIC_CANVAS_ID = "turbo-vecter-magnetic-canvas"
const ELECTRIC_CANVAS_ID = "turbo-vecter-electric-canvas"
const MIN_ACTIVE_DISTANCE = 12
const SPAWN_DISTANCE = 8
const IDLE_TIMEOUT = 2000
const MAGNETIC_RIPPLE_INTERVAL = 260
const MAGNETIC_RIPPLE_SPEED = 0.01
const MAGNETIC_RIPPLE_MAX = 15
const MAGNETIC_RIPPLE_FADE =  0.001
const MAGNETIC_WAVE_INTERVAL = 300
const MAGNETIC_CHARGE_DELAY = 800
const MAGNETIC_CURSOR_CIRCLE_RADIUS = 28
const MAGNETIC_CURSOR_ROTATION_SPEED = 0.04
const ELECTRIC_ARC_FADE = "rgba(0, 0, 0, 0.18)"
const ELECTRIC_MAX_ARCS = 24
const ELECTRIC_SPAWN_INTERVAL = 70
const ELECTRIC_JITTER = 16
const ELECTRIC_HOVER_INTERVAL = 800
const ELECTRIC_HOVER_HIT_DURATION = 600
const ELECTRIC_HOVER_CHARGE_DURATION = 1200
const ELECTRIC_HOVER_PAUSE_BEFORE_DISCHARGE = 600
const ELECTRIC_HOVER_DISCHARGE_DURATION = 1500
const ELECTRIC_HOVER_PAUSE_AFTER_DISCHARGE = 2000
const ELECTRIC_DISCHARGE_COUNT = 6
const ELECTRIC_MOVE_ARC_COUNT = 3
const ELECTRIC_MOVE_SEGMENTS = 7
const ELECTRIC_HOVER_SEGMENTS = 5
const ELECTRIC_BRANCH_CHANCE = 0.6
const ELECTRIC_BRANCH_SEGMENTS = 4
const DEBUG = true

type Arc = {
  points: { x: number; y: number }[]
  life: number
}

type Ripple = {
  x: number
  y: number
  radius: number
  alpha: number
}

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
  let lastMagneticPosition: { x: number; y: number } | null = null
  let stillTimeout: number | undefined
  let isMoving = false
  let magneticCanvas: HTMLCanvasElement | null = null
  let magneticCtx: CanvasRenderingContext2D | null = null
  let magneticFrameId: number | null = null
  let magneticCanvasSize = { width: 0, height: 0 }
  let magneticLastRipple = 0
  let magneticLastWave = 0
  let magneticHoverTarget: Element | null = null
  let magneticWaveInterval: number | undefined
  let magneticChargeTimeout: number | undefined
  let magneticCursorRotation = 0
  const magneticRipples: Ripple[] = []
  let electricCanvas: HTMLCanvasElement | null = null
  let electricCtx: CanvasRenderingContext2D | null = null
  let electricFrameId: number | null = null
  let electricCanvasSize = { width: 0, height: 0 }
  let electricLastSpawn = 0
  let electricHoverTimeout: number | undefined
  let electricHoverState: 'idle' | 'striking' | 'hit' | 'discharging' = 'idle'
  let electricHoverTarget: Element | null = null
  let electricHitPoint: { x: number; y: number } | null = null
  const electricArcs: Arc[] = []
  const electricHitSparks: Array<{ x: number; y: number; vx: number; vy: number; life: number }> = []

  const scheduleStill = () => {
    if (stillTimeout) {
      window.clearTimeout(stillTimeout)
    }

    stillTimeout = window.setTimeout(() => {
      isMoving = false
      clearMovingEffect()
      if (currentEffect === "electric") {
        stopElectricEffect()
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
        startMagneticCanvas()
        startMagneticHoverWaves(lastTarget)
      }
      if (currentEffect === "electric" && lastTarget) {
        startElectricCanvas()
        startElectricHoverArcs(lastTarget)
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
    }
    if (currentEffect !== "magnetic") {
      stopMagneticEffect()
    }
    if (currentEffect !== "electric") {
      stopElectricEffect()
    }
  }

  const styleOverlayCanvas = (target: HTMLCanvasElement) => {
    target.style.setProperty("position", "fixed", "important")
    target.style.setProperty("inset", "0", "important")
    target.style.setProperty("top", "0", "important")
    target.style.setProperty("left", "0", "important")
    target.style.setProperty("width", "100%", "important")
    target.style.setProperty("height", "100%", "important")
    target.style.setProperty("display", "block", "important")
    target.style.setProperty("visibility", "visible", "important")
    target.style.setProperty("opacity", "1", "important")
    target.style.setProperty("pointer-events", "none", "important")
    target.style.setProperty("z-index", "2147483647", "important")
    target.style.setProperty("background", "transparent", "important")
  }

  const ensureMagneticCanvas = () => {
    if (magneticCanvas) return magneticCanvas
    const existing = document.getElementById(MAGNETIC_CANVAS_ID)
    if (existing instanceof HTMLCanvasElement) {
      magneticCanvas = existing
    } else {
      magneticCanvas = document.createElement("canvas")
      magneticCanvas.id = MAGNETIC_CANVAS_ID
      const host = document.documentElement
      host.appendChild(magneticCanvas)
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Magnetic canvas appended", host.tagName)
      }
    }
    styleOverlayCanvas(magneticCanvas)
    magneticCtx = magneticCanvas.getContext("2d")
    resizeMagneticCanvas()
    return magneticCanvas
  }

  const resizeMagneticCanvas = () => {
    if (!magneticCanvas) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(window.innerWidth, document.documentElement.clientWidth)
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight)
    magneticCanvas.width = width * dpr
    magneticCanvas.height = height * dpr
    magneticCanvas.style.width = `${width}px`
    magneticCanvas.style.height = `${height}px`
    magneticCanvasSize = { width, height }
    if (magneticCtx) {
      magneticCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      magneticCtx.clearRect(0, 0, width, height)
    }
  }

  const spawnMagneticWave = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    // Start radius to ensure wave starts from border edges
    // Use the larger dimension to ensure coverage from all border points
    const startRadius = Math.max(
      Math.hypot(rect.width / 2, rect.height / 2), // diagonal to corner
      Math.max(rect.width / 2, rect.height / 2)    // to edge midpoint
    )
    
    magneticRipples.unshift({
      x: centerX,
      y: centerY,
      radius: startRadius,
      alpha: 0.95
    })
    if (magneticRipples.length > MAGNETIC_RIPPLE_MAX) {
      magneticRipples.pop()
    }
  }

  const startMagneticCanvas = () => {
    if (magneticFrameId !== null) return
    ensureMagneticCanvas()

    const render = (time: number) => {
      if (!magneticCtx) {
        magneticFrameId = null
        return
      }
      magneticCtx.clearRect(0, 0, magneticCanvasSize.width, magneticCanvasSize.height)

      // Update cursor rotation
      magneticCursorRotation += MAGNETIC_CURSOR_ROTATION_SPEED

      magneticRipples.forEach((ripple) => {
        ripple.radius += MAGNETIC_RIPPLE_SPEED
        ripple.alpha -= MAGNETIC_RIPPLE_FADE
      })

      for (let i = magneticRipples.length - 1; i >= 0; i -= 1) {
        if (magneticRipples[i].alpha <= 0) {
          magneticRipples.splice(i, 1)
        }
      }

      magneticCtx.lineWidth = 2
      magneticRipples.forEach((ripple) => {
        magneticCtx.strokeStyle = `rgba(140, 220, 255, ${ripple.alpha})`
        magneticCtx.beginPath()
        magneticCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        magneticCtx.stroke()
      })

      // Draw rotating dashed circle around cursor
      if (lastMagneticPosition) {
        magneticCtx.save()
        magneticCtx.translate(lastMagneticPosition.x, lastMagneticPosition.y)
        magneticCtx.rotate(magneticCursorRotation)
        magneticCtx.setLineDash([8, 8])
        magneticCtx.lineWidth = 2
        magneticCtx.strokeStyle = 'rgba(140, 220, 255, 0.8)'
        magneticCtx.beginPath()
        magneticCtx.arc(0, 0, MAGNETIC_CURSOR_CIRCLE_RADIUS, 0, Math.PI * 2)
        magneticCtx.stroke()
        magneticCtx.restore()
      }

      magneticFrameId = window.requestAnimationFrame(render)
    }

    magneticFrameId = window.requestAnimationFrame(render)
  }

  const startMagneticHoverWaves = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    stopMagneticHoverWaves()
    
    magneticHoverTarget = element
    
    // Phase 1: Add magnetic field charging effect to element
    element.style.boxShadow = '0 0 30px rgba(140, 220, 255, 0.6), 0 0 60px rgba(140, 220, 255, 0.4), inset 0 0 20px rgba(140, 220, 255, 0.2)'
    
    // Phase 2: After charging delay, start spawning waves
    magneticChargeTimeout = window.setTimeout(() => {
      // Spawn first wave
      if (magneticHoverTarget) {
        spawnMagneticWave(magneticHoverTarget)
      }
      
      // Continue spawning waves at interval
      magneticWaveInterval = window.setInterval(() => {
        if (magneticHoverTarget) {
          spawnMagneticWave(magneticHoverTarget)
        }
      }, MAGNETIC_WAVE_INTERVAL)
    }, MAGNETIC_CHARGE_DELAY)
  }

  const stopMagneticHoverWaves = () => {
    if (magneticChargeTimeout) {
      window.clearTimeout(magneticChargeTimeout)
      magneticChargeTimeout = undefined
    }
    if (magneticWaveInterval) {
      window.clearInterval(magneticWaveInterval)
      magneticWaveInterval = undefined
    }
    
    // Remove magnetic field effect
    if (magneticHoverTarget instanceof HTMLElement) {
      magneticHoverTarget.style.boxShadow = ''
    }
    
    magneticHoverTarget = null
  }

  const stopMagneticEffect = () => {
    stopMagneticHoverWaves()
    if (magneticFrameId !== null) {
      window.cancelAnimationFrame(magneticFrameId)
      magneticFrameId = null
    }
    lastMagneticPosition = null
    magneticRipples.length = 0
    if (magneticCtx) {
      magneticCtx.clearRect(0, 0, magneticCanvasSize.width, magneticCanvasSize.height)
    }
  }

  const ensureElectricCanvas = () => {
    if (electricCanvas) return electricCanvas
    const existing = document.getElementById(ELECTRIC_CANVAS_ID)
    if (existing instanceof HTMLCanvasElement) {
      electricCanvas = existing
    } else {
      electricCanvas = document.createElement("canvas")
      electricCanvas.id = ELECTRIC_CANVAS_ID
      const host = document.documentElement
      host.appendChild(electricCanvas)
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Electric canvas appended", host.tagName)
      }
    }
    styleOverlayCanvas(electricCanvas)
    electricCtx = electricCanvas.getContext("2d")
    resizeElectricCanvas()
    return electricCanvas
  }

  const resizeElectricCanvas = () => {
    if (!electricCanvas) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(window.innerWidth, document.documentElement.clientWidth)
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight)
    electricCanvas.width = width * dpr
    electricCanvas.height = height * dpr
    electricCanvas.style.width = `${width}px`
    electricCanvas.style.height = `${height}px`
    electricCanvasSize = { width, height }
    if (electricCtx) {
      electricCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      electricCtx.clearRect(0, 0, width, height)
    }
  }

  const stopElectricEffect = () => {
    stopElectricHoverArcs()
    if (electricFrameId !== null) {
      window.cancelAnimationFrame(electricFrameId)
      electricFrameId = null
    }
    electricArcs.length = 0
    electricHitSparks.length = 0
    if (electricCtx) {
      electricCtx.clearRect(0, 0, electricCanvasSize.width, electricCanvasSize.height)
    }
  }

  const startElectricCanvas = () => {
    if (electricFrameId !== null) return
    ensureElectricCanvas()

    const render = () => {
      if (!electricCtx) {
        electricFrameId = null
        return
      }

      electricCtx.globalCompositeOperation = "destination-out"
      electricCtx.fillStyle = ELECTRIC_ARC_FADE
      electricCtx.fillRect(0, 0, electricCanvasSize.width, electricCanvasSize.height)
      electricCtx.globalCompositeOperation = "source-over"

      for (let i = electricArcs.length - 1; i >= 0; i -= 1) {
        const arc = electricArcs[i]
        arc.life -= 0.01
        if (arc.life <= 0) {
          electricArcs.splice(i, 1)
          continue
        }
        electricCtx.strokeStyle = `rgba(220, 240, 255, ${arc.life})`
        electricCtx.lineWidth = 2
        electricCtx.beginPath()
        arc.points.forEach((point, index) => {
          if (index === 0) {
            electricCtx.moveTo(point.x, point.y)
          } else {
            electricCtx.lineTo(point.x, point.y)
          }
        })
        electricCtx.stroke()
      }

      // Draw hit sparks
      for (let i = electricHitSparks.length - 1; i >= 0; i -= 1) {
        const spark = electricHitSparks[i]
        spark.x += spark.vx
        spark.y += spark.vy
        spark.life -= 0.04
        if (spark.life <= 0) {
          electricHitSparks.splice(i, 1)
          continue
        }
        electricCtx.fillStyle = `rgba(255, 255, 255, ${spark.life})`
        electricCtx.beginPath()
        electricCtx.arc(spark.x, spark.y, 2, 0, Math.PI * 2)
        electricCtx.fill()
      }

      electricFrameId = window.requestAnimationFrame(render)
    }

    electricFrameId = window.requestAnimationFrame(render)
  }

  const spawnElectricArc = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    segments = ELECTRIC_HOVER_SEGMENTS
  ) => {
    const points: { x: number; y: number }[] = []
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments
      const jitter = (Math.random() - 0.5) * ELECTRIC_JITTER
      points.push({
        x: from.x + dx * t + nx * jitter,
        y: from.y + dy * t + ny * jitter
      })
    }
    electricArcs.push({ points, life: 1 })
    if (electricArcs.length > ELECTRIC_MAX_ARCS) {
      electricArcs.shift()
    }

    if (Math.random() < ELECTRIC_BRANCH_CHANCE) {
      const branchPoint = points[Math.floor(points.length * 0.6)]
      const branchTarget = {
        x: branchPoint.x + (Math.random() - 0.5) * 120,
        y: branchPoint.y + (Math.random() - 0.5) * 120
      }
      spawnElectricArc(branchPoint, branchTarget, ELECTRIC_BRANCH_SEGMENTS)
    }
  }

  const getRectEdgePoint = (rect: DOMRect) => {
    const edge = Math.floor(Math.random() * 4)
    switch (edge) {
      case 0:
        return { x: rect.left + Math.random() * rect.width, y: rect.top }
      case 1:
        return { x: rect.right, y: rect.top + Math.random() * rect.height }
      case 2:
        return { x: rect.left + Math.random() * rect.width, y: rect.bottom }
      default:
        return { x: rect.left, y: rect.top + Math.random() * rect.height }
    }
  }

  const createHitSparks = (x: number, y: number) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      const speed = 2 + Math.random() * 3
      electricHitSparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1
      })
    }
  }

  const dischargeFromElement = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    const rect = element.getBoundingClientRect()
    
    for (let i = 0; i < ELECTRIC_DISCHARGE_COUNT; i++) {
      const from = getRectEdgePoint(rect)
      const angle = Math.random() * Math.PI * 2
      const distance = 80 + Math.random() * 120
      const to = {
        x: from.x + Math.cos(angle) * distance,
        y: from.y + Math.sin(angle) * distance
      }
      setTimeout(() => {
        spawnElectricArc(from, to, 4)
      }, Math.random() * ELECTRIC_HOVER_DISCHARGE_DURATION)
    }
  }

  const electricHoverCycle = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    if (electricHoverState !== 'idle' && electricHoverTarget !== element) {
      return
    }
    
    electricHoverTarget = element
    electricHoverState = 'striking'
    
    // Phase 1: Strike from top
    const rect = element.getBoundingClientRect()
    const from = {
      x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 60,
      y: 0
    }
    const to = getRectEdgePoint(rect)
    electricHitPoint = to
    spawnElectricArc(from, to, ELECTRIC_HOVER_SEGMENTS)
    
    // Phase 2: Hit effect and start charging animation
    electricHoverTimeout = window.setTimeout(() => {
      if (electricHitPoint) {
        createHitSparks(electricHitPoint.x, electricHitPoint.y)
      }
      electricHoverState = 'hit'
      
      // Add charging glow to element
      if (element instanceof HTMLElement) {
        element.style.boxShadow = '0 0 20px rgba(220, 240, 255, 0.8), 0 0 40px rgba(180, 220, 255, 0.6), inset 0 0 20px rgba(220, 240, 255, 0.3)'
        element.style.outline = '2px solid rgba(220, 240, 255, 0.6)'
        element.style.outlineOffset = '2px'
      }
      
      // Phase 3: Charging animation duration, then pause before discharge
      electricHoverTimeout = window.setTimeout(() => {
        // Pause before discharge
        electricHoverTimeout = window.setTimeout(() => {
          electricHoverState = 'discharging'
          dischargeFromElement(element)
          
          // Phase 4: Discharge completes, then pause before removing glow
          electricHoverTimeout = window.setTimeout(() => {
            // Remove charging glow immediately when discharge ends
            if (element instanceof HTMLElement) {
              element.style.boxShadow = ''
              element.style.outline = ''
              element.style.outlineOffset = ''
            }
            
            // Pause after discharge
            electricHoverTimeout = window.setTimeout(() => {
              electricHoverState = 'idle'
              
              if (electricHoverTarget === element) {
                electricHoverCycle(element)
              }
            }, ELECTRIC_HOVER_PAUSE_AFTER_DISCHARGE)
          }, ELECTRIC_HOVER_DISCHARGE_DURATION)
        }, ELECTRIC_HOVER_PAUSE_BEFORE_DISCHARGE)
      }, ELECTRIC_HOVER_CHARGE_DURATION)
    }, ELECTRIC_HOVER_HIT_DURATION)
  }

  const startElectricHoverArcs = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    stopElectricHoverArcs()
    electricHoverCycle(element)
  }

  const stopElectricHoverArcs = () => {
    if (electricHoverTimeout) {
      window.clearTimeout(electricHoverTimeout)
      electricHoverTimeout = undefined
    }
    
    // Clear element glow
    if (electricHoverTarget instanceof HTMLElement) {
      electricHoverTarget.style.boxShadow = ''
      electricHoverTarget.style.outline = ''
      electricHoverTarget.style.outlineOffset = ''
    }
    
    electricHoverState = 'idle'
    electricHoverTarget = null
    electricHitPoint = null
  }

  const handleResize = () => {
    lightCanvas.resize()
    resizeMagneticCanvas()
    resizeElectricCanvas()
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
      stopMagneticEffect()
      stopElectricEffect()
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
      startMagneticCanvas()
      lastMagneticPosition = { ...lastPosition }
    }
    if (currentEffect === "electric") {
      startElectricCanvas()
      if (electricHoverInterval) {
        window.clearInterval(electricHoverInterval)
        electricHoverInterval = undefined
      }
      const now = performance.now()
      if (now - electricLastSpawn > ELECTRIC_SPAWN_INTERVAL) {
        const target = lastTarget ?? document.elementFromPoint(lastPosition.x, lastPosition.y)
        if (target instanceof HTMLElement) {
          const rect = target.getBoundingClientRect()
          const endX = Math.min(Math.max(lastPosition.x, rect.left), rect.right)
          const endY = Math.min(Math.max(lastPosition.y, rect.top), rect.bottom)
          for (let i = 0; i < ELECTRIC_MOVE_ARC_COUNT; i += 1) {
            spawnElectricArc(lastPosition, { x: endX, y: endY }, ELECTRIC_MOVE_SEGMENTS)
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
    stopMagneticEffect()
    stopElectricEffect()
    lastTarget = null
  }

  window.addEventListener("mousemove", handleMove, { passive: true })
  window.addEventListener("mouseleave", handleLeave)
  window.addEventListener("blur", handleLeave)
  window.addEventListener("resize", handleResize, { passive: true })

  return () => {
    window.removeEventListener("mousemove", handleMove)
    window.removeEventListener("mouseleave", handleLeave)
    window.removeEventListener("blur", handleLeave)
    window.removeEventListener("resize", handleResize)
    lightCanvas.cleanup()
    if (magneticCanvas?.parentElement) {
      magneticCanvas.parentElement.removeChild(magneticCanvas)
    }
    if (electricCanvas?.parentElement) {
      electricCanvas.parentElement.removeChild(electricCanvas)
    }
  }
}

export default setupCursorEffects
