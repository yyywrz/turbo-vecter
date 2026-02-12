const ELECTRIC_CANVAS_ID = "turbo-vecter-electric-canvas"

type Arc = {
  points: { x: number; y: number }[]
  life: number
}

type Spark = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

// Configuration constants
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

class ElectricCanvas {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private canvasSize = { width: 0, height: 0 }
  private animationFrameId: number | null = null
  private arcs: Arc[] = []
  private hitSparks: Spark[] = []

  private hoverTarget: Element | null = null
  private hoverTimeout: number | undefined
  private hoverState: 'idle' | 'striking' | 'hit' | 'discharging' = 'idle'
  private hitPoint: { x: number; y: number } | null = null
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

    const existing = document.getElementById(ELECTRIC_CANVAS_ID)
    if (existing instanceof HTMLCanvasElement) {
      this.canvas = existing
    } else {
      this.canvas = document.createElement("canvas")
      this.canvas.id = ELECTRIC_CANVAS_ID
      const host = document.documentElement
      host.appendChild(this.canvas)
      if (DEBUG) {
        console.log("[Turbo‑Vecter] Electric canvas appended", host.tagName)
      }
    }

    this.styleOverlayCanvas(this.canvas)
    this.ctx = this.canvas.getContext("2d")
    this.resize()
    return this.canvas
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

