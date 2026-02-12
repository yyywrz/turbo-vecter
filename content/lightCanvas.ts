const LIGHT_CANVAS_ID = "turbo-vecter-light-canvas"
const TRAIL_FADE = "rgba(0, 0, 0, 0.06)"
const TRAIL_COLOR = "rgba(160, 230, 255, 1)"
const TRAIL_GLOW_COLOR = "rgba(90, 180, 255, 0.9)"
const TRAIL_WIDTH = 8
const TRAIL_INNER_WIDTH = 3
const DEBUG = true

class LightCanvas {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private canvasSize = { width: 0, height: 0 }
  private animationFrameId: number | null = null
  private idleTimeout: number | undefined
  private lastDrawPosition: { x: number; y: number } | null = null
  private debugStarted = false
  private debugDrawn = false
  
  private snakeAngle = 0
  private snakeFrameId: number | null = null
  private snakeElement: Element | null = null
  private snakeCompletedFirstLoop = false
  private scrollListener: (() => void) | null = null
  private snakeSpeedMultiplier = 1
  private pendingTimeouts: number[] = []

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
    
    const existing = document.getElementById(LIGHT_CANVAS_ID)
    if (existing instanceof HTMLCanvasElement) {
      this.canvas = existing
    } else {
      this.canvas = document.createElement("canvas")
      this.canvas.id = LIGHT_CANVAS_ID
      this.canvas.className = "turbo-vecter-light-canvas"
      const host = document.documentElement
      host.appendChild(this.canvas)
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Canvas appended", host.tagName)
      }
    }
    
    this.canvas.style.setProperty("position", "fixed", "important")
    this.canvas.style.setProperty("inset", "0", "important")
    this.canvas.style.setProperty("top", "0", "important")
    this.canvas.style.setProperty("left", "0", "important")
    this.canvas.style.setProperty("width", "100%", "important")
    this.canvas.style.setProperty("height", "100%", "important")
    this.canvas.style.setProperty("display", "block", "important")
    this.canvas.style.setProperty("visibility", "visible", "important")
    this.canvas.style.setProperty("opacity", "1", "important")
    this.canvas.style.setProperty("pointer-events", "none", "important")
    this.canvas.style.setProperty("z-index", "2147483647", "important")
    this.canvas.style.setProperty("background", "transparent", "important")
    
    this.ctx = this.canvas.getContext("2d")
    if (DEBUG && !this.ctx) {
      console.warn("[Turbo‑Vecter] Canvas context not available")
    }
    
    this.resize()
    return this.canvas
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
    
    if (DEBUG) {
      console.log("[Turbo‑Vecter] Canvas resized", this.canvasSize, { dpr })
    }
  }

  start(): void {
    if (this.animationFrameId !== null) return
    this.ensure()

    if (DEBUG && !this.debugStarted) {
      console.log("[Turbo‑Vecter] Light canvas started")
      this.debugStarted = true
    }

    const render = () => {
      if (!this.ctx) {
        this.animationFrameId = null
        return
      }

      this.ctx.globalCompositeOperation = "destination-out"
      this.ctx.fillStyle = TRAIL_FADE
      this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height)
      this.ctx.globalCompositeOperation = "source-over"

      this.animationFrameId = window.requestAnimationFrame(render)
    }

    this.animationFrameId = window.requestAnimationFrame(render)
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.idleTimeout) {
      window.clearTimeout(this.idleTimeout)
      this.idleTimeout = undefined
    }
    this.lastDrawPosition = null
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)
    }
  }

  drawTrail(from: { x: number; y: number }, to: { x: number; y: number }): void {
    if (!this.ctx) return
    
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"

    this.ctx.strokeStyle = TRAIL_GLOW_COLOR
    this.ctx.lineWidth = TRAIL_WIDTH
    this.ctx.shadowBlur = 24
    this.ctx.shadowColor = "rgba(120, 200, 255, 0.95)"
    this.ctx.beginPath()
    this.ctx.moveTo(from.x, from.y)
    this.ctx.lineTo(to.x, to.y)
    this.ctx.stroke()

    this.ctx.shadowBlur = 0
    this.ctx.strokeStyle = TRAIL_COLOR
    this.ctx.lineWidth = TRAIL_INNER_WIDTH
    this.ctx.beginPath()
    this.ctx.moveTo(from.x, from.y)
    this.ctx.lineTo(to.x, to.y)
    this.ctx.stroke()

    if (DEBUG && !this.debugDrawn) {
      console.log("[Turbo‑Vecter] Drew light trail", { from, to })
      this.debugDrawn = true
    }
  }

  cleanup(): void {
    this.stop()
    this.stopSnake()

    // Clear all pending timeouts
    this.pendingTimeouts.forEach(id => window.clearTimeout(id))
    this.pendingTimeouts.length = 0

    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.canvas = null
    this.ctx = null
  }

  private isElementInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0
  }

  private calculateSpeedMultiplier(element: Element): number {
    const rect = element.getBoundingClientRect()
    const offset = 8
    const w = rect.width + offset * 2
    const h = rect.height + offset * 2
    const perimeter = 2 * (w + h)
    
    // Speed increases with element size
    // Small element (perimeter ~100): 0.5x speed
    // Medium element (perimeter ~400): 1x speed
    // Large element (perimeter ~1000): 2x speed
    // Formula: 0.5 + (perimeter / 800)
    return Math.max(0.5, 0.5 + perimeter / 800)
  }

  private drawSnakeRing(element: Element): void {
    if (!this.ctx) return
    
    const rect = element.getBoundingClientRect()
    // Stop if element is out of viewport
    if (!this.isElementInViewport(element)) {
      this.stopSnake()
      return
    }
    
    const offset = 8 // Distance from element border
    const x = rect.left - offset
    const y = rect.top - offset
    const w = rect.width + offset * 2
    const h = rect.height + offset * 2
    
    // Calculate border path segments
    const perimeter = 2 * (w + h)
    const trailLength = perimeter * 0.35 // 35% of border length for longer trail
    
    // Check if snake completed first loop and add box shadow
    if (!this.snakeCompletedFirstLoop && this.snakeAngle >= perimeter) {
      this.snakeCompletedFirstLoop = true
      if (element instanceof HTMLElement) {
        element.style.boxShadow = "0 0 20px rgba(100, 200, 255, 0.6), 0 0 40px rgba(100, 200, 255, 0.3)"
      }
    }
    
    // Head position is just the snake distance along the border
    const headPosition = this.snakeAngle % perimeter
    
    const getPointOnBorder = (distance: number): { x: number; y: number } => {
      const d = ((distance % perimeter) + perimeter) % perimeter // Ensure positive
      
      if (d < w) {
        // Top edge (left to right)
        return { x: x + d, y: y }
      } else if (d < w + h) {
        // Right edge (top to bottom)
        return { x: x + w, y: y + (d - w) }
      } else if (d < 2 * w + h) {
        // Bottom edge (right to left)
        return { x: x + w - (d - w - h), y: y + h }
      } else {
        // Left edge (bottom to top)
        return { x: x, y: y + h - (d - 2 * w - h) }
      }
    }
    
    const segments = 60
    
    this.ctx.lineCap = "round"
    this.ctx.lineJoin = "round"
    
    for (let i = 0; i < segments; i++) {
      const t = i / segments
      const distance = headPosition - t * trailLength
      const nextDistance = headPosition - (i + 1) / segments * trailLength
      
      const p1 = getPointOnBorder(distance)
      const p2 = getPointOnBorder(nextDistance)
      
      // Smooth fade from head to tail
      const alpha = Math.pow(1 - t, 1.2)
      
      this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`
      this.ctx.lineWidth = 3
      this.ctx.globalAlpha = alpha
      
      this.ctx.beginPath()
      this.ctx.moveTo(p1.x, p1.y)
      this.ctx.lineTo(p2.x, p2.y)
      this.ctx.stroke()
    }
    
    this.ctx.globalAlpha = 1
    this.ctx.shadowBlur = 0
  }

  startSnake(element: Element): void {
    if (this.snakeFrameId !== null) return
    this.snakeElement = element
    this.snakeAngle = 0 // Start from top-left corner (distance = 0)
    this.snakeCompletedFirstLoop = false
    this.snakeSpeedMultiplier = this.calculateSpeedMultiplier(element)
    this.ensure()
    
    if (this.animationFrameId === null) {
      this.start()
    }
    
    // Add scroll listener to detect page scroll
    if (!this.scrollListener) {
      this.scrollListener = () => {
        this.safeExecute(() => {
          if (this.snakeElement) {
            this.stopSnake()
          }
        })
      }
      window.addEventListener("scroll", this.scrollListener, { passive: true })
    }
    
    const animate = () => {
      this.safeExecute(() => {
        if (!this.ctx || !this.snakeElement) {
          this.snakeFrameId = null
          return
        }
        
        this.drawSnakeRing(this.snakeElement)
        this.snakeAngle += 2 * this.snakeSpeedMultiplier // Speed varies with element size
        
        this.snakeFrameId = window.requestAnimationFrame(animate)
      })
    }
    
    this.snakeFrameId = window.requestAnimationFrame(animate)
  }

  stopSnake(): void {
    if (this.snakeFrameId !== null) {
      window.cancelAnimationFrame(this.snakeFrameId)
      this.snakeFrameId = null
    }
    if (this.snakeElement instanceof HTMLElement) {
      this.snakeElement.style.boxShadow = ""
    }
    if (this.scrollListener) {
      window.removeEventListener("scroll", this.scrollListener, { passive: true })
      this.scrollListener = null
    }

    // Clear all pending timeouts
    this.pendingTimeouts.forEach(id => window.clearTimeout(id))
    this.pendingTimeouts.length = 0

    this.snakeElement = null
    this.snakeAngle = 0
    this.snakeCompletedFirstLoop = false
    this.snakeSpeedMultiplier = 1
  }

  isSnakeRunning(): boolean {
    return this.snakeFrameId !== null
  }
}

export const lightCanvas = new LightCanvas()
