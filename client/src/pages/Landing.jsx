import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandingBackground from '../components/LandingBackground'
import LandingNav from '../components/LandingNav'
import { postScan } from '../lib/api'
import './Landing.css'

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

const TITLE_WORDS = [
  ['Map', 'Your'],
  ['Attack', 'Surface.'],
  ['Before', 'They', 'Do.'],
]

export default function Landing({ session, authReady }) {
  const navigate = useNavigate()
  const [scanLabel, setScanLabel] = useState('Scan Now')
  const [scanBusy, setScanBusy] = useState(false)
  const [domain, setDomain] = useState('')
  const [scanError, setScanError] = useState('')

  const graphRef = useRef(null)
  const mini1Ref = useRef(null)
  const mini2Ref = useRef(null)
  const mini3Ref = useRef(null)
  const heroTitleRef = useRef(null)
  const heroSubRef = useRef(null)
  const scanFormRef = useRef(null)
  const heroGraphRef = useRef(null)
  const stepsConnectorRef = useRef(null)
  const tickerWrapRef = useRef(null)

  // add body class for landing-specific overflow-x
  useEffect(() => {
    document.body.classList.add('landing-active')
    return () => document.body.classList.remove('landing-active')
  }, [])

  // ===== HERO FORCE-DIRECTED GRAPH =====
  useEffect(() => {
    const svg = graphRef.current
    if (!svg) return
    const container = heroGraphRef.current

    const W = 600, H = 600, CX = W / 2, CY = H / 2
    const NODE_COUNT = 42
    const risks = ['low', 'low', 'low', 'low', 'med', 'med', 'high']
    const colorFor = r => r === 'high' ? '#ff2d55' : r === 'med' ? '#ffb800' : '#00f5ff'

    const nodes = []
    nodes.push({ id: 0, x: CX, y: CY, vx: 0, vy: 0, r: 10, risk: 'high', root: true })
    const ring1 = 8
    for (let i = 0; i < ring1; i++) {
      const a = (i / ring1) * Math.PI * 2
      nodes.push({
        id: i + 1,
        x: CX + Math.cos(a) * 110,
        y: CY + Math.sin(a) * 110,
        vx: 0, vy: 0, r: 6,
        risk: i % 3 === 0 ? 'med' : 'low',
        primary: true, parent: 0,
      })
    }
    while (nodes.length < NODE_COUNT) {
      const parent = nodes[1 + Math.floor(Math.random() * ring1)]
      const a = Math.random() * Math.PI * 2
      const d = 55 + Math.random() * 85
      nodes.push({
        id: nodes.length,
        x: parent.x + Math.cos(a) * d,
        y: parent.y + Math.sin(a) * d,
        vx: 0, vy: 0,
        r: 3 + Math.random() * 2,
        risk: risks[Math.floor(Math.random() * risks.length)],
        parent: parent.id,
      })
    }

    const edges = []
    nodes.forEach(n => { if (n.parent !== undefined) edges.push({ a: n.parent, b: n.id }) })
    for (let i = 0; i < 10; i++) {
      const a = 1 + Math.floor(Math.random() * (nodes.length - 1))
      const b = 1 + Math.floor(Math.random() * (nodes.length - 1))
      if (a !== b) edges.push({ a, b, cross: true })
    }

    // defs
    const NS = 'http://www.w3.org/2000/svg'
    const defs = document.createElementNS(NS, 'defs')
    defs.innerHTML = `
      <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff2d55" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#ff2d55" stop-opacity="0"/>
      </radialGradient>
      <filter id="nodeGlow">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `
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
      if (Math.random() > 0.6) line.setAttribute('class', 'edge')
      gEdges.appendChild(line)
      return line
    })

    const nodeEls = nodes.map(n => {
      const g = document.createElementNS(NS, 'g')
      g.classList.add('gnode')
      const color = colorFor(n.risk)
      if (n.risk === 'high' || n.root) {
        const halo = document.createElementNS(NS, 'circle')
        halo.setAttribute('r', n.r * 2)
        halo.setAttribute('fill', 'none')
        halo.setAttribute('stroke', color)
        halo.setAttribute('stroke-width', '1')
        halo.setAttribute('class', 'node-pulse')
        halo.style.animationDelay = (Math.random() * 2) + 's'
        g.appendChild(halo)
      }
      const c = document.createElementNS(NS, 'circle')
      c.setAttribute('r', n.r)
      c.setAttribute('fill', color)
      c.setAttribute('filter', 'url(#nodeGlow)')
      if (n.root) {
        c.setAttribute('stroke', '#fff')
        c.setAttribute('stroke-width', '1.5')
      }
      g.appendChild(c)
      gNodes.appendChild(g)
      return g
    })

    // reticle
    const reticle = document.createElementNS(NS, 'g')
    reticle.setAttribute('id', 'graphReticle')
    reticle.innerHTML = `
      <circle r="4" fill="#00f5ff"/>
      <circle r="10" fill="none" stroke="#00f5ff" stroke-width="0.8" opacity="0.6"/>
      <circle r="22" fill="none" stroke="#00f5ff" stroke-width="0.5" opacity="0.3">
        <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.45;0.1;0.45" dur="2s" repeatCount="indefinite"/>
      </circle>
    `
    svg.appendChild(reticle)

    let mouseX = null, mouseY = null, mouseActive = false

    function toViewBox(cx, cy) {
      const rect = svg.getBoundingClientRect()
      return {
        x: ((cx - rect.left) / rect.width) * W,
        y: ((cy - rect.top) / rect.height) * H,
      }
    }

    const onMove = e => {
      const p = toViewBox(e.clientX, e.clientY)
      mouseX = p.x; mouseY = p.y; mouseActive = true
      reticle.classList.add('on')
      reticle.setAttribute('transform', `translate(${mouseX},${mouseY})`)
    }
    const onLeave = () => { mouseActive = false; reticle.classList.remove('on') }
    const onTouch = e => {
      const t = e.touches[0]; if (!t) return
      const p = toViewBox(t.clientX, t.clientY)
      mouseX = p.x; mouseY = p.y; mouseActive = true
      reticle.classList.add('on')
      reticle.setAttribute('transform', `translate(${mouseX},${mouseY})`)
    }
    const onTouchEnd = () => { mouseActive = false; reticle.classList.remove('on') }

    if (container) {
      container.addEventListener('mousemove', onMove)
      container.addEventListener('mouseleave', onLeave)
      container.addEventListener('touchmove', onTouch, { passive: true })
      container.addEventListener('touchend', onTouchEnd)
    }

    let rafId = 0
    function tick() {
      if (mouseActive && mouseX !== null) {
        const radius = 150
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          if (n.root) continue
          const dx = n.x - mouseX, dy = n.y - mouseY
          const d2 = dx * dx + dy * dy
          if (d2 < radius * radius) {
            const dist = Math.sqrt(d2) || 0.01
            const strength = (radius - dist) / radius
            const f = strength * 3.2
            n.vx += (dx / dist) * f
            n.vy += (dy / dist) * f
          }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        if (a.root) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
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
        n.vx += (CX - n.x) * 0.002
        n.vy += (CY - n.y) * 0.002
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
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    // node pop-in
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const popTimers = []
    if (reduced) {
      nodeEls.forEach(g => g.classList.add('in'))
    } else {
      nodeEls.forEach(g => {
        const delay = 300 + Math.floor(Math.random() * 800)
        popTimers.push(setTimeout(() => g.classList.add('in'), delay))
      })
    }

    return () => {
      cancelAnimationFrame(rafId)
      popTimers.forEach(clearTimeout)
      if (container) {
        container.removeEventListener('mousemove', onMove)
        container.removeEventListener('mouseleave', onLeave)
        container.removeEventListener('touchmove', onTouch)
        container.removeEventListener('touchend', onTouchEnd)
      }
      while (svg.firstChild) svg.removeChild(svg.firstChild)
    }
  }, [])

  // ===== MINI FEATURE SVGS =====
  useEffect(() => {
    const s1 = mini1Ref.current, s2 = mini2Ref.current, s3 = mini3Ref.current
    if (!s1 || !s2 || !s3) return

    // mini force graph
    s1.innerHTML = ''
    const pts = []
    for (let i = 0; i < 14; i++) pts.push({ x: 30 + Math.random() * 240, y: 20 + Math.random() * 140 })
    pts.forEach((p, i) => {
      pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y)
        if (d < 75) {
          s1.insertAdjacentHTML('beforeend',
            `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="rgba(0,245,255,0.25)" stroke-width="0.6"/>`)
        }
      })
    })
    pts.forEach((p, i) => {
      const color = i === 0 ? '#ff2d55' : (i % 5 === 0 ? '#ffb800' : '#00f5ff')
      const r = i === 0 ? 5 : 2.5
      s1.insertAdjacentHTML('beforeend',
        `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}"><animate attributeName="opacity" values="1;0.4;1" dur="${2 + Math.random() * 2}s" repeatCount="indefinite"/></circle>`)
    })

    // risk bars
    s2.innerHTML = ''
    const bars = [
      { l: 'HIGH', v: 78, c: '#ff2d55' },
      { l: 'MED',  v: 54, c: '#ffb800' },
      { l: 'LOW',  v: 88, c: '#00f5ff' },
      { l: 'INFO', v: 34, c: '#475066' },
    ]
    bars.forEach((b, i) => {
      const y = 25 + i * 34
      s2.insertAdjacentHTML('beforeend', `
        <text x="18" y="${y + 4}" fill="#8a94a6" font-family="JetBrains Mono" font-size="9">${b.l}</text>
        <rect x="55" y="${y - 6}" width="210" height="10" fill="rgba(255,255,255,0.04)" rx="2"/>
        <rect x="55" y="${y - 6}" width="0" height="10" fill="${b.c}" rx="2">
          <animate attributeName="width" from="0" to="${b.v * 2.1}" dur="1.4s" begin="0.2s" fill="freeze"/>
        </rect>
        <text x="${55 + b.v * 2.1 + 6}" y="${y + 4}" fill="${b.c}" font-family="JetBrains Mono" font-size="9" opacity="0">${b.v}
          <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.6s" fill="freeze"/>
        </text>
      `)
    })

    // AI terminal
    s3.innerHTML = `
      <rect x="0" y="0" width="300" height="180" fill="transparent"/>
      <text x="16" y="24" font-family="JetBrains Mono" font-size="9" fill="#8a94a6">~/exposureiq $ <tspan fill="#00f5ff">remediate</tspan></text>
      <text x="16" y="46" font-family="JetBrains Mono" font-size="9" fill="#ff2d55">[CRIT] auth.api exposed :22</text>
      <text x="16" y="62" font-family="JetBrains Mono" font-size="9" fill="#8a94a6">  └─ restrict ssh to 10.0.0.0/8</text>
      <text x="16" y="82" font-family="JetBrains Mono" font-size="9" fill="#ffb800">[WARN] tls weak cipher chain</text>
      <text x="16" y="98" font-family="JetBrains Mono" font-size="9" fill="#8a94a6">  └─ disable TLS 1.0/1.1</text>
      <text x="16" y="118" font-family="JetBrains Mono" font-size="9" fill="#00f5ff">[OK] DMARC policy validated</text>
      <text x="16" y="140" font-family="JetBrains Mono" font-size="9" fill="#22e27a">✓ 12 fixes ready to apply</text>
      <text x="16" y="162" font-family="JetBrains Mono" font-size="9" fill="#8a94a6">~/exposureiq $ <tspan fill="#00f5ff">_</tspan>
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
      </text>
    `
  }, [])

  // ===== HERO ENTRANCE (word-split, subtext, form) =====
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const title = heroTitleRef.current
    const sub = heroSubRef.current
    const form = scanFormRef.current
    const words = title ? title.querySelectorAll('.word') : []
    const timers = []

    if (reduced) {
      words.forEach(w => w.classList.add('in'))
      if (sub) sub.classList.add('in')
      if (form) form.classList.add('in')
    } else {
      words.forEach((w, i) => {
        timers.push(setTimeout(() => w.classList.add('in'), 250 + i * 80))
      })
      const tailStart = 250 + words.length * 80
      timers.push(setTimeout(() => { if (sub) sub.classList.add('in') }, tailStart + 100))
      timers.push(setTimeout(() => { if (form) form.classList.add('in') }, tailStart + 300))
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  // ===== REVEAL ON SCROLL + ANIM-CHILD STAGGER =====
  useEffect(() => {
    // auto-wire anim-child on feat-cards and steps
    document.querySelectorAll('.landing .features-grid .feat-card').forEach(el => el.classList.add('anim-child'))
    document.querySelectorAll('.landing .steps .step').forEach(el => el.classList.add('anim-child'))

    const childTimers = []
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const el = entry.target
        el.classList.add('in')
        const kids = el.querySelectorAll(':scope .anim-child:not(.in)')
        kids.forEach((k, i) => {
          childTimers.push(setTimeout(() => k.classList.add('in'), i * 100))
        })
        io.unobserve(el)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })

    document.querySelectorAll('.landing .reveal, .landing .anim-section').forEach(el => io.observe(el))

    const childIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          childIo.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    document.querySelectorAll('.landing .anim-child').forEach(el => {
      if (!el.closest('.reveal, .anim-section')) childIo.observe(el)
    })

    return () => {
      io.disconnect()
      childIo.disconnect()
      childTimers.forEach(clearTimeout)
    }
  }, [])

  // ===== TICKER COUNT-UP =====
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wrap = tickerWrapRef.current
    if (!wrap) return

    function formatNum(v, suffix, decimals, hasComma) {
      let s = decimals > 0 ? v.toFixed(decimals) : String(Math.floor(v))
      if (hasComma) s = Number(s).toLocaleString('en-US', decimals > 0 ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : {})
      return s + suffix
    }

    function animateCount(el, target, suffix, decimals, hasComma) {
      if (reduced) { el.textContent = formatNum(target, suffix, decimals, hasComma); return }
      const duration = 1400
      const start = performance.now()
      function tick(now) {
        const p = Math.min(1, (now - start) / duration)
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        const cur = target * eased
        el.textContent = formatNum(cur, suffix, decimals, hasComma)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    let counted = false
    const tio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting || counted) return
        counted = true
        const seen = new Set()
        wrap.querySelectorAll('.ticker .num').forEach(n => {
          const raw = n.textContent.trim()
          if (seen.has(raw)) return
          seen.add(raw)
          const m = raw.match(/^([\d,]+(?:\.\d+)?)(.*)$/)
          if (!m) return
          const numPart = m[1]
          const suffix = m[2] || ''
          const hasComma = numPart.includes(',')
          const clean = numPart.replace(/,/g, '')
          const decimals = (clean.split('.')[1] || '').length
          const target = parseFloat(clean)
          if (isNaN(target)) return
          n.textContent = formatNum(0, suffix, decimals, hasComma)
          animateCount(n, target, suffix, decimals, hasComma)
        })
        tio.unobserve(wrap)
      })
    }, { threshold: 0.3 })
    tio.observe(wrap)
    return () => tio.disconnect()
  }, [])

  // ===== STEPS CONNECTOR DRAW-IN =====
  useEffect(() => {
    const connector = stepsConnectorRef.current
    if (!connector) return
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          connector.classList.add('in')
          cio.unobserve(connector)
        }
      })
    }, { threshold: 0.3 })
    cio.observe(connector)
    return () => cio.disconnect()
  }, [])

  // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href === '#') return
      const id = href.slice(1)
      const t = document.getElementById(id)
      if (!t) return
      e.preventDefault()
      t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }
    const root = document.querySelector('.landing')
    if (!root) return
    root.addEventListener('click', handler)
    return () => root.removeEventListener('click', handler)
  }, [])

  // ===== SCAN SUBMIT =====
  async function runDemo(e) {
    e.preventDefault()
    const val = domain.trim()
    if (!val || scanBusy || !authReady) return
    setScanError('')
    setScanBusy(true)
    setScanLabel('SCANNING...')

    // Not signed in → stash domain, route to /login. Login.jsx will
    // resume the scan after auth via sessionStorage.pending_domain.
    if (!session) {
      sessionStorage.setItem('pending_domain', val)
      setTimeout(() => {
        setScanLabel('SIGN IN TO CONTINUE')
        setTimeout(() => navigate('/login'), 500)
      }, 600)
      return
    }

    // Signed in → real scan via API.
    try {
      const { scanId } = await postScan(val)
      setScanLabel('QUEUED ✓')
      setTimeout(() => {
        navigate(`/dashboard/${scanId}`, { state: { domain: val } })
      }, 500)
    } catch (err) {
      setScanBusy(false)
      setScanLabel('Scan Now')
      setScanError(err?.message || 'Scan failed')
    }
  }

  // CTA "Request Access" form → route to signup
  function requestAccess(e) {
    e.preventDefault()
    const f = e.currentTarget
    const email = (f.querySelector('input[type=email]') || {}).value || ''
    if (email) sessionStorage.setItem('pending_email', email)
    navigate('/login')
  }

  return (
    <div className="landing">
      <LandingBackground />
      <LandingNav session={session} />

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="tag">
            <span className="dot" />
            <span>LIVE ATTACK SURFACE INTELLIGENCE</span>
          </div>
          <h1 className="hero-title" id="heroTitle" ref={heroTitleRef}>
            {TITLE_WORDS.map((line, li) => (
              <span className="line" key={li}>
                {line.map((w, wi) => (
                  <span className="word" key={wi}>{w}{wi < line.length - 1 ? ' ' : ''}</span>
                ))}
              </span>
            ))}
          </h1>
          <p className="hero-sub fade-ready" ref={heroSubRef}>
            ExposureIQ enumerates every subdomain, IP, port, and exposed service tied to your organization — then scores risk, maps lateral paths, and generates <b>AI-powered remediations</b> in under 60 seconds.
          </p>

          <form className="scan-form spring-ready" onSubmit={runDemo} ref={scanFormRef}>
            <span className="prefix">https://</span>
            <input
              type="text"
              id="domain-input"
              placeholder="target-domain.com"
              autoComplete="off"
              spellCheck="false"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              disabled={scanBusy}
            />
            <button type="submit" className="cta" disabled={scanBusy || !authReady}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <span>{scanLabel}</span>
            </button>
          </form>
          {scanError && (
            <p style={{
              marginTop: 12, color: 'var(--red)', fontFamily: 'var(--mono)',
              fontSize: 12, letterSpacing: '0.05em',
            }}>
              {scanError}
            </p>
          )}

          <div className="hero-meta">
            <div className="item"><span className="led" /><span>ENGINES ONLINE</span></div>
            <div className="item"><span className="led r" /><span>3 CRITICAL OBSERVED</span></div>
            <div className="item"><span className="led a" /><span>SHODAN · CRT.SH · HIBP</span></div>
          </div>
        </div>

        <div className="hero-graph" id="heroGraph" ref={heroGraphRef}>
          <div className="graph-corner tl">TARGET · demo.corp<span className="big">316 nodes</span></div>
          <div className="graph-corner tr">THREAT LEVEL<span className="big">HIGH</span></div>
          <div className="graph-corner bl">EDGES · 1,503</div>
          <div className="graph-corner br">SCAN · 47.3s</div>
          <svg id="graphSvg" ref={graphRef} viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" />
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap" ref={tickerWrapRef}>
        <div className="ticker" id="ticker">
          {[0, 1].map(copy => TICKER_ITEMS.map((it, i) => (
            <div className="item" key={`${copy}-${i}`}>
              <span className={`num ${it.c}`}>{it.n}</span>
              <span>{it.l}</span>
              <span className="sep" />
            </div>
          )))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="reveal">
          <div className="section-label">01 / Capabilities</div>
          <h2 className="section-title">Threat intelligence, <em>weaponized</em> for your defenders.</h2>
          <p className="section-intro">
            Three integrated surfaces. One objective: see what attackers see, before they pivot.
          </p>
        </div>

        <div className="features-grid">
          <div className="feat-card reveal delay-1">
            <div className="feat-num">F-01 · VISUALIZATION</div>
            <div className="feat-visual">
              <svg viewBox="0 0 300 180" id="miniGraph1" ref={mini1Ref} />
            </div>
            <h3>Force-Directed Graph</h3>
            <p>Every host, subdomain, and service rendered as an interactive node. Pulse, zoom, filter by risk. Identify chokepoints and high-value pivot targets in seconds.</p>
            <div className="feat-tags">
              <span className="feat-tag">D3 Force</span>
              <span className="feat-tag">Live Edges</span>
              <span className="feat-tag">Risk Heatmap</span>
            </div>
          </div>

          <div className="feat-card reveal delay-2">
            <div className="feat-num">F-02 · DASHBOARD</div>
            <div className="feat-visual">
              <svg viewBox="0 0 300 180" id="miniGraph2" ref={mini2Ref} />
            </div>
            <h3>Risk Dashboard</h3>
            <p>Asset counts, port exposure, breach correlation, severity distribution. Executive-grade summaries with operator-grade drill-downs. HIBP-enriched, always current.</p>
            <div className="feat-tags">
              <span className="feat-tag">Shodan</span>
              <span className="feat-tag">HIBP</span>
              <span className="feat-tag">CVE Linked</span>
            </div>
          </div>

          <div className="feat-card reveal delay-3">
            <div className="feat-num">F-03 · REMEDIATION</div>
            <div className="feat-visual">
              <svg viewBox="0 0 300 180" id="miniGraph3" ref={mini3Ref} />
            </div>
            <h3>AI-Powered Fixes</h3>
            <p>Groq-accelerated LLM distills every finding into concrete, prioritized patches. Kill-chain analysis shows exactly how an adversary would chain weaknesses end-to-end.</p>
            <div className="feat-tags">
              <span className="feat-tag">Llama 3.3</span>
              <span className="feat-tag">Kill Chain</span>
              <span className="feat-tag">Auto-Triage</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="reveal">
          <div className="section-label">02 / Protocol</div>
          <h2 className="section-title">Three steps. <em>Full coverage.</em></h2>
        </div>

        <div className="steps-wrap reveal delay-1">
          <div className="steps-connector" id="stepsConnector" ref={stepsConnectorRef}>
            <svg viewBox="0 0 100 4" preserveAspectRatio="none">
              <path d="M 2 2 Q 25 0.5 50 2 T 98 2" pathLength="100" strokeDasharray="100" strokeDashoffset="100" />
            </svg>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <h4>Enter a Domain</h4>
              <p>Drop any root domain you're authorized to assess. ExposureIQ hits public intel sources — no agents, no credentials, no noise.</p>
              <div className="console">
                <div><span className="muted">&gt;</span> target <span className="g">acme.corp</span></div>
                <div><span className="muted">&gt;</span> scope <span className="a">*.acme.corp</span></div>
              </div>
            </div>

            <div className="step">
              <div className="step-num">02</div>
              <h4>Scan &amp; Map</h4>
              <p>Parallel enumeration across crt.sh, Shodan, and HIBP. Subdomains resolve, ports fingerprint, graph materializes in real time.</p>
              <div className="console">
                <div><span className="muted">&gt;</span> crt.sh <span className="g">142 subs</span></div>
                <div><span className="muted">&gt;</span> shodan <span className="a">89 hosts</span></div>
                <div><span className="muted">&gt;</span> hibp <span className="r">4 breached</span></div>
              </div>
            </div>

            <div className="step">
              <div className="step-num">03</div>
              <h4>Get AI Fixes</h4>
              <p>Findings route through a reasoning model that emits patches ranked by exploitability, business impact, and effort. Ship the diff, close the loop.</p>
              <div className="console">
                <div><span className="muted">&gt;</span> triage <span className="g">complete</span></div>
                <div><span className="muted">&gt;</span> critical <span className="r">3 fixes</span></div>
                <div><span className="muted">&gt;</span> export <span className="g">ready</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="cta">
        <div className="cta-orb" />
        <div className="reveal">
          <div className="section-label" style={{ color: 'var(--red)' }}>03 / Deploy</div>
          <h2>Your attack surface <em>is exposed.</em><br />Find it first.</h2>
          <p>Join security teams and researchers mapping what adversaries already see.</p>
          <form className="cta-form" onSubmit={requestAccess}>
            <input type="email" placeholder="you@company.com" required />
            <button type="submit" className="cta">
              <span>Request Access</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            </button>
          </form>
          <div className="trust-row">
            <span>SOC 2 READY</span>
            <span>·</span>
            <span>READ-ONLY INTEL</span>
            <span>·</span>
            <span>BUG BOUNTY APPROVED</span>
            <span>·</span>
            <span>MIT LICENSED CORE</span>
          </div>
        </div>
      </section>

      <footer>
        <div>EXPOSUREIQ © 2026 · BUILT FOR OPERATORS</div>
        <div className="links">
          <a href="#">docs</a>
          <a href="#">github</a>
          <a href="#">status</a>
          <a href="#">security</a>
        </div>
      </footer>
    </div>
  )
}