      this.ctx.globalCompositeOperation = "destination-out"
      this.ctx.fillStyle = ELECTRIC_ARC_FADE
      this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height)
      this.ctx.globalCompositeOperation = "source-over"

      // Draw arcs
      for (let i = this.arcs.length - 1; i >= 0; i -= 1) {
        const arc = this.arcs[i]
        arc.life -= 0.01
        if (arc.life <= 0) {
          this.arcs.splice(i, 1)
          continue
        }

        // Draw outer glow (bright, visible halo)
        this.ctx.shadowColor = `rgba(180, 240, 255, ${arc.life})`
        this.ctx.shadowBlur = 25
        this.ctx.strokeStyle = `rgba(220, 245, 255, ${arc.life})`
        this.ctx.lineWidth = 3
        this.ctx.lineCap = "round"
        this.ctx.lineJoin = "round"
        this.ctx.beginPath()
        arc.points.forEach((point, index) => {
          if (index === 0) {
            this.ctx!.moveTo(point.x, point.y)
          } else {
            this.ctx!.lineTo(point.x, point.y)
          }
        })
        this.ctx.stroke()

        // Draw bright core (thin, sharp)
        this.ctx.shadowBlur = 0
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${arc.life})`
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        arc.points.forEach((point, index) => {
          if (index === 0) {
            this.ctx!.moveTo(point.x, point.y)
          } else {
            this.ctx!.lineTo(point.x, point.y)
          }
        })
        this.ctx.stroke()
      }

      // Reset shadow properties
      this.ctx.shadowBlur = 0

      // Draw hit sparks
      for (let i = this.hitSparks.length - 1; i >= 0; i -= 1) {
        const spark = this.hitSparks[i]
        spark.x += spark.vx
        spark.y += spark.vy
        spark.life -= 0.04
        if (spark.life <= 0) {
          this.hitSparks.splice(i, 1)
          continue
        }

        // Draw glow halo
        this.ctx.shadowColor = `rgba(150, 220, 255, ${spark.life * 0.8})`
        this.ctx.shadowBlur = 8
        this.ctx.fillStyle = `rgba(200, 240, 255, ${spark.life * 0.6})`
        this.ctx.beginPath()
        this.ctx.arc(spark.x, spark.y, 4, 0, Math.PI * 2)
        this.ctx.fill()

        // Draw bright core
        this.ctx.shadowBlur = 0
        this.ctx.fillStyle = `rgba(255, 255, 255, ${spark.life})`
        this.ctx.beginPath()
        this.ctx.arc(spark.x, spark.y, 2, 0, Math.PI * 2)
        this.ctx.fill()
      }

      this.animationFrameId = window.requestAnimationFrame(render)
    }

    this.animationFrameId = window.requestAnimationFrame(render)
  }

  stop(): void {
    this.stopHoverArcs()
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.arcs.length = 0
    this.hitSparks.length = 0
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)
    }
  }

  private getRectEdgePoint(rect: DOMRect): { x: number; y: number } {
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

  private createHitSparks(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      const speed = 2 + Math.random() * 3
      this.hitSparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1
      })
    }
  }

  spawnArc(
    from: { x: number; y: number },
    to: { x: number; y: number },
    segments = ELECTRIC_HOVER_SEGMENTS
  ): void {
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
    this.arcs.push({ points, life: 1 })
    if (this.arcs.length > ELECTRIC_MAX_ARCS) {
      this.arcs.shift()
    }

    if (Math.random() < ELECTRIC_BRANCH_CHANCE) {
      const branchPoint = points[Math.floor(points.length * 0.6)]
      const branchTarget = {
        x: branchPoint.x + (Math.random() - 0.5) * 120,
        y: branchPoint.y + (Math.random() - 0.5) * 120
      }
      this.spawnArc(branchPoint, branchTarget, ELECTRIC_BRANCH_SEGMENTS)
    }
  }

  private dischargeFromElement(element: Element): void {
    if (!(element instanceof HTMLElement)) return
    const rect = element.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    for (let i = 0; i < ELECTRIC_DISCHARGE_COUNT; i++) {
      const from = this.getRectEdgePoint(rect)
      // Calculate outward direction from element center
      const dx = from.x - cx
      const dy = from.y - cy
      const baseAngle = Math.atan2(dy, dx)
      const angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.5 // ±45° spread
      const distance = 80 + Math.random() * 120
      const to = {
        x: from.x + Math.cos(angle) * distance,
        y: from.y + Math.sin(angle) * distance
      }
      setTimeout(() => {
        this.spawnArc(from, to, 4)
      }, Math.random() * ELECTRIC_HOVER_DISCHARGE_DURATION)
    }
  }

  private hoverCycle(element: Element): void {
    if (!(element instanceof HTMLElement)) return
    if (this.hoverState !== 'idle' && this.hoverTarget !== element) {
      return
    }

    this.hoverTarget = element
    this.hoverState = 'striking'

    // Phase 1: Strike from top
    const rect = element.getBoundingClientRect()
    const from = {
      x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 60,
      y: 0
    }
    const to = this.getRectEdgePoint(rect)
    this.hitPoint = to
    this.spawnArc(from, to, ELECTRIC_HOVER_SEGMENTS)

    // Phase 2: Hit effect and start charging
    this.hoverTimeout = window.setTimeout(() => {
      this.safeExecute(() => {
        if (this.hitPoint) {
          this.createHitSparks(this.hitPoint.x, this.hitPoint.y)
        }
        this.hoverState = 'hit'

        if (element instanceof HTMLElement) {
          // Much more visible charged state with pulsing animation
          element.style.boxShadow = '0 0 30px rgba(100, 200, 255, 1), 0 0 60px rgba(100, 200, 255, 0.8), 0 0 90px rgba(50, 150, 255, 0.6), inset 0 0 30px rgba(150, 220, 255, 0.5)'
          element.style.outline = '3px solid rgba(150, 220, 255, 0.9)'
          element.style.outlineOffset = '3px'
          element.style.filter = 'brightness(1.2) saturate(1.3)'
          element.style.animation = 'turbo-vecter-electric-pulse 0.3s ease-in-out infinite alternate'
        }

        // Phase 3: Charging duration
        this.hoverTimeout = window.setTimeout(() => {
          this.safeExecute(() => {
            // Pause before discharge
            this.hoverTimeout = window.setTimeout(() => {
              this.safeExecute(() => {
                this.hoverState = 'discharging'
                this.dischargeFromElement(element)

                // Phase 4: Discharge completes
                this.hoverTimeout = window.setTimeout(() => {
                  this.safeExecute(() => {
                    if (element instanceof HTMLElement) {
                      element.style.boxShadow = ''
                      element.style.outline = ''
                      element.style.outlineOffset = ''
                      element.style.filter = ''
                      element.style.animation = ''
                    }

                    // Pause after discharge
                    this.hoverTimeout = window.setTimeout(() => {
                      this.safeExecute(() => {
                        this.hoverState = 'idle'

                        if (this.hoverTarget === element) {
                          this.hoverCycle(element)
                        }
                      })
                    }, ELECTRIC_HOVER_PAUSE_AFTER_DISCHARGE)
                    if (this.hoverTimeout) {
                      this.pendingTimeouts.push(this.hoverTimeout)
                    }
                  })
                }, ELECTRIC_HOVER_DISCHARGE_DURATION)
                if (this.hoverTimeout) {
                  this.pendingTimeouts.push(this.hoverTimeout)
                }
              })
            }, ELECTRIC_HOVER_PAUSE_BEFORE_DISCHARGE)
            if (this.hoverTimeout) {
              this.pendingTimeouts.push(this.hoverTimeout)
            }
          })
        }, ELECTRIC_HOVER_CHARGE_DURATION)
        if (this.hoverTimeout) {
          this.pendingTimeouts.push(this.hoverTimeout)
        }
      })
    }, ELECTRIC_HOVER_HIT_DURATION)
    if (this.hoverTimeout) {
      this.pendingTimeouts.push(this.hoverTimeout)
    }
  }

  startHoverArcs(element: Element): void {
    if (!(element instanceof HTMLElement)) return
    this.stopHoverArcs()
    this.hoverCycle(element)
  }

  stopHoverArcs(): void {
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout)
      this.hoverTimeout = undefined
    }

    // Clear all pending timeouts
    this.pendingTimeouts.forEach(id => window.clearTimeout(id))
    this.pendingTimeouts.length = 0

    if (this.hoverTarget instanceof HTMLElement) {
      this.hoverTarget.style.boxShadow = ''
      this.hoverTarget.style.outline = ''
      this.hoverTarget.style.outlineOffset = ''
      this.hoverTarget.style.filter = ''
      this.hoverTarget.style.animation = ''
    }

    this.hoverState = 'idle'
    this.hoverTarget = null
    this.hitPoint = null
  }

  cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    this.stopHoverArcs()

    // Clear all pending timeouts one more time
    this.pendingTimeouts.forEach(id => window.clearTimeout(id))
    this.pendingTimeouts.length = 0

    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.canvas = null
    this.ctx = null
  }
}

export const electricCanvas = new ElectricCanvas()
