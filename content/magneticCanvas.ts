import { MAGNETIC_COLORS, type ColorMode } from "./colors"

const MAGNETIC_CANVAS_ID = "turbo-vecter-magnetic-canvas"
const STORAGE_KEY = "turboColorMode"

type ShrinkingCircle = {
  x: number
  y: number
  targetX: number
  targetY: number
  radius: number
  maxRadius: number
  alpha: number
  shrinkSpeed: number
  fadeInSpeed: number
  isFadingIn: boolean
}

// Configuration constants
const MAGNETIC_INITIAL_RADIUS = 40 // Starting radius of circles
const MAGNETIC_SHRINK_SPEED = 1.2 // How fast circles shrink per frame
const MAGNETIC_FADE_IN_SPEED = 0.06 // How fast circles fade in
const MAGNETIC_MIN_RADIUS = 5 // Minimum radius before circle disappears
const MAGNETIC_MAX_CIRCLES = 50 // Maximum number of circles on screen

// Hover effect constants
const MAGNETIC_HOVER_STAGE_DURATION = 800 // Duration of each stage in ms
const MAGNETIC_HOVER_BORDER_WIDTH = 3
const MAGNETIC_HOVER_CORNER_RADIUS = 8
const MAGNETIC_HOVER_DASH_PATTERN = [10, 6]
const MAGNETIC_HOVER_FLOW_SPEED = 0.5 // How fast the dashes flow along the border
const MAGNETIC_HOVER_SHAKE_AMOUNT = 1.5 // Shake amplitude in pixels
const MAGNETIC_HOVER_SHAKE_SPEED = 0.15 // Shake frequency

const DEBUG = true

class MagneticCanvas {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private canvasSize = { width: 0, height: 0 }
  private animationFrameId: number | null = null
  private circles: ShrinkingCircle[] = []
  private colorMode: ColorMode = "dark"

  // Hover effect state
  private hoverTarget: Element | null = null
  private hoverStage: 1 | 2 | 3 | 4 | 5 = 1
  private hoverStageStartTime = 0
  private hoverDashOffset = 0
  private hoverShakeTime = 0

  private safeExecute<T>(fn: () => T): T | undefined {
    try {
      return fn()
    } catch (error) {
      if (error instanceof Error && error.message.includes('context')) {
        this.cleanup()
        return undefined
      }
      console.warn('[Turbo‑Vecter] Safe execute error:', error)
      return undefined
    }
  }

  ensure(): HTMLCanvasElement {
    if (this.canvas) return this.canvas

    const existing = document.getElementById(MAGNETIC_CANVAS_ID)
    if (existing instanceof HTMLCanvasElement) {
      this.canvas = existing
    } else {
      this.canvas = document.createElement("canvas")
      this.canvas.id = MAGNETIC_CANVAS_ID
      const host = document.documentElement
      host.appendChild(this.canvas)
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Magnetic canvas appended", host.tagName)
      }
    }

