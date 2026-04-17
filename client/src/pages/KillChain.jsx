import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Skull, RefreshCw, Search, KeyRound, Move, ShieldAlert, Target } from 'lucide-react'
import { postKillchain } from '../lib/api'

const SEVERITY_COLORS = {
  high: '#f85149',
  med: '#d29922',
  low: '#3fb950',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId, reloadKey])

  useEffect(() => {
    if (!loading) { clearInterval(tagTimer.current); return }
    tagTimer.current = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINES.length), 1800)
    return () => clearInterval(tagTimer.current)
  }, [loading])

  const run = () => {
    setLoading(true)
    setError('')
    setSteps(null)
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="min-h-[calc(100vh-49px)] bg-[#0d1117]">
      {/* Top bar */}
      <div className="border-b border-[#21262d] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/${scanId}`)}
            className="text-[#484f58] hover:text-[#8b949e]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-[#f85149]" />
            <h1 className="text-base font-semibold text-white">Attacker Kill Chain</h1>
            {domain && <span className="font-mono text-[#79c0ff] text-sm">· {domain}</span>}
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {loading && <LoadingState tagline={TAGLINES[tagIdx]} />}
        {error && !loading && (
          <div className="bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg p-6 text-center">
            <p className="text-[#f85149] mb-3">Analysis unavailable</p>
            <p className="text-[#8b949e] text-sm mb-4">{error}</p>
            <button
              onClick={run}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#e6edf3] rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}
        {steps && !loading && !error && (
          steps.length === 0 ? (
            <p className="text-center text-[#8b949e] py-12">No attack chain could be reconstructed for this scan.</p>
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
        <div className="w-12 h-12 border-2 border-[#f85149] border-t-transparent rounded-full animate-spin" />
        <Skull className="w-5 h-5 text-[#f85149] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p key={tagline} className="text-[#8b949e] text-sm fade-in">{tagline}</p>
    </div>
  )
}

function Timeline({ steps }) {
  return (
    <div className="relative">
      {/* Vertical rail */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[#30363d]" />

      <div className="space-y-5">
        {steps.map((step, i) => {
          const sev = SEVERITY_COLORS[step.severity] ?? '#8b949e'
          const PhaseIcon = PHASE_ICONS[step.phase] ?? Search
          return (
            <div
              key={i}
              className="relative pl-12 fade-in"
              style={{ animationDelay: `${i * 0.18}s`, opacity: 0 }}
            >
              {/* Marker */}
              <div
                className="absolute left-0 top-1 w-10 h-10 rounded-full border-2 flex items-center justify-center bg-[#0d1117]"
                style={{ borderColor: sev }}
              >
                <PhaseIcon className="w-4 h-4" style={{ color: sev }} />
              </div>

              {/* Card */}
              <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${sev}20`, color: sev }}
                  >
                    Step {step.step ?? i + 1}
                  </span>
                  {step.phase && (
                    <span className="text-[10px] uppercase tracking-wider text-[#8b949e]">
                      {step.phase}
                    </span>
                  )}
                </div>

                <h3 className="text-[#e6edf3] font-medium text-sm mb-1">{step.action}</h3>

                {step.target && (
                  <p className="font-mono text-[#79c0ff] text-xs mb-2 break-all">↳ {step.target}</p>
                )}

                {step.rationale && (
                  <p className="text-[#8b949e] text-sm leading-relaxed mb-3">{step.rationale}</p>
                )}

                {step.findings_used?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#21262d]">
                    {step.findings_used.map((f, j) => (
                      <span key={j} className="text-[10px] font-mono bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded break-all">
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
