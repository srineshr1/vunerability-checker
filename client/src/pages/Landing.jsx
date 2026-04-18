import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { postScan } from '../lib/api'

const S = {
  root: { '--bg': '#080b10', '--bg-1': '#0b0f16', '--bg-2': '#0f1520', '--panel': 'rgba(14, 20, 30, 0.72)', '--grid-line': 'rgba(0, 245, 255, 0.06)', '--cyan': '#00f5ff', '--cyan-dim': '#0ab8c2', '--red': '#ff2d55', '--red-dim': '#a8243d', '--amber': '#ffb800', '--green': '#22e27a', '--text': '#e6edf3', '--text-dim': '#8a94a6', '--slate': '#475066', '--border': 'rgba(255, 255, 255, 0.06)', '--border-hot': 'rgba(0, 245, 255, 0.25)', '--mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace", '--display': "'Syne', 'Neue Haas Grotesk', system-ui, sans-serif", '--body': "'Inter', system-ui, sans-serif" },
}

function loadStyles() {
  const s = document.documentElement.style
  Object.entries(S.root).forEach(([k, v]) => s.setProperty(k, v))
}

function useLandingStyles() {
  useEffect(() => {
    loadStyles()
    return () => {
      const s = document.documentElement.style
      Object.keys(S.root).forEach(k => s.removeProperty(k))
    }
  }, [])
}

const TICKER_ITEMS = [
  { n: '316', l: 'NODES MAPPED', c: '' },
  { n: '1,503', l: 'EDGES TRACED', c: '' },
  { n: '4', l: 'HIGH RISK ASSETS', c: 'r' },
  { n: '12', l: 'OPEN PORTS', c: 'a' },
  { n: '47s', l: 'SCAN DURATION', c: '' },
  { n: '142', l: 'SUBDOMAINS FOUND', c: '' },
  { n: '3', l: 'BREACHES CORRELATED', c: 'r' },
  { n: '89', l: 'AI FIXES GENERATED', c: '' },
  { n: '99.4%', l: 'COVERAGE', c: '' },
]

function Nav({ session }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
    padding: '18px 40px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    background: scrolled ? 'rgba(8, 11, 16, 0.92)' : 'rgba(8, 11, 16, 0.8)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${scrolled ? 'rgba(0, 245, 255, 0.1)' : 'rgba(255, 255, 255, 0.06)'}`,
    transition: 'background 0.3s, border-color 0.3s',
  }

  const brandStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 700,
    fontSize: 20, letterSpacing: '0.02em',
  }

  const linksStyle = {
    display: 'flex', gap: 32, fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, color: '#8a94a6',
  }

  const ctaStyle = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500,
    padding: '10px 18px', background: 'transparent', color: '#00f5ff',
    border: '1px solid rgba(0, 245, 255, 0.25)', borderRadius: 4,
    textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase',
    transition: 'all 0.2s', cursor: 'pointer',
  }

  return (
    <nav style={navStyle}>
      <a href="#" style={brandStyle}>
        <span style={{ width: 28, height: 28, position: 'relative', display: 'inline-block' }}>
          <span style={{ position: 'absolute', inset: 0, border: '1.5px solid #00f5ff', borderRadius: '50%', animation: 'brandPulse 3s ease-in-out infinite', display: 'block' }} />
          <span style={{ position: 'absolute', inset: 0, border: '1.5px solid #ff2d55', borderRadius: '50%', animation: 'brandPulse 3s ease-in-out infinite 1.5s', display: 'block' }} />
          <span style={{ position: 'absolute', inset: 8, background: '#00f5ff', borderRadius: '50%', boxShadow: '0 0 16px #00f5ff', display: 'block' }} />
        </span>
        <span style={{ color: '#e6edf3' }}>Exposure<span style={{ fontStyle: 'normal', color: '#00f5ff' }}>IQ</span></span>
      </a>
      <div style={linksStyle}>
        <a href="#features" style={{ color: '#8a94a6', textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
        <a href="#how" style={{ color: '#8a94a6', textDecoration: 'none', transition: 'color 0.2s' }}>How it Works</a>
        <a href="#cta" style={{ color: '#8a94a6', textDecoration: 'none', transition: 'color 0.2s' }}>Intel</a>
      </div>
      {session
        ? <a href="/dashboard/demo" style={ctaStyle}>Dashboard</a>
        : <a href="/login" style={ctaStyle}>Sign In</a>
      }
    </nav>
  )
}

function HeroGraph() {
  const svgRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const W = 600, H = 600, CX = W / 2, CY = H / 2
    const NODE_COUNT = 42
    const risks = ['low', 'low', 'low', 'low', 'med', 'med', 'high']
    const colorFor = r => r === 'high' ? '#ff2d55' : r === 'med' ? '#ffb800' : '#00f5ff'

    const nodes = []
    nodes.push({ id: 0, x: CX, y: CY, vx: 0, vy: 0, r: 10, risk: 'high', root: true })
    const ring1 = 8
    for (let i = 0; i < ring1; i++) {
      const a = (i / ring1) * Math.PI * 2
      nodes.push({ id: i + 1, x: CX + Math.cos(a) * 110, y: CY + Math.sin(a) * 110, vx: 0, vy: 0, r: 6, risk: i % 3 === 0 ? 'med' : 'low', primary: true, parent: 0 })
    }
    while (nodes.length < NODE_COUNT) {
      const parent = nodes[1 + Math.floor(Math.random() * ring1)]
      const a = Math.random() * Math.PI * 2
      const d = 55 + Math.random() * 85
      nodes.push({ id: nodes.length, x: parent.x + Math.cos(a) * d, y: parent.y + Math.sin(a) * d, vx: 0, vy: 0, r: 3 + Math.random() * 2, risk: risks[Math.floor(Math.random() * risks.length)], parent: parent.id })
    }

    const edges = []
    nodes.forEach(n => { if (n.parent !== undefined) edges.push({ a: n.parent, b: n.id }) })
    for (let i = 0; i < 10; i++) {
      const a = 1 + Math.floor(Math.random() * (nodes.length - 1))
      const b = 1 + Math.floor(Math.random() * (nodes.length - 1))
      if (a !== b) edges.push({ a, b, cross: true })
    }

    svg.innerHTML = ''
    const NS = 'http://www.w3.org/2000/svg'
    const defs = document.createElementNS(NS, 'defs')
    defs.innerHTML = `<radialGradient id="coreGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ff2d55" stop-opacity="0.4"/><stop offset="100%" stop-color="#ff2d55" stop-opacity="0"/></radialGradient><filter id="nodeGlow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    svg.appendChild(defs)

    const gloc = document.createElementNS(NS, 'circle')
    gloc.setAttribute('cx', CX); gloc.setAttribute('cy', CY)
    gloc.setAttribute('r', 80); gloc.setAttribute('fill', 'url(#coreGlow)')
    svg.appendChild(gloc)

    const gEdges = document.createElementNS(NS, 'g')
    const gNodes = document.createElementNS(NS, 'g')
    svg.appendChild(gEdges); svg.appendChild(gNodes)

    const edgeEls = edges.map(e => {
      const line = document.createElementNS(NS, 'line')
      const isCross = e.cross
      line.setAttribute('stroke', isCross ? 'rgba(255, 45, 85, 0.25)' : 'rgba(0, 245, 255, 0.2)')
      line.setAttribute('stroke-width', isCross ? 0.6 : 0.8)
      gEdges.appendChild(line)
      return line
    })

    const nodeEls = nodes.map(n => {
      const g = document.createElementNS(NS, 'g')
      const color = colorFor(n.risk)
      if (n.risk === 'high' || n.root) {
        const halo = document.createElementNS(NS, 'circle')
        halo.setAttribute('r', n.r * 2); halo.setAttribute('fill', 'none')
        halo.setAttribute('stroke', color); halo.setAttribute('stroke-width', '1')
        halo.setAttribute('class', 'node-pulse')
        halo.style.animationDelay = (Math.random() * 2) + 's'
        g.appendChild(halo)
      }
      const c = document.createElementNS(NS, 'circle')
      c.setAttribute('r', n.r); c.setAttribute('fill', color)
      c.setAttribute('filter', 'url(#nodeGlow)')
      if (n.root) { c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '1.5') }
      g.appendChild(c)
      gNodes.appendChild(g)
      return g
    })

    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        if (a.root) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 0.01
          if (dist < 80) {
            const f = (80 - dist) / dist * 0.02
            a.vx -= dx * f; a.vy -= dy * f
            if (!b.root) { b.vx += dx * f; b.vy += dy * f }
          }
        }
      }
      edges.forEach(e => {
        const a = nodes[e.a], b = nodes[e.b]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const target = e.cross ? 140 : (a.root || b.root ? 110 : 70)
        const f = (dist - target) * 0.01
        const fx = (dx / dist) * f, fy = (dy / dist) * f
        if (!a.root) { a.vx += fx; a.vy += fy }
        if (!b.root) { b.vx -= fx; b.vy -= fy }
      })
      nodes.forEach(n => {
        if (n.root) return
        n.vx += (CX - n.x) * 0.002; n.vy += (CY - n.y) * 0.002
        n.vx *= 0.85; n.vy *= 0.85
        n.x += n.vx; n.y += n.vy
        n.x = Math.max(20, Math.min(W - 20, n.x))
        n.y = Math.max(20, Math.min(H - 20, n.y))
      })
      edgeEls.forEach((el, i) => {
        const e = edges[i], a = nodes[e.a], b = nodes[e.b]
        el.setAttribute('x1', a.x); el.setAttribute('y1', a.y)
        el.setAttribute('x2', b.x); el.setAttribute('y2', b.y)
      })
      nodeEls.forEach((g, i) => {
        g.setAttribute('transform', `translate(${nodes[i].x},${nodes[i].y})`)
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', maxWidth: 640, marginLeft: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, background: 'linear-gradient(180deg, rgba(0,245,255,0.02), rgba(255,45,85,0.02))', overflow: 'hidden', opacity: 1, animation: 'fadeIn 1.2s 0.3s forwards' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,245,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
      <svg ref={svgRef} viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#00f5ff', letterSpacing: '0.1em', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,245,255,0.25)', backdropFilter: 'blur(4px)' }}>
        TARGET · demo.corp<span style={{ color: '#e6edf3', fontSize: 18, fontWeight: 700, display: 'block', marginTop: 2 }}>316 nodes</span>
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#ff2d55', letterSpacing: '0.1em', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,45,85,0.3)', backdropFilter: 'blur(4px)' }}>
        THREAT LEVEL<span style={{ color: '#e6edf3', fontSize: 18, fontWeight: 700, display: 'block', marginTop: 2 }}>HIGH</span>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8a94a6', letterSpacing: '0.1em', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(4px)' }}>
        EDGES · 1,503
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#ffb800', letterSpacing: '0.1em', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,184,0,0.3)', backdropFilter: 'blur(4px)' }}>
        SCAN · 47.3s
      </div>
    </div>
  )
}

