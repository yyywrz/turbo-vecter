import {
  allHoverClasses,
  allMovingClasses,
  effectRegistry,
  ensureEffectStyles
} from "./effects"
import type { EffectType } from "./effects/types"

try {
  document.documentElement.setAttribute("data-turbo-vecter-module", "loaded")
} catch (error) {
  console.warn("[Turbo‑Vecter] Failed to tag module", error)
}

console.log("[Turbo‑Vecter] Content script module loaded")

const STILL_DELAY = 140
const DEFAULT_EFFECT: EffectType = "off"
const STORAGE_KEY = "turboEffect"
const LIGHT_CANVAS_ID = "turbo-vecter-light-canvas"
const MAGNETIC_CANVAS_ID = "turbo-vecter-magnetic-canvas"
const ELECTRIC_CANVAS_ID = "turbo-vecter-electric-canvas"
const MIN_ACTIVE_DISTANCE = 12
const SPAWN_DISTANCE = 8
const IDLE_TIMEOUT = 2000
const HOVER_CHARGE_DELAY = 20000
const TRAIL_FADE = "rgba(0, 0, 0, 0.06)"
const TRAIL_COLOR = "rgba(160, 230, 255, 1)"
const TRAIL_GLOW_COLOR = "rgba(90, 180, 255, 0.9)"
const TRAIL_WIDTH = 8
const TRAIL_INNER_WIDTH = 3
const MAGNETIC_RIPPLE_INTERVAL = 260
const MAGNETIC_RIPPLE_SPEED = 0.2
const MAGNETIC_RIPPLE_MAX = 20
const MAGNETIC_RIPPLE_FADE = 0.012
const ELECTRIC_ARC_FADE = "rgba(0, 0, 0, 0.18)"
const ELECTRIC_MAX_ARCS = 24
const ELECTRIC_SPAWN_INTERVAL = 70
const ELECTRIC_JITTER = 16
const ELECTRIC_HOVER_INTERVAL = 180
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

const applyHoverEffect = (element: Element | null, effect: EffectType) => {
  if (!element) return
  removeClasses(element, allHoverClasses)
  addClass(element, effectRegistry[effect].classNames.hover)
}

const applyChargedHoverEffect = (element: Element | null, effect: EffectType) => {
  if (!element || effect !== "light") return
  element.classList.add("turbo-vecter-hover-light-charged")
}

const clearChargedHoverEffect = (element: Element | null) => {
  if (!element) return
  element.classList.remove("turbo-vecter-hover-light-charged")
}

