import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Sparkles, Download, Network, Skull } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import AISuggestions from '../components/AISuggestions'
import { getResults, postEvent, postSuggest } from '../lib/api'
import { MOCK_SCAN } from '../lib/mockData'

const RISK_COLORS = { High: '#d4533b', Medium: '#c9933a', Low: '#4a9e6b' }

export default function Dashboard() {
  const { scanId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const isDemo = scanId === 'demo'
  const scanFromRouteState = location.state?.scanData ?? null

  const [scan, setScan] = useState(scanFromRouteState ?? (isDemo ? MOCK_SCAN : null))
  const [fetchError, setFetchError] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    if (isDemo) return

    if (scan) return

    getResults(scanId)
      .then(setScan)
      .catch(() => setFetchError('Scan not found or server unavailable'))
  }, [scanId, scan, isDemo])

  useEffect(() => {
    if (isDemo) return
    if (!scan || scan.status !== 'complete') return
    postEvent('view.dashboard', {
      scanId,
      domain: scan.domain,
      cacheAgeSeconds: scan.cacheAgeSeconds ?? null,
    }).catch(() => {})
  }, [scanId, scan, isDemo])

  const getAiFixes = async () => {
    setAiOpen(true)
    setAiLoading(true)
    setAiError('')
    setSuggestions(null)
    const highRisk = (scan?.results?.subdomains ?? []).filter(s => s.risk?.score === 'High')
    try {
      const data = await postSuggest(highRisk, isDemo ? null : scanId)
      setSuggestions(data.suggestions)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scan, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `exposureiq-${scan.domain}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    postEvent('export.json', { scanId, domain: scan.domain }).catch(() => {})
  }

  if (fetchError && !isDemo) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 fade-up">
      <p className="text-[var(--red)] text-sm">{fetchError}</p>
      <button onClick={() => navigate('/')} className="link text-sm">← Back to home</button>
    </div>
  )

  if (!scan) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="w-4 h-4 rounded-full"
        style={{ border: '2px solid var(--text-3)', borderTopColor: 'var(--amber)', animation: 'spin 0.7s linear infinite' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const r = scan.results ?? {}
  const subdomains = r.subdomains ?? []
  const riskCounts = r.riskCounts ?? { High: 0, Medium: 0, Low: 0 }
  const highRiskItems = subdomains.filter(s => s.risk?.score === 'High')
  const scanAgeSeconds = scan.cacheAgeSeconds
  let scanAgeLabel = ''
  if (scan.degraded) {
    scanAgeLabel = scan.degradedReason
      ? `Scan degraded — ${scan.degradedReason}. Subdomain enumeration may be incomplete.`
      : 'Scan degraded — subdomain enumeration may be incomplete.'
  } else if (Number.isFinite(scanAgeSeconds)) {
    if (scanAgeSeconds < 60) {
      scanAgeLabel = 'Scanned just now.'
    } else {
      const mins = Math.floor(scanAgeSeconds / 60)
      if (mins < 60) {
        scanAgeLabel = `Scanned just ${mins} min ago.`
      } else {
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) {
          scanAgeLabel = `Scanned ${hrs} hr ago.`
        } else {
          const days = Math.floor(hrs / 24)
          scanAgeLabel = `Scanned ${days} day ago.`
        }
      }
    }
  }

  const chartData = Object.entries(riskCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: RISK_COLORS[name] }))

  const stats = [
    { label: 'Assets', value: r.resolvedSubdomains ?? 0 },
    { label: 'High risk', value: riskCounts.High ?? 0, color: 'var(--red)' },
    { label: 'Medium', value: riskCounts.Medium ?? 0, color: 'var(--yellow)' },
    { label: 'Breaches', value: r.hibp?.breachCount ?? '—', color: 'var(--amber)' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 fade-up">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-[var(--text-3)] hover:text-[var(--text-0)] transition-colors mt-0.5 p-1"
            title="New scan"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-0)] mono tracking-tight">{scan.domain}</h1>
            <p className="text-[var(--text-3)] text-[11px] mt-1">
              {scan.completedAt && new Date(scan.completedAt).toLocaleString()}
              {scanId === 'demo' && <span className="ml-2 text-[var(--yellow)]">• demo</span>}
            </p>
            {scanAgeLabel && (
              <p className="text-[var(--text-2)] text-xs mt-1.5">{scanAgeLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/graph/${scanId}`, { state: { scanData: scan } })}
            className="btn btn-ghost"
          >
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">Graph</span>
          </button>
          <button
            onClick={() => navigate(`/killchain/${scanId}`, { state: { scanData: scan } })}
            className="btn btn-ghost"
          >
            <Skull className="w-4 h-4" />
            <span className="hidden sm:inline">Kill chain</span>
          </button>
          <button onClick={exportJson} className="btn btn-ghost">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {highRiskItems.length > 0 && (
            <button onClick={getAiFixes} className="btn btn-accent">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI fixes</span>
              <span
                className="mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(212,83,59,0.15)', color: 'var(--red)' }}
              >
                {highRiskItems.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 rounded overflow-hidden mb-6 fade-up-1"
        style={{ border: '1px solid var(--border)' }}
      >
        {stats.map(s => (
          <div
            key={s.label}
            className="p-5"
            style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
          >
            <p className="text-[var(--text-3)] text-[11px] uppercase tracking-widest">{s.label}</p>
            <p
              className="text-2xl font-semibold mono mt-2 tracking-tight"
              style={{ color: s.color ?? 'var(--text-0)' }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Risk distribution */}
        <div className="card p-5 fade-up-2">
          <p className="text-[var(--text-3)] text-[11px] uppercase tracking-widest mb-4">Risk distribution</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={72}
                  strokeWidth={0}
                  paddingAngle={2}
                >
                  {chartData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-mid)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--text-0)',
                  }}
                  itemStyle={{ color: 'var(--text-1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[var(--text-3)] text-sm">
              No risk data
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {chartData.map(e => (
              <div key={e.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: e.color }} />
                <span className="text-[var(--text-2)] text-xs">{e.name}</span>
                <span className="text-[var(--text-3)] text-xs mono">{e.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subdomains table */}
        <div className="card lg:col-span-2 overflow-hidden fade-up-3">
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}
          >
            <p className="text-[var(--text-3)] text-[11px] uppercase tracking-widest">Subdomains</p>
            <span className="text-[var(--text-3)] text-[11px] mono">{subdomains.length} resolved</span>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 360 }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-raised)' }}>
                  {['Subdomain', 'IP', 'Ports', 'Risk'].map(col => (
                    <th
                      key={col}
                      className="px-5 py-2.5 text-left text-[var(--text-3)] text-[10px] font-medium uppercase tracking-wider"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subdomains.map(s => (
                  <tr key={s.subdomain} className="data-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-2.5 mono text-[var(--text-1)] text-xs max-w-[220px] truncate" title={s.subdomain}>
                      {s.subdomain}
                    </td>
                    <td className="px-5 py-2.5 mono text-[var(--text-2)] text-xs">
                      {s.ips[0] ?? '—'}
                      {s.ips.length > 1 && <span className="text-[var(--text-3)]"> +{s.ips.length - 1}</span>}
                    </td>
                    <td className="px-5 py-2.5 mono text-[var(--text-2)] text-xs">
                      {s.ports?.length ? s.ports.join(', ') : '—'}
                    </td>
                    <td className="px-5 py-2.5">
                      <RiskBadge score={s.risk?.score ?? 'Low'} size="sm" />
                    </td>
                  </tr>
                ))}
                {subdomains.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-[var(--text-3)] text-sm">
                      No subdomains resolved
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* High risk details */}
      {highRiskItems.length > 0 && (
        <div className="card p-5 fade-up-4">
          <p className="text-[var(--red)] text-[11px] uppercase tracking-widest mb-4">
            High risk — {highRiskItems.length} asset{highRiskItems.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {highRiskItems.map(s => (
              <div
                key={s.subdomain}
                className="flex flex-wrap items-start gap-3 py-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="mono text-[var(--text-1)] text-xs shrink-0 min-w-[180px] truncate">{s.subdomain}</span>
                <div className="flex flex-wrap gap-1.5">
                  {s.risk.reasons.map((reason, i) => (
                    <span
                      key={i}
                      className="text-[11px] text-[var(--text-2)] px-2 py-0.5 rounded"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AISuggestions
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        loading={aiLoading}
        suggestions={suggestions}
        error={aiError}
      />
    </div>
  )
}
