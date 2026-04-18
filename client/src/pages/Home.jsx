import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { MOCK_SCAN } from '../lib/mockData'
import { getRecentScans, getResults, postEvent, postScan } from '../lib/api'
import RiskBadge from '../components/RiskBadge'

const SCAN_STEPS = [
  'Querying certificate logs…',
  'Resolving DNS records…',
  'Checking breach databases…',
  'Scoring asset risk…',
]

export default function Home() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [statusQuote, setStatusQuote] = useState('')
  const [forceRescan, setForceRescan] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getRecentScans(5)
      .then((data) => {
        if (!active) return
        setHistory(data.history ?? [])
      })
      .catch(() => {
        if (!active) return
        setHistory([])
      })

    return () => {
      active = false
    }
  }, [])

  const startScan = async () => {
    const d = domain.trim()
    if (!d) return
    setLoading(true)
    setError('')
    setStatusQuote('')
    setStep(0)

    try {
      const { scanId, source, cacheAgeSeconds } = await postScan(d, { forceRescan })

      if (source === 'cache') {
        const mins = Math.max(1, Math.floor((cacheAgeSeconds ?? 0) / 60))
        setStatusQuote(`Scanned just ${mins} min ago - using global cached result.`)
      } else if (source === 'running') {
        setStatusQuote('A scan is already running for this domain. Joining live results...')
      }

      let si = 0
      setStep(si)

      const interval = setInterval(async () => {
        try {
          const data = await getResults(scanId)
          if (data.status === 'running') {
            si = Math.min(si + 1, SCAN_STEPS.length - 1)
            setStep(si)
          }
          if (data.status === 'complete') {
            clearInterval(interval)
            postEvent('scan.complete', {
              scanId,
              domain: d,
              cacheAgeSeconds: data.cacheAgeSeconds ?? null,
            }).catch(() => {})
            navigate(`/dashboard/${scanId}`, { state: { scanData: data } })
          }
          if (data.status === 'error') {
            clearInterval(interval)
            setLoading(false)
            postEvent('scan.error', {
              scanId,
              domain: d,
              error: data.error ?? null,
            }).catch(() => {})
            setError(data.error ?? 'Scan failed — check the domain')
          }
        } catch (err) {
          clearInterval(interval)
          setLoading(false)
          setError(err?.message || 'Lost connection to server')
        }
      }, 2200)
    } catch (err) {
      setLoading(false)
      setError(err.message)
    }
  }

  const loadDemo = () => {
    navigate('/dashboard/demo', { state: { scanData: MOCK_SCAN } })
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-xl mx-auto px-6 pt-28 pb-20">
        <div className="fade-up">
          <p className="mono text-[11px] text-[var(--amber)] tracking-widest uppercase mb-4">
            ExposureIQ — attack surface intelligence
          </p>
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--text-0)] leading-[1.1] fade-up-1">
          Know your<br />exposure.
        </h1>

        <p className="text-[var(--text-2)] text-sm mt-4 max-w-sm leading-relaxed fade-up-2">
          Enumerate subdomains, surface open ports and breach data, then get AI-guided remediation.
        </p>

        <form
          onSubmit={e => { e.preventDefault(); startScan() }}
          className="mt-10 fade-up-3"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={e => { setDomain(e.target.value); setError('') }}
              placeholder="example.com"
              disabled={loading}
              className="input flex-1 px-4 py-3"
            />
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="btn btn-primary px-5 shrink-0"
            >
              {loading ? 'Scanning' : 'Scan'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={loadDemo}
            disabled={loading}
            className="mt-3 text-[var(--text-3)] hover:text-[var(--amber)] text-xs transition-colors"
          >
            Try the demo — tesla.com sample report →
          </button>

          <label className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-3)]">
            <input
              type="checkbox"
              checked={forceRescan}
              onChange={e => setForceRescan(e.target.checked)}
              disabled={loading}
              className="accent-[var(--amber)]"
            />
            Rescan now (skip 1-hour global cache)
          </label>

          {loading && (
            <div className="mt-8 fade-up">
              <p className="term-progress">
                [ {SCAN_STEPS[step]} ]
              </p>
              <div className="mt-3 h-px bg-[var(--border)] rounded overflow-hidden" style={{ width: `${Math.round(((step + 1) / SCAN_STEPS.length) * 100)}%`, transition: 'width 0.5s ease' }} />
              {statusQuote && (
                <p className="mt-3 text-xs text-[var(--text-2)]">{statusQuote}</p>
              )}
            </div>
          )}

          {error && !loading && (
            <p className="mt-4 text-[var(--red)] text-xs">{error}</p>
          )}
        </form>

        {history.length > 0 && !loading && (
          <div className="mt-16 fade-up-4">
            <p className="text-[var(--text-3)] text-[11px] uppercase tracking-widest mb-3 font-medium">
              Recent scans
            </p>
            <div
              className="border border-[var(--border)] rounded overflow-hidden"
              style={{ borderColor: 'var(--border)' }}
            >
              {history.map((entry, i) => (
                <button
                  key={entry.scanId}
                  onClick={() => navigate(`/dashboard/${entry.scanId}`)}
                  className="w-full flex items-center justify-between py-3 px-4 data-row text-left"
                  style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}
                >
                  <div>
                    <p className="mono text-[var(--text-1)] text-sm">
                      {entry.domain}
                    </p>
                    <p className="text-[var(--text-3)] text-[11px] mt-0.5">
                      {new Date(entry.completedAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.riskCounts?.High > 0 && <RiskBadge score="High" size="sm" />}
                    <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
