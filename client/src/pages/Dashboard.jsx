import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Sparkles, Globe, AlertTriangle, ShieldAlert, Database, Download, Network, Skull } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import AISuggestions from '../components/AISuggestions'
import { saveToHistory } from '../lib/history'
import { getResults, postSuggest } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const RISK_COLORS = { High: '#f85149', Medium: '#d29922', Low: '#3fb950' }

const SUMMARY_CARDS = (r) => [
  { label: 'Total Assets',   value: r.resolvedSubdomains ?? 0,     color: 'text-[#58a6ff]',  icon: Globe },
  { label: 'High Risk',      value: r.riskCounts?.High ?? 0,       color: 'text-[#f85149]',  icon: ShieldAlert },
  { label: 'Medium Risk',    value: r.riskCounts?.Medium ?? 0,     color: 'text-[#d29922]',  icon: AlertTriangle },
  { label: 'Breaches Found', value: r.hibp?.breachCount ?? '—',    color: 'text-[#a371f7]',  icon: Database },
]

export default function Dashboard() {
  const { scanId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { user } = useAuth()
  const [scan, setScan] = useState(location.state?.scanData ?? null)
  const [fetchError, setFetchError] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    if (scan) {
      if (scan.status === 'complete' && scanId !== 'demo' && !user) {
        saveToHistory({
          scanId,
          domain: scan.domain,
          completedAt: scan.completedAt ?? new Date().toISOString(),
          riskCounts: scan.results?.riskCounts ?? {},
        })
      }
      return
    }
    getResults(scanId)
      .then(data => {
        setScan(data)
        if (data.status === 'complete' && !user) {
          saveToHistory({
            scanId,
            domain: data.domain,
            completedAt: data.completedAt ?? new Date().toISOString(),
            riskCounts: data.results?.riskCounts ?? {},
          })
        }
      })
      .catch(() => setFetchError('Scan not found or server unavailable'))
  }, [scanId, scan, user])

  const getAiFixes = async () => {
    setAiOpen(true)
    setAiLoading(true)
    setAiError('')
    setSuggestions(null)

    const highRisk = (scan?.results?.subdomains ?? []).filter(s => s.risk?.score === 'High')
    try {
      const data = await postSuggest(highRisk)
      setSuggestions(data.suggestions)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-[#f85149]">{fetchError}</p>
      <button onClick={() => navigate('/')} className="text-[#58a6ff] hover:underline text-sm">← Back to home</button>
    </div>
  )

  if (!scan) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const r = scan.results ?? {}
  const subdomains = r.subdomains ?? []
  const riskCounts = r.riskCounts ?? { High: 0, Medium: 0, Low: 0 }
  const highRiskItems = subdomains.filter(s => s.risk?.score === 'High')

  const chartData = Object.entries(riskCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: RISK_COLORS[name] }))

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-[#21262d] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="text-[#484f58] hover:text-[#8b949e] transition-colors"
            title="New scan"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white font-mono leading-tight">{scan.domain}</h1>
            {scan.completedAt && (
              <p className="text-[#484f58] text-xs">
                {new Date(scan.completedAt).toLocaleString()}
                {scanId === 'demo' && <span className="ml-2 text-[#d29922]">demo</span>}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/graph/${scanId}`, { state: { scanData: scan } })}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg text-sm transition-colors"
            title="Attack surface graph"
          >
            <Network className="w-4 h-4" />
            <span className="hidden sm:inline">Graph</span>
          </button>
          <button
            onClick={() => navigate(`/killchain/${scanId}`, { state: { scanData: scan } })}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg text-sm transition-colors"
            title="Attacker kill chain narrative"
          >
            <Skull className="w-4 h-4" />
            <span className="hidden sm:inline">Kill Chain</span>
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(scan, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `exposureiq-${scan.domain}-${Date.now()}.json`
              a.click()
              URL.revokeObjectURL(a.href)
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg text-sm transition-colors"
            title="Export results as JSON"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {highRiskItems.length > 0 && (
            <button
              onClick={getAiFixes}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d1f4e] hover:bg-[#3d2b6e] border border-[#a371f7]/30 text-[#a371f7] hover:text-[#c084fc] rounded-lg text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Get AI Fixes</span>
              <span className="sm:hidden">AI Fixes</span>
              <span className="bg-[#f85149]/20 text-[#f85149] text-xs px-1.5 py-0.5 rounded font-mono">
                {highRiskItems.length}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SUMMARY_CARDS(r).map(({ label, value, color, icon: Icon }, i) => (
            <div
              key={label}
              className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 fade-in"
              style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#8b949e] text-xs uppercase tracking-wider">{label}</p>
                <Icon className={`w-4 h-4 ${color} opacity-60`} />
              </div>
              <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Chart + Table row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie */}
          <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 fade-in" style={{ animationDelay: '0.32s', opacity: 0 }}>
            <p className="text-[#8b949e] text-xs uppercase tracking-wider font-semibold mb-4">Risk Distribution</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    cx="50%"
                    cy="45%"
                    outerRadius={72}
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
                    itemStyle={{ color: '#e6edf3' }}
                  />
                  <Legend
                    formatter={(v) => <span style={{ color: '#8b949e', fontSize: 12 }}>{v}</span>}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[#484f58] text-sm">
                No risk data
              </div>
            )}
          </div>

          {/* Subdomains table */}
          <div
            className="lg:col-span-2 bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden fade-in"
            style={{ animationDelay: '0.4s', opacity: 0 }}
          >
            <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between">
              <p className="text-[#8b949e] text-xs uppercase tracking-wider font-semibold">
                Subdomains
              </p>
              <span className="text-[#484f58] text-xs font-mono">{subdomains.length} resolved</span>
            </div>

            <div className="overflow-auto" style={{ maxHeight: 340 }}>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#161b22] sticky top-0">
                    {['Subdomain', 'IP', 'Ports', 'Risk'].map(col => (
                      <th key={col} className="px-4 py-2 text-left text-[#8b949e] text-xs font-medium uppercase tracking-wider border-b border-[#21262d]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subdomains.map((s, i) => (
                    <tr
                      key={s.subdomain}
                      className="border-t border-[#21262d] hover:bg-[#1c2128] transition-colors row-in"
                      style={{ animationDelay: `${0.44 + i * 0.03}s`, opacity: 0 }}
                    >
                      <td className="px-4 py-2.5 font-mono text-[#79c0ff] text-xs max-w-[200px] truncate" title={s.subdomain}>
                        {s.subdomain}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#8b949e] text-xs">
                        {s.ips[0] ?? '—'}
                        {s.ips.length > 1 && (
                          <span className="text-[#484f58]"> +{s.ips.length - 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#8b949e] text-xs">
                        {s.ports?.length ? s.ports.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <RiskBadge score={s.risk?.score ?? 'Low'} />
                      </td>
                    </tr>
                  ))}
                  {subdomains.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[#484f58] text-sm">
                        No subdomains resolved
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Risk reasons panel */}
        {highRiskItems.length > 0 && (
          <div
            className="bg-[#1a0f0f] border border-[#f85149]/20 rounded-lg p-4 fade-in"
            style={{ animationDelay: '0.5s', opacity: 0 }}
          >
            <p className="text-[#f85149] text-xs uppercase tracking-wider font-semibold mb-3">
              High Risk Details
            </p>
            <div className="space-y-2">
              {highRiskItems.map(s => (
                <div key={s.subdomain} className="flex flex-wrap items-start gap-3">
                  <span className="font-mono text-[#79c0ff] text-xs shrink-0">{s.subdomain}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {s.risk.reasons.map((r, i) => (
                      <span key={i} className="text-xs text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
