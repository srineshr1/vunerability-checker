import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Skull, RefreshCw, Search, KeyRound, Move, ShieldAlert, Target } from 'lucide-react'
import { postKillchain, postEvent } from '../lib/api'

const SEVERITY_COLORS = {
  high: 'var(--red)',
  med: 'var(--yellow)',
  low: 'var(--green)',
}

const PHASE_ICONS = {
  'Recon': Search,
  'Initial Access': KeyRound,
  'Lateral Movement': Move,
  'Privilege Escalation': ShieldAlert,
  'Impact': Target,
}

const TAGLINES = [
  'Modeling adversary behavior…',
  'Chaining findings…',
  'Mapping attack surface…',
  'Reconstructing kill chain…',
  'Cross-referencing breach data…',
]

export default function KillChain() {
  const { scanId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const initialDomain = location.state?.scanData?.domain ?? null
  const [domain, setDomain] = useState(initialDomain)
  const [steps, setSteps] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tagIdx, setTagIdx] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const tagTimer = useRef(null)

  useEffect(() => {
    let cancelled = false
    postKillchain(scanId)
      .then((data) => {
        if (cancelled) return
        setDomain(data.domain ?? initialDomain)
        setSteps(Array.isArray(data.steps) ? data.steps : [])
      })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [scanId, reloadKey])

  useEffect(() => {
    if (!loading) { clearInterval(tagTimer.current); return }
    tagTimer.current = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINES.length), 1800)
    return () => clearInterval(tagTimer.current)
  }, [loading])

  useEffect(() => {
    if (!loading && steps) {
      postEvent('view.killchain', {
        scanId,
        domain,
        cacheAgeSeconds: null,
      }).catch(() => {})
    }
  }, [loading, scanId])

  const run = () => {
    setLoading(true)
    setError('')
    setSteps(null)
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="min-h-[calc(100vh-52px)]" style={{ background: 'var(--bg-base)' }}>
      <div className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/${scanId}`)}
            className="text-[var(--text-3)] hover:text-[var(--text-0)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4" style={{ color: 'var(--red)' }} />
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-0)' }}>Attacker Kill Chain</h1>
            {domain && <span className="mono text-[var(--text-2)] text-sm">· {domain}</span>}
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="btn btn-ghost"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {loading && <LoadingState tagline={TAGLINES[tagIdx]} />}
        {error && !loading && (
          <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--red)' }}>
            <p className="text-[var(--red)] mb-3 text-sm">Analysis unavailable</p>
            <p className="text-[var(--text-2)] text-sm mb-4">{error}</p>
            <button onClick={run} className="btn btn-ghost">Retry</button>
          </div>
        )}
        {steps && !loading && !error && (
          steps.length === 0 ? (
            <p className="text-center text-[var(--text-2)] py-12 text-sm">No attack chain could be reconstructed for this scan.</p>
          ) : (
            <Timeline steps={steps} />
          )
        )}
      </div>
    </div>
  )
}

function LoadingState({ tagline }) {
  return (
    <div className="flex flex-col items-center py-20 gap-5">
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{ border: '2px solid var(--red)', borderTopColor: 'transparent' }}
        />
        <Skull className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: 'var(--red)' }} />
      </div>
      <p className="text-[var(--text-2)] text-sm fade-in">{tagline}</p>
    </div>
  )
}

function Timeline({ steps }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px" style={{ background: 'var(--border)' }} />

      <div className="space-y-5">
        {steps.map((step, i) => {
          const sev = SEVERITY_COLORS[step.severity] ?? 'var(--text-2)'
          const PhaseIcon = PHASE_ICONS[step.phase] ?? Search
          return (
            <div
              key={i}
              className="relative pl-12 fade-in"
              style={{ animationDelay: `${i * 0.18}s` }}
            >
              <div
                className="absolute left-0 top-1 w-10 h-10 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: sev, background: 'var(--bg-base)' }}
              >
                <PhaseIcon className="w-4 h-4" style={{ color: sev }} />
              </div>

              <div className="rounded p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${sev}20`, color: sev }}
                  >
                    Step {step.step ?? i + 1}
                  </span>
                  {step.phase && (
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                      {step.phase}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-0)' }}>{step.action}</h3>

                {step.target && (
                  <p className="font-mono text-[var(--text-1)] text-xs mb-2 break-all">↳ {step.target}</p>
                )}

                {step.rationale && (
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>{step.rationale}</p>
                )}

                {step.findings_used?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    {step.findings_used.map((f, j) => (
                      <span key={j} className="text-[10px] font-mono px-2 py-0.5 rounded break-all" style={{ background: 'var(--bg-base)', color: 'var(--text-2)' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