const clearHoverEffect = (element: Element | null) => {
  removeClasses(element, allHoverClasses)
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
  let animationFrameId: number | null = null
  let idleTimeout: number | undefined
  let hoverChargeTimeout: number | undefined
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  let canvasSize = { width: 0, height: 0 }
  let magneticCanvas: HTMLCanvasElement | null = null
  let magneticCtx: CanvasRenderingContext2D | null = null
  let magneticFrameId: number | null = null
  let magneticCanvasSize = { width: 0, height: 0 }
  let magneticLastRipple = 0
  const magneticRipples: Ripple[] = []
  let electricCanvas: HTMLCanvasElement | null = null
  let electricCtx: CanvasRenderingContext2D | null = null
  let electricFrameId: number | null = null
  let electricCanvasSize = { width: 0, height: 0 }
  let electricLastSpawn = 0
  let electricHoverInterval: number | undefined
  const electricArcs: Arc[] = []
  let debugStarted = false
  let debugDrawn = false

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
      if (target && target !== lastTarget) {
        clearHoverEffect(lastTarget)
        clearChargedHoverEffect(lastTarget)
        if (hoverChargeTimeout) {
          window.clearTimeout(hoverChargeTimeout)
        }
        lastTarget = target
      }
      applyHoverEffect(lastTarget, currentEffect)

      if (currentEffect === "light" && lastTarget) {
        hoverChargeTimeout = window.setTimeout(() => {
          applyChargedHoverEffect(lastTarget, currentEffect)
        }, HOVER_CHARGE_DELAY)
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
      stopLightCanvas()
    }
    if (currentEffect !== "magnetic") {
      stopMagneticEffect()
    }
    if (currentEffect !== "electric") {
      stopElectricEffect()
    }
  }

  const ensureLightCanvas = () => {
    if (canvas) return canvas
    const existing = document.getElementById(LIGHT_CANVAS_ID)
    if (existing instanceof HTMLCanvasElement) {
      canvas = existing
    } else {
      canvas = document.createElement("canvas")
      canvas.id = LIGHT_CANVAS_ID
      canvas.className = "turbo-vecter-light-canvas"
      const host = document.documentElement
      host.appendChild(canvas)
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Canvas appended", host.tagName)
      }
    }
    canvas.style.setProperty("position", "fixed", "important")
    canvas.style.setProperty("inset", "0", "important")
    canvas.style.setProperty("top", "0", "important")
    canvas.style.setProperty("left", "0", "important")
    canvas.style.setProperty("width", "100%", "important")
    canvas.style.setProperty("height", "100%", "important")
    canvas.style.setProperty("display", "block", "important")
    canvas.style.setProperty("visibility", "visible", "important")
    canvas.style.setProperty("opacity", "1", "important")
    canvas.style.setProperty("pointer-events", "none", "important")
    canvas.style.setProperty("z-index", "2147483647", "important")
    canvas.style.setProperty("background", "transparent", "important")
    ctx = canvas.getContext("2d")
    if (DEBUG && !ctx) {
      console.warn("[Turbo‑Vecter] Canvas context not available")
    }
    resizeCanvas()
    return canvas
  }

  const resizeCanvas = () => {
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(window.innerWidth, document.documentElement.clientWidth)
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvasSize = { width, height }
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
    }
    if (DEBUG) {
      console.log("[Turbo‑Vecter] Canvas resized", canvasSize, { dpr })
    }
  }

  const stopLightCanvas = () => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    if (idleTimeout) {
      window.clearTimeout(idleTimeout)
      idleTimeout = undefined
    }
    lastDrawPosition = null
    if (ctx) {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    }
  }

  const startLightCanvas = () => {
    if (animationFrameId !== null) return
    ensureLightCanvas()

    if (DEBUG && !debugStarted) {
      console.log("[Turbo‑Vecter] Light canvas started")
      debugStarted = true
    }

    const render = () => {
      if (!ctx) {
        animationFrameId = null
        return
      }

      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = TRAIL_FADE
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
      ctx.globalCompositeOperation = "source-over"

      animationFrameId = window.requestAnimationFrame(render)
    }

    animationFrameId = window.requestAnimationFrame(render)
  }

  const drawLightTrail = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (!ctx) return
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.strokeStyle = TRAIL_GLOW_COLOR
    ctx.lineWidth = TRAIL_WIDTH
    ctx.shadowBlur = 24
    ctx.shadowColor = "rgba(120, 200, 255, 0.95)"
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.strokeStyle = TRAIL_COLOR
    ctx.lineWidth = TRAIL_INNER_WIDTH
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    if (DEBUG && !debugDrawn) {
      console.log("[Turbo‑Vecter] Drew light trail", { from, to })
      debugDrawn = true
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

  const spawnMagneticRipple = (x: number, y: number) => {
    magneticRipples.unshift({
      x,
      y,
      radius: 12,
      alpha: 0.9
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

      if (lastMagneticPosition) {
        if (time - magneticLastRipple > MAGNETIC_RIPPLE_INTERVAL) {
          spawnMagneticRipple(lastMagneticPosition.x, lastMagneticPosition.y)
          magneticLastRipple = time
        }

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
        magneticCtx.setLineDash([4, 6])
        magneticRipples.forEach((ripple) => {
          magneticCtx.strokeStyle = `rgba(140, 220, 255, ${ripple.alpha})`
          magneticCtx.beginPath()
          magneticCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
          magneticCtx.stroke()
        })
        magneticCtx.setLineDash([])
      }

      magneticFrameId = window.requestAnimationFrame(render)
    }

    magneticFrameId = window.requestAnimationFrame(render)
  }

  const stopMagneticEffect = () => {
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
    if (electricFrameId !== null) {
      window.cancelAnimationFrame(electricFrameId)
      electricFrameId = null
    }
    electricArcs.length = 0
    if (electricHoverInterval) {
      window.clearInterval(electricHoverInterval)
      electricHoverInterval = undefined
    }
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
        arc.life -= 0.08
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

  const startElectricHoverArcs = (element: Element) => {
    if (!(element instanceof HTMLElement)) return
    if (electricHoverInterval) {
      window.clearInterval(electricHoverInterval)
    }
    electricHoverInterval = window.setInterval(() => {
      const rect = element.getBoundingClientRect()
      const from = {
        x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 60,
        y: 0
      }
      const to = getRectEdgePoint(rect)
      spawnElectricArc(from, to, ELECTRIC_HOVER_SEGMENTS)
    }, ELECTRIC_HOVER_INTERVAL)
  }

  const handleResize = () => {
    resizeCanvas()
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

    if (moveDistance < MIN_ACTIVE_DISTANCE && currentEffect !== "magnetic") {
      clearMovingEffect()
      stopLightCanvas()
      stopMagneticEffect()
      stopElectricEffect()
      scheduleStill()
      return
    }

    if (!isMoving) {
      isMoving = true
    }

    clearHoverEffect(lastTarget)
    clearChargedHoverEffect(lastTarget)
    if (currentEffect !== "magnetic") {
      applyMovingEffect(currentEffect)
    }

    if (currentEffect === "light") {
      startLightCanvas()
      const dx = lastSpawnPosition ? lastPosition.x - lastSpawnPosition.x : 0
      const dy = lastSpawnPosition ? lastPosition.y - lastSpawnPosition.y : 0
      const distance = Math.hypot(dx, dy)
      if (!lastSpawnPosition || distance >= SPAWN_DISTANCE) {
        if (DEBUG) {
          console.log("[Turbo‑Vecter] Trail step", { distance })
        }
        if (!lastDrawPosition) {
          drawLightTrail(lastPosition, {
            x: lastPosition.x + 0.1,
            y: lastPosition.y + 0.1
          })
        }
        if (lastDrawPosition) {
          drawLightTrail(lastDrawPosition, lastPosition)
        }
        lastDrawPosition = { ...lastPosition }
        lastSpawnPosition = { ...lastPosition }
      }

      if (idleTimeout) {
        window.clearTimeout(idleTimeout)
      }
      idleTimeout = window.setTimeout(() => {
        stopLightCanvas()
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
    clearHoverEffect(lastTarget)
    clearChargedHoverEffect(lastTarget)
    clearMovingEffect()
    stopLightCanvas()
    stopMagneticEffect()
    stopElectricEffect()
    lastTarget = null
    if (hoverChargeTimeout) {
      window.clearTimeout(hoverChargeTimeout)
    }
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
    stopLightCanvas()
    stopMagneticEffect()
    stopElectricEffect()
    if (hoverChargeTimeout) {
      window.clearTimeout(hoverChargeTimeout)
    }
    if (canvas?.parentElement) {
      canvas.parentElement.removeChild(canvas)
    }
    if (magneticCanvas?.parentElement) {
      magneticCanvas.parentElement.removeChild(magneticCanvas)
    }
    if (electricCanvas?.parentElement) {
      electricCanvas.parentElement.removeChild(electricCanvas)
    }
  }
}

export default setupCursorEffects