    this.styleOverlayCanvas(this.canvas)
    this.ctx = this.canvas.getContext("2d")
    this.resize()
    this.loadColorMode()
    return this.canvas
  }

  private loadColorMode(): void {
    const storage = globalThis.chrome?.storage?.sync ?? globalThis.chrome?.storage?.local
    if (storage) {
      storage.get([STORAGE_KEY], (result) => {
        this.colorMode = result[STORAGE_KEY] || "dark"
        if (DEBUG) {
          console.log("[Turbo‑Vecter] Magnetic color mode loaded:", this.colorMode)
        }
      })

      chrome.storage.onChanged.addListener((changes, area) => {
        const storageArea = storage === chrome.storage.sync ? "sync" : "local"
        if (area !== storageArea || !changes[STORAGE_KEY]) {
          return
        }
        this.colorMode = changes[STORAGE_KEY].newValue || "dark"
        if (DEBUG) {
          console.log("[Turbo‑Vecter] Magnetic color mode changed:", this.colorMode)
        }
      })
    }
  }

  private styleOverlayCanvas(target: HTMLCanvasElement): void {
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

  resize(): void {
    if (!this.canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(window.innerWidth, document.documentElement.clientWidth)
    const height = Math.max(window.innerHeight, document.documentElement.clientHeight)
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.canvasSize = { width, height }
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.ctx.clearRect(0, 0, width, height)
    }
  }

  start(): void {
    if (this.animationFrameId !== null) return
    this.ensure()

    const render = () => {
      if (!this.ctx) {
        this.animationFrameId = null
        return
      }

      this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)

      // Update and draw circles
      for (let i = this.circles.length - 1; i >= 0; i -= 1) {
        const circle = this.circles[i]

        // Handle fade in
        if (circle.isFadingIn) {
          circle.alpha += circle.fadeInSpeed
          if (circle.alpha >= 1) {
            circle.alpha = 1
            circle.isFadingIn = false
          }
        } else {
          // Only shrink the circle after fade in completes
          circle.radius -= circle.shrinkSpeed

          // Fade out as it shrinks
          const shrinkProgress = circle.radius / circle.maxRadius
          circle.alpha = Math.max(0, shrinkProgress)
        }

        // Remove if too small
        if (circle.radius <= MAGNETIC_MIN_RADIUS) {
          this.circles.splice(i, 1)
          continue
        }

        // Get colors based on mode
        const colors = MAGNETIC_COLORS[this.colorMode]

        // Draw outer glow
        this.ctx.strokeStyle = colors.circle.replace(/[\d.]+\)$/, `${circle.alpha * 0.8})`)
        this.ctx.lineWidth = 3
        this.ctx.shadowColor = colors.circleGlow.replace(/[\d.]+\)$/, `${circle.alpha})`)
        this.ctx.shadowBlur = 15
        this.ctx.beginPath()
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
        this.ctx.stroke()

        // Draw inner ring
        this.ctx.shadowBlur = 0
        this.ctx.strokeStyle = colors.circleInner.replace(/[\d.]+\)$/, `${circle.alpha})`)
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(circle.x, circle.y, circle.radius * 0.8, 0, Math.PI * 2)
        this.ctx.stroke()
      }

      // Reset shadow
      this.ctx.shadowBlur = 0

      // Draw hover border if active
      if (this.hoverTarget) {
        this.drawHoverBorder()
      }

      this.animationFrameId = window.requestAnimationFrame(render)
    }

    this.animationFrameId = window.requestAnimationFrame(render)
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.circles.length = 0
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)
    }
  }

  spawnCircle(x: number, y: number): void {
    // Limit total circles
    if (this.circles.length >= MAGNETIC_MAX_CIRCLES) {
      return
    }

    this.circles.push({
      x,
      y,
      targetX: x,
      targetY: y,
      radius: MAGNETIC_INITIAL_RADIUS,
      maxRadius: MAGNETIC_INITIAL_RADIUS,
      alpha: 0, // Start transparent
      shrinkSpeed: MAGNETIC_SHRINK_SPEED, // Same speed for all circles
      fadeInSpeed: MAGNETIC_FADE_IN_SPEED, // Same fade-in speed for all circles
      isFadingIn: true // Start in fade-in mode
    })
  }

  private drawHoverBorder(): void {
    if (!this.ctx || !this.hoverTarget || !(this.hoverTarget instanceof HTMLElement)) return

    const rect = this.hoverTarget.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    // Calculate progress within current stage (0 to 1)
    const now = performance.now()
    const elapsed = now - this.hoverStageStartTime
    const progress = Math.min(elapsed / MAGNETIC_HOVER_STAGE_DURATION, 1)

    // Advance stage when progress completes (but stay at stage 5)
    if (progress >= 1 && this.hoverStage < 5) {
      this.hoverStage = (this.hoverStage + 1) as 1 | 2 | 3 | 4 | 5
      this.hoverStageStartTime = now
    }

    const colors = MAGNETIC_COLORS[this.colorMode]
    this.ctx.strokeStyle = colors.border
    this.ctx.lineWidth = MAGNETIC_HOVER_BORDER_WIDTH
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"

    // Apply shake offset for stage 5
    let shakeX = 0
    let shakeY = 0
    if (this.hoverStage === 5) {
      this.hoverShakeTime += MAGNETIC_HOVER_SHAKE_SPEED
      shakeX = Math.sin(this.hoverShakeTime) * MAGNETIC_HOVER_SHAKE_AMOUNT
      shakeY = Math.cos(this.hoverShakeTime * 1.3) * MAGNETIC_HOVER_SHAKE_AMOUNT
    }

    if (this.hoverStage === 2) {
      // Stage 2: Solid border with corner radius
      this.ctx.setLineDash([])
      this.ctx.beginPath()
      this.ctx.roundRect(rect.left, rect.top, w, h, MAGNETIC_HOVER_CORNER_RADIUS)
      this.ctx.stroke()
    } else if (this.hoverStage === 3) {
      // Stage 3: Dotted border (smooth transition)
      const gapLength = MAGNETIC_HOVER_DASH_PATTERN[1] * progress
      this.ctx.setLineDash([MAGNETIC_HOVER_DASH_PATTERN[0], gapLength])
      this.ctx.beginPath()
      this.ctx.roundRect(rect.left, rect.top, w, h, MAGNETIC_HOVER_CORNER_RADIUS)
      this.ctx.stroke()
    } else if (this.hoverStage === 4 || this.hoverStage === 5) {
      // Stage 4 & 5: Flowing dotted border (with shake in stage 5)
      this.hoverDashOffset += MAGNETIC_HOVER_FLOW_SPEED
      this.ctx.setLineDash(MAGNETIC_HOVER_DASH_PATTERN)
      this.ctx.lineDashOffset = -this.hoverDashOffset // Negative for clockwise flow

      this.ctx.beginPath()
      this.ctx.roundRect(rect.left + shakeX, rect.top + shakeY, w, h, MAGNETIC_HOVER_CORNER_RADIUS)
      this.ctx.stroke()

      // Reset dash offset
      this.ctx.lineDashOffset = 0
    }
  }

  startHoverWaves(element: Element): void {
    if (!(element instanceof HTMLElement)) return
    this.stopHoverWaves()

    this.hoverTarget = element
    this.hoverStage = 1
    this.hoverDashOffset = 0
    this.hoverShakeTime = 0
    this.hoverStageStartTime = performance.now()

    // Stage 1: Box shadow
    const colors = MAGNETIC_COLORS[this.colorMode]
    element.style.boxShadow = colors.boxShadow

    // After stage 1 duration, move to stage 2
    setTimeout(() => {
      this.safeExecute(() => {
        if (this.hoverTarget === element) {
          this.hoverStage = 2
          this.hoverStageStartTime = performance.now()
        }
      })
    }, MAGNETIC_HOVER_STAGE_DURATION)
  }

  stopHoverWaves(): void {
    if (this.hoverTarget instanceof HTMLElement) {
      this.hoverTarget.style.boxShadow = ''
    }

    this.hoverTarget = null
    this.hoverStage = 1
    this.hoverDashOffset = 0
    this.hoverShakeTime = 0
    this.hoverStageStartTime = 0
  }

  cleanup(): void {
    this.stop()
    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.canvas = null
    this.ctx = null
  }
}

export const magneticCanvas = new MagneticCanvas()
