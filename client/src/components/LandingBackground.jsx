import { useEffect, useRef } from 'react'

export default function LandingBackground() {
  const canvasRef = useRef(null)
  const progressRef = useRef(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789'
    let W = 0, H = 0, cols = 0, drops = []

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      cols = Math.floor(W / 16)
      drops = Array(cols).fill(0).map(() => Math.random() * -H)
    }

    function draw() {
      ctx.fillStyle = 'rgba(8, 11, 16, 0.08)'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#00f5ff'
      ctx.font = '13px JetBrains Mono, monospace'
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(ch, i * 16, drops[i])
        if (drops[i] > H && Math.random() > 0.975) drops[i] = 0
        drops[i] += 16
      }
    }

    resize()
    window.addEventListener('resize', resize)
    const interval = reduced ? null : setInterval(draw, 70)

    return () => {
      window.removeEventListener('resize', resize)
      if (interval) clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const bar = progressRef.current
    const grid = document.querySelector('.landing .bg-grid')
    const mat = document.getElementById('matrix-canvas')

    function updateProgress() {
      if (!bar) return
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0
      bar.style.width = pct + '%'
    }

    let pending = false
    function onScrollParallax() {
      if (pending || reduced) return
      pending = true
      requestAnimationFrame(() => {
        const y = window.scrollY * 0.3
        const py = (-y) + 'px'
        if (grid) grid.style.setProperty('--py', py)
        if (mat) mat.style.setProperty('--py', py)
        pending = false
      })
    }

    function onScroll() {
      updateProgress()
      onScrollParallax()
    }

    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div className="scroll-progress" ref={progressRef} />
      <div className="bg-layer" />
      <div className="bg-grid" />
      <canvas id="matrix-canvas" ref={canvasRef} />
      <div className="scanline" />
      <div className="vignette" />
    </>
  )
}