function MiniGraph1() {
  const ref = useRef(null)
  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const pts = []
    for (let i = 0; i < 14; i++) pts.push({ x: 30 + Math.random() * 240, y: 20 + Math.random() * 140 })
    let html = ''
    pts.slice(0, 1).forEach((p, i) => {
      pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y)
        if (d < 75) html += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="rgba(0,245,255,0.25)" stroke-width="0.6"/>`
      })
    })
    pts.forEach((p, i) => {
      const color = i === 0 ? '#ff2d55' : (i % 5 === 0 ? '#ffb800' : '#00f5ff')
      const r = i === 0 ? 5 : 2.5
      html += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}"><animate attributeName="opacity" values="1;0.4;1" dur="${2 + Math.random() * 2}s" repeatCount="indefinite"/></circle>`
    })
    pts.forEach(p => {
      pts.forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y)
        if (d < 75) html += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="rgba(0,245,255,0.25)" stroke-width="0.6"/>`
      })
    })
    svg.innerHTML = html
  }, [])
  return <svg ref={ref} viewBox="0 0 300 180" style={{ width: '100%', height: '100%', display: 'block' }} />
}

function MiniGraph2() {
  const bars = [
    { l: 'HIGH', v: 78, c: '#ff2d55' },
    { l: 'MED', v: 54, c: '#ffb800' },
    { l: 'LOW', v: 88, c: '#00f5ff' },
    { l: 'INFO', v: 34, c: '#475066' },
  ]
  return (
    <svg viewBox="0 0 300 180" style={{ width: '100%', height: '100%', display: 'block' }}>
      {bars.map((b, i) => {
        const y = 25 + i * 34
        return (
          <g key={i}>
            <text x="18" y={y + 4} fill="#8a94a6" fontFamily="JetBrains Mono, monospace" fontSize="9">{b.l}</text>
            <rect x="55" y={y - 6} width="210" height="10" fill="rgba(255,255,255,0.04)" rx="2"/>
            <rect x="55" y={y - 6} width={b.v * 2.1} height="10" fill={b.c} rx="2">
              <animate attributeName="width" from="0" to={b.v * 2.1} dur="1.4s" begin="0.2s" fill="freeze"/>
            </rect>
            <text x={55 + b.v * 2.1 + 6} y={y + 4} fill={b.c} fontFamily="JetBrains Mono, monospace" fontSize="9" opacity="0">{b.v}<animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.6s" fill="freeze"/></text>
          </g>
        )
      })}
    </svg>
  )
}

function MiniGraph3() {
  return (
    <svg viewBox="0 0 300 180" style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect x="0" y="0" width="300" height="180" fill="transparent"/>
      <text x="16" y="24" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8a94a6">~/exposureiq $ <tspan fill="#00f5ff">remediate</tspan></text>
      <text x="16" y="46" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#ff2d55">[CRIT] auth.api exposed :22</text>
      <text x="16" y="62" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8a94a6">  └─ restrict ssh to 10.0.0.0/8</text>
      <text x="16" y="82" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#ffb800">[WARN] tls weak cipher chain</text>
      <text x="16" y="98" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8a94a6">  └─ disable TLS 1.0/1.1</text>
      <text x="16" y="118" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#00f5ff">[OK] DMARC policy validated</text>
      <text x="16" y="140" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#22e27a">✓ 12 fixes ready to apply</text>
      <text x="16" y="162" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8a94a6">~/exposureiq $ <tspan fill="#00f5ff">_</tspan><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></text>
    </svg>
  )
}

function RevealSection({ children, style }) {
  const ref = useRef(null)
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') })
    }, { threshold: 0.12 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="reveal" style={{ opacity: 0, transform: 'translateY(30px)', transition: 'opacity 0.9s cubic-bezier(.2,.8,.2,1), transform 0.9s cubic-bezier(.2,.8,.2,1)', ...style }}>
      {children}
    </div>
  )
}

export default function Landing() {
  useLandingStyles()
  const [session, setSession] = useState(null)
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [restoringScan, setRestoringScan] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, next) => setSession(next?.session ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || restoringScan) return
    const pendingDomain = sessionStorage.getItem('pending_domain')
    if (!pendingDomain) return

    const runPending = async () => {
      setRestoringScan(true)
      setLoading(true)
      setScanError('')
      try {
        const { scanId } = await postScan(pendingDomain)
        sessionStorage.removeItem('pending_domain')
        navigate(`/dashboard/${scanId}`, { replace: true, state: { domain: pendingDomain } })
      } catch (err) {
        setScanError(err.message || 'Unable to resume scan after login')
        setLoading(false)
        setRestoringScan(false)
      }
    }

    runPending()
  }, [session, restoringScan, navigate])

  const handleScan = async (e) => {
    e.preventDefault()
    const d = domain.trim()
    if (!d) return
    setLoading(true)
    setScanError('')
    try {
      const { scanId } = await postScan(d)
      navigate(`/dashboard/${scanId}`, { state: { domain: d } })
    } catch (err) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('401') || err.message?.includes('fetch')) {
        sessionStorage.setItem('pending_domain', d)
        navigate('/login', { state: { domain: d } })
      } else {
        setScanError(err.message || 'Scan failed')
      }
      setLoading(false)
    }
  }

  const ledStyle = (color) => ({
    width: 6, height: 6, borderRadius: '50%', background: color,
    boxShadow: `0 0 8px ${color}`,
  })

  const tickerStyle = {
    display: 'flex', gap: 60, fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, whiteSpace: 'nowrap', animation: 'tickerScroll 40s linear infinite',
    width: 'max-content',
  }

  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS].map((it, i) => (
    <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, color: '#8a94a6' }}>
      <span style={{ color: it.c === 'r' ? '#ff2d55' : it.c === 'a' ? '#ffb800' : '#00f5ff', fontWeight: 500, fontSize: 15 }}>{it.n}</span>
      <span>{it.l}</span>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#475066' }} />
    </div>
  ))

  return (
    <div style={{ background: '#080b10', color: '#e6edf3', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes rise { to { transform: translateY(0); opacity: 1; } }
        @keyframes dotPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes brandPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.15); opacity: 0.3; } }
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes gridDrift { from { background-position: 0 0, 0 0; } to { background-position: 48px 48px, 48px 48px; } }
        @keyframes scanSweep { 0% { top: -2%; opacity: 0; } 10% { opacity: 0.4; } 90% { opacity: 0.4; } 100% { top: 102%; opacity: 0; } }
        .reveal.in { opacity: 1 !important; transform: none !important; }
        .reveal.delay-1 { transition-delay: 0.1s; }
        .reveal.delay-2 { transition-delay: 0.2s; }
        .reveal.delay-3 { transition-delay: 0.3s; }
        .node-pulse { transform-origin: center; animation: nodePulse 2s ease-in-out infinite; }
        @keyframes nodePulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.05; transform: scale(2.2); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(0, 245, 255, 0.3); color: #fff; }
        ::-webkit-scrollbar { width: 10px; background: #080b10; }
        ::-webkit-scrollbar-thumb { background: #1a2230; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a3648; }
      `}</style>

      {/* Background layers */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -2, background: 'radial-gradient(1200px 800px at 80% -10%, rgba(0, 245, 255, 0.08), transparent 60%), radial-gradient(900px 600px at 10% 20%, rgba(255, 45, 85, 0.05), transparent 60%), radial-gradient(800px 500px at 50% 110%, rgba(0, 245, 255, 0.04), transparent 70%), #080b10', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundImage: 'linear-gradient(rgba(0,245,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.06) 1px, transparent 1px)', backgroundSize: '48px 48px', animation: 'gridDrift 40s linear infinite', pointerEvents: 'none', WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, #000 40%, transparent 85%)', maskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, #000 40%, transparent 85%)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, height: 2, zIndex: 100, background: 'linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.55), transparent)', boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)', animation: 'scanSweep 8s linear infinite', pointerEvents: 'none', opacity: 0.35, top: '-2%' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99, pointerEvents: 'none', background: 'radial-gradient(ellipse 100% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

      <Nav session={session} />

      {/* HERO */}
      <section style={{ position: 'relative', minHeight: '100vh', padding: '140px 40px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Tag */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#00f5ff', padding: '8px 14px', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 100, background: 'rgba(0, 245, 255, 0.04)', marginBottom: 28, opacity: 1, animation: 'rise 0.8s 0.1s forwards cubic-bezier(.2,.8,.2,1)', transform: 'translateY(0)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 10px #00f5ff', animation: 'dotPulse 1.8s infinite' }} />
            <span>LIVE ATTACK SURFACE INTELLIGENCE</span>
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 700, fontSize: 'clamp(42px, 6vw, 84px)', lineHeight: 0.98, letterSpacing: '-0.02em', marginBottom: 24 }}>
            <span style={{ display: 'block', overflow: 'hidden' }}><span style={{ display: 'inline-block', transform: 'translateY(110%)', animation: 'rise 0.9s 0.2s forwards cubic-bezier(.2,.8,.2,1)' }}>Map Your</span></span>
            <span style={{ display: 'block', overflow: 'hidden' }}><span style={{ display: 'inline-block', transform: 'translateY(110%)', animation: 'rise 0.9s 0.35s forwards cubic-bezier(.2,.8,.2,1)', color: '#00f5ff', textShadow: '0 0 30px rgba(0, 245, 255, 0.35)' }}>Attack Surface.</span></span>
            <span style={{ display: 'block', overflow: 'hidden' }}><span style={{ display: 'inline-block', transform: 'translateY(110%)', animation: 'rise 0.9s 0.5s forwards cubic-bezier(.2,.8,.2,1)' }}>Before They Do.</span></span>
          </h1>

          <p style={{ fontSize: 17, color: '#8a94a6', maxWidth: 520, marginBottom: 36, animation: 'rise 0.8s 0.7s forwards cubic-bezier(.2,.8,.2,1)', lineHeight: 1.6, opacity: 0 }}>
            ExposureIQ enumerates every subdomain, IP, port, and exposed service tied to your organization — then scores risk, maps lateral paths, and generates <b style={{ color: '#e6edf3', fontWeight: 500 }}>AI-powered remediations</b> in under 60 seconds.
          </p>

          {/* Scan form */}
          <form onSubmit={handleScan} style={{ display: 'flex', gap: 0, maxWidth: 560, background: 'rgba(14, 20, 30, 0.72)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: 6, backdropFilter: 'blur(8px)', opacity: 1, animation: 'rise 0.8s 0.85s forwards cubic-bezier(.2,.8,.2,1)', transition: 'border-color 0.2s, box-shadow 0.2s', marginBottom: 36 }}>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontFamily: "'JetBrains Mono', monospace", color: '#00f5ff', fontSize: 13 }}>https://</span>
            <input
              type="text"
              value={domain}
              onChange={e => { setDomain(e.target.value); setScanError('') }}
              placeholder="target-domain.com"
              autoComplete="off"
              spellCheck="false"
              disabled={loading}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', fontFamily: "'JetBrains Mono', monospace", fontSize: 15, padding: '14px 0' }}
            />
            <button type="submit" disabled={loading || !domain.trim()} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', color: '#000', background: '#00f5ff', overflow: 'hidden', transition: 'transform 0.15s ease, box-shadow 0.3s', boxShadow: '0 0 0 rgba(0, 245, 255, 0)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'relative', zIndex: 1 }}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <span style={{ position: 'relative', zIndex: 1 }}>{loading ? 'SCANNING...' : 'Scan Now'}</span>
            </button>
          </form>

          {scanError && <p style={{ color: '#ff2d55', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{scanError}</p>}

          {/* Meta */}
          <div style={{ display: 'flex', gap: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8a94a6', letterSpacing: '0.08em', opacity: 1, animation: 'rise 0.8s 1s forwards cubic-bezier(.2,.8,.2,1)', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={ledStyle('#22e27a')} /><span>ENGINES ONLINE</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ ...ledStyle('#ff2d55'), animation: 'dotPulse 1.5s infinite' }} /><span>3 CRITICAL OBSERVED</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={ledStyle('#ffb800')} /><span>SHODAN · CRT.SH · HIBP</span></div>
          </div>
        </div>

        <HeroGraph />
      </section>

      {/* TICKER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0b0f16', overflow: 'hidden', padding: '18px 0', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(90deg, #0b0f16, transparent)' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(270deg, #0b0f16, transparent)' }} />
        <div style={tickerStyle}>{tickerItems}</div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ padding: '140px 40px', maxWidth: 1440, margin: '0 auto' }}>
        <RevealSection>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#00f5ff', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ width: 24, height: 1, background: '#00f5ff' }} />
            01 / Capabilities
          </div>
          <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 'clamp(32px, 4.5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.015em', fontWeight: 700, marginBottom: 20, maxWidth: 900 }}>
            Threat intelligence, <em style={{ fontStyle: 'normal', color: '#00f5ff' }}>weaponized</em> for your defenders.
          </h2>
          <p style={{ fontSize: 17, color: '#8a94a6', maxWidth: 620, marginBottom: 60 }}>
            Three integrated surfaces. One objective: see what attackers see, before they pivot.
          </p>
        </RevealSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 60 }}>
          {[
            { num: 'F-01 · VISUALIZATION', title: 'Force-Directed Graph', desc: 'Every host, subdomain, and service rendered as an interactive node. Pulse, zoom, filter by risk. Identify chokepoints and high-value pivot targets in seconds.', tags: ['D3 Force', 'Live Edges', 'Risk Heatmap'], visual: <MiniGraph1 /> },
            { num: 'F-02 · DASHBOARD', title: 'Risk Dashboard', desc: 'Asset counts, port exposure, breach correlation, severity distribution. Executive-grade summaries with operator-grade drill-downs. HIBP-enriched, always current.', tags: ['Shodan', 'HIBP', 'CVE Linked'], visual: <MiniGraph2 /> },
            { num: 'F-03 · REMEDIATION', title: 'AI-Powered Fixes', desc: 'Groq-accelerated LLM distills every finding into concrete, prioritized patches. Kill-chain analysis shows exactly how an adversary would chain weaknesses end-to-end.', tags: ['Llama 3.3', 'Kill Chain', 'Auto-Triage'], visual: <MiniGraph3 /> },
          ].map((f, i) => (
            <RevealSection key={f.num} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div style={{ position: 'relative', padding: '36px 32px', background: 'rgba(14, 20, 30, 0.72)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.3s, transform 0.3s', backdropFilter: 'blur(6px)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 1, background: '#00f5ff', transition: 'width 0.6s cubic-bezier(.2,.8,.2,1)' }}
                  onMouseEnter={e => { e.currentTarget.style.width = '100%' }}
                  onMouseLeave={e => { e.currentTarget.style.width = 0 }} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#00f5ff', letterSpacing: '0.1em', marginBottom: 24 }}>{f.num}</div>
                <div style={{ height: 180, margin: '-8px -8px 28px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, background: '#080b10', position: 'relative', overflow: 'hidden' }}>{f.visual}</div>
                <h3 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ color: '#8a94a6', fontSize: 15, lineHeight: 1.6 }}>{f.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 20 }}>
                  {f.tags.map(t => <span key={t} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '4px 10px', background: 'rgba(0, 245, 255, 0.05)', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 100, color: '#00f5ff', letterSpacing: '0.06em' }}>{t}</span>)}
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: '120px 40px', maxWidth: 1440, margin: '0 auto' }}>
        <RevealSection>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#00f5ff', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ width: 24, height: 1, background: '#00f5ff' }} />
            02 / Protocol
          </div>
          <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 'clamp(32px, 4.5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.015em', fontWeight: 700, marginBottom: 20 }}>
            Three steps. <em style={{ fontStyle: 'normal', color: '#00f5ff' }}>Full coverage.</em>
          </h2>
        </RevealSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 60, position: 'relative', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { num: '01', title: 'Enter a Domain', desc: 'Drop any root domain you\'re authorized to assess. ExposureIQ hits public intel sources — no agents, no credentials, no noise.', lines: [{ t: 'target ', c: '', v: 'acme.corp' }, { t: 'scope ', c: '', v: '*.acme.corp' }] },
            { num: '02', title: 'Scan & Map', desc: 'Parallel enumeration across crt.sh, Shodan, and HIBP. Subdomains resolve, ports fingerprint, graph materializes in real time.', lines: [{ t: 'crt.sh ', c: '', v: '142 subs' }, { t: 'shodan ', c: '', v: '89 hosts' }, { t: 'hibp ', c: 'r', v: '4 breached' }] },
            { num: '03', title: 'Get AI Fixes', desc: 'Findings route through a reasoning model that emits patches ranked by exploitability, business impact, and effort. Ship the diff, close the loop.', lines: [{ t: 'triage ', c: '', v: 'complete' }, { t: 'critical ', c: 'r', v: '3 fixes' }, { t: 'export ', c: '', v: 'ready' }] },
          ].map((s, i) => (
            <RevealSection key={s.num} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div style={{ padding: '40px 32px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 56, fontWeight: 700, lineHeight: 1, color: 'transparent', WebkitTextStroke: '1px #475066', marginBottom: 28, transition: 'all 0.3s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#00f5ff'; e.currentTarget.style.WebkitTextStrokeColor = '#00f5ff'; e.currentTarget.style.textShadow = '0 0 30px rgba(0, 245, 255, 0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'transparent'; e.currentTarget.style.WebkitTextStrokeColor = '#475066'; e.currentTarget.style.textShadow = 'none' }}>
                  {s.num}
                </div>
                <h4 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 22, fontWeight: 600, marginBottom: 12 }}>{s.title}</h4>
                <p style={{ color: '#8a94a6', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{s.desc}</p>
                <div style={{ marginTop: 20, padding: '12px 14px', background: '#080b10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00f5ff', lineHeight: 1.7 }}>
                  {s.lines.map((l, j) => <div key={j}><span style={{ color: '#8a94a6' }}>&gt;</span> {l.t}<span style={{ color: l.c === 'r' ? '#ff2d55' : l.c === 'a' ? '#ffb800' : '#22e27a' }}>{l.v}</span></div>)}
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ position: 'relative', padding: '140px 40px', maxWidth: 1200, margin: '80px auto 0', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255, 45, 85, 0.08), transparent 70%)', pointerEvents: 'none' }} />
        <RevealSection>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ff2d55', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ width: 24, height: 1, background: '#ff2d55' }} />
            03 / Deploy
          </div>
          <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 'clamp(36px, 5.5vw, 72px)', lineHeight: 1, letterSpacing: '-0.02em', fontWeight: 700, margin: '24px 0 16px' }}>
            Your attack surface <em style={{ fontStyle: 'normal', color: '#ff2d55', textShadow: '0 0 30px rgba(255, 45, 85, 0.4)' }}>is exposed.</em><br />Find it first.
          </h2>
          <p style={{ color: '#8a94a6', fontSize: 18, marginBottom: 44 }}>Join security teams and researchers mapping what adversaries already see.</p>
          <form onSubmit={e => { e.preventDefault(); alert('Request received. Check inbox for access.') }} style={{ display: 'flex', maxWidth: 520, margin: '0 auto', background: 'rgba(14, 20, 30, 0.72)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: 6, backdropFilter: 'blur(8px)' }}>
            <input type="email" placeholder="you@company.com" required style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, padding: '14px 16px' }} />
            <button type="submit" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#000', background: '#00f5ff' }}>
              <span style={{ position: 'relative', zIndex: 1 }}>Request Access</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'relative', zIndex: 1 }}><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </button>
          </form>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', marginTop: 56, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8a94a6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {['SOC 2 READY', '·', 'READ-ONLY INTEL', '·', 'BUG BOUNTY APPROVED', '·', 'MIT LICENSED CORE'].map((t, i) => <span key={i} style={{ opacity: 0.7 }}>{t}</span>)}
          </div>
        </RevealSection>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: 40, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, maxWidth: 1440, margin: '60px auto 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8a94a6', letterSpacing: '0.08em' }}>
        <div>EXPOSUREIQ © 2026 · BUILT FOR OPERATORS</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['docs', 'github', 'status', 'security'].map(l => <a key={l} href="#" style={{ color: '#8a94a6', textDecoration: 'none', transition: 'color 0.2s' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  )
}
