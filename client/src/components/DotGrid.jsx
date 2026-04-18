import { useEffect, useRef } from 'react'

const DOT_SPACING = 18
const BASE_RADIUS = 0.7
const BASE_OPACITY = 0.11
const GLOW_RADIUS = 100
const GLOW_RADIUS_SQ = GLOW_RADIUS * GLOW_RADIUS
const MAX_RADIUS = 1.8
const MAX_OPACITY = 0.90
const AMBER_R = 232
const AMBER_G = 160
const AMBER_B = 69
const WOBBLE_SPEED = 0.00035
const WOBBLE_AMOUNT = 2
const REPULSION_RADIUS = 80
const REPULSION_RADIUS_SQ = REPULSION_RADIUS * REPULSION_RADIUS
const REPULSION_STRENGTH = 0.4
const SPRING_K = 0.08
const DAMPING = 0.88

export default function DotGrid() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animRef = useRef(null)
  const dotCacheRef = useRef([])
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    const buildDotCache = (w, h) => {
      const dots = []
      for (let x = DOT_SPACING / 2; x < w + DOT_SPACING; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < h + DOT_SPACING; y += DOT_SPACING) {
          dots.push({ x, y, springX: 0, springY: 0, velX: 0, velY: 0 })
        }
      }
      return dots
    }

    const getWobbleOffset = (t) => ({
      x: Math.sin(t * 1.1) * WOBBLE_AMOUNT + Math.cos(t * 0.7) * WOBBLE_AMOUNT * 0.6,
      y: Math.cos(t * 0.9) * WOBBLE_AMOUNT + Math.sin(t * 1.3) * WOBBLE_AMOUNT * 0.5,
    })

    const lerp = (a, b, t) => a + (b - a) * t

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#09090c'
      ctx.fillRect(0, 0, w, h)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const t = timeRef.current
      const { x: offX, y: offY } = getWobbleOffset(t)

      for (const dot of dotCacheRef.current) {
        const gridX = dot.x + offX
        const gridY = dot.y + offY

        const dx = gridX - mx
        const dy = gridY - my
        const distSq = dx * dx + dy * dy

        if (distSq < REPULSION_RADIUS_SQ) {
          const dist = Math.sqrt(distSq)
          const nx = dx / dist
          const ny = dy / dist
          const falloff = 1 - dist / REPULSION_RADIUS
          dot.velX += nx * REPULSION_STRENGTH * falloff
          dot.velY += ny * REPULSION_STRENGTH * falloff
        }

        dot.velX += -SPRING_K * dot.springX
        dot.velY += -SPRING_K * dot.springY
        dot.velX *= DAMPING
        dot.velY *= DAMPING
        dot.springX += dot.velX
        dot.springY += dot.velY

        const drawX = gridX + dot.springX
        const drawY = gridY + dot.springY

        let radius, opacity, eased

        if (distSq > GLOW_RADIUS_SQ) {
          radius = BASE_RADIUS
          opacity = BASE_OPACITY
          eased = 0
        } else {
          const nt = 1 - distSq / GLOW_RADIUS_SQ
          eased = nt * nt * (3 - 2 * nt)
          radius = lerp(BASE_RADIUS, MAX_RADIUS, eased)
          opacity = lerp(BASE_OPACITY, MAX_OPACITY, eased)
        }

        const wobbleBrightness = 0.7 + 0.3 * Math.sin(t * 2 + dot.x * 0.01 + dot.y * 0.01)
        const r = Math.round(AMBER_R * wobbleBrightness)
        const g = Math.round(AMBER_G * wobbleBrightness)
        const b = Math.round(AMBER_B * wobbleBrightness + eased * 12)

        if (eased > 0.02) {
          const dist = Math.sqrt(distSq)
          const nx = dx / dist
          const ny = dy / dist

          const shadowOffsetMag = eased * 5
          const shadowRadius = radius * (1.3 + eased * 0.8)
          const shadowOpacity = eased * 0.45

          ctx.beginPath()
          ctx.arc(
            drawX + nx * shadowOffsetMag,
            drawY + ny * shadowOffsetMag,
            shadowRadius,
            0,
            Math.PI * 2
          )
          ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(drawX, drawY, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`
        ctx.fill()
      }

      timeRef.current += WOBBLE_SPEED * 16.67
      animRef.current = requestAnimationFrame(draw)
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      dotCacheRef.current = buildDotCache(canvas.width, canvas.height)
    }

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    handleResize()
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('resize', handleResize)
    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
