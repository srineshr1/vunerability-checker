import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Zap, Clock, ChevronRight, Activity, ShieldCheck, Cpu } from 'lucide-react'
import { MOCK_SCAN } from '../lib/mockData'
import { getHistory } from '../lib/history'
import { getRemoteHistory, postScan, getResults } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import RiskBadge from '../components/RiskBadge'

export default function Home() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function loadHistory() {
      if (user?.email) {
        try {
          const data = await getRemoteHistory(user.email)
          setHistory(data)
        } catch (err) {
          console.error('Failed to load remote history:', err)
          setHistory(getHistory()) // Fallback to local
        }
      } else {
        setHistory(getHistory())
      }
    }
    loadHistory()
  }, [user])

  const startScan = async (targetDomain) => {
    const d = (targetDomain ?? domain).trim()
    if (!d) return
    setLoading(true)
    setError('')
    setStatusMsg('Initiating scan...')

    try {
      const { scanId } = await postScan(d, user?.email)

      const statuses = ['Querying crt.sh sources...', 'Resolving DNS records...', 'Auditing breach databases...', 'Running risk assessment...']
      let si = 0
      setStatusMsg(statuses[0])

      const interval = setInterval(async () => {
        try {
          const data = await getResults(scanId)
          if (data.status === 'running') {
            si = Math.min(si + 1, statuses.length - 1)
            setStatusMsg(statuses[si])
          }
          if (data.status === 'complete') {
            clearInterval(interval)
            navigate(`/dashboard/${scanId}`, { state: { scanData: data } })
          }
          if (data.status === 'error') {
            clearInterval(interval)
            setLoading(false)
            setError(data.error ?? 'Scan failed — please verify the domain and try again.')
          }
        } catch {
          clearInterval(interval)
          setLoading(false)
          setError('Connectivity lost. Please check your internet or wait for the server.')
        }
      }, 2000)
    } catch (err) {
      setLoading(false)
      setError(err.message)
    }
  }

  const loadDemo = () => {
    navigate('/dashboard/demo', { state: { scanData: MOCK_SCAN } })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-49px)] px-4 py-16 bg-[#0d1117] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
          
          <section className="space-y-8 fade-in" style={{ animationDelay: '0.04s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-[#58a6ff] tracking-wide uppercase">
              <Activity className="w-3 h-3" />
              Real-time Reconnaissance
            </div>
            
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                Exposure <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] to-[#a371f7]">Intelligence</span> for the Modern Attack Surface.
              </h1>
              <p className="max-w-xl text-[#8b949e] text-lg leading-relaxed">
                Uncover external assets, misconfigurations, and breach risks in seconds. Proactive defense starts with visibility.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Discovery', desc: 'Full DNS mapping' },
                { label: 'Intelligence', desc: 'OSINT & Breach data' },
                { label: 'Response', desc: 'AI-driven fixes' }
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-[#21262d] bg-[#161b22]/50 p-4 backdrop-blur-sm transition-all hover:border-[#30363d] hover:bg-[#1c2128]">
                  <p className="text-xs uppercase tracking-widest text-[#58a6ff] font-bold">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-[#e6edf3]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-[#30363d] bg-[#0d1117] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5),0_0_80px_-40px_rgba(58,166,255,0.3)] fade-in relative" style={{ animationDelay: '0.12s' }}>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#238636]/10 border border-[#238636]/20">
                  <ShieldCheck className="w-5 h-5 text-[#238636]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Scan Console</h2>
                  <p className="text-xs text-[#8b949e]">Run an automated OSINT assessment</p>
                </div>
              </div>

              <form onSubmit={e => { e.preventDefault(); startScan() }} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#8b949e] uppercase tracking-widest ml-1">Target Domain</label>
                  <div className="relative group">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#484f58] transition-colors group-focus-within:text-[#58a6ff]" />
                    <input
                      type="text"
                      value={domain}
                      onChange={e => setDomain(e.target.value)}
                      placeholder="e.g. example.com"
                      disabled={loading}
                      className="w-full rounded-2xl border border-[#30363d] bg-[#161b22] py-4 pl-12 pr-4 text-sm text-[#e6edf3] placeholder-[#484f58] outline-none transition-all focus:border-[#58a6ff] focus:ring-4 focus:ring-[#58a6ff]/10 disabled:opacity-50 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !domain.trim()}
                  className="w-full rounded-2xl bg-[#238636] hover:bg-[#2ea043] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#238636]/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 disabled:bg-[#21262d] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Cpu className="w-4 h-4" />
                  )}
                  {loading ? 'Analyzing Target…' : 'Initialize Scan'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-[#30363d]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest">
                    <span className="bg-[#0d1117] px-2 text-[#484f58]">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadDemo}
                  disabled={loading}
                  className="w-full rounded-2xl border border-[#30363d] bg-transparent px-6 py-4 text-xs font-bold text-[#8b949e] uppercase tracking-widest transition-all hover:border-[#58a6ff] hover:text-white hover:bg-blue-500/5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-[#d29922]" />
                  Try Instant Demo
                </button>

                {loading && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="w-full bg-[#161b22] h-1 rounded-full overflow-hidden">
                      <div className="bg-[#58a6ff] h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
                    </div>
                    <p className="text-xs font-medium text-[#8b949e] animate-pulse">{statusMsg}</p>
                  </div>
                )}

                {error && !loading && (
                  <div className="rounded-2xl border border-[#f85149]/30 bg-[#3d1a1a]/40 px-4 py-3 text-xs text-[#f85149] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
              </form>
            </div>
          </section>
        </div>

        {history.length > 0 && !loading && (
          <div className="mt-20 fade-in" style={{ animationDelay: '0.24s' }}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#8b949e] text-xs font-bold uppercase tracking-[0.2em]">
                <Clock className="h-4 w-4" />
                Audit History
              </div>
              <div className="h-px flex-1 mx-6 bg-[#21262d]" />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {history.map(entry => (
                <button
                  key={entry.scanId}
                  onClick={() => navigate(`/dashboard/${entry.scanId}`)}
                  className="group rounded-[1.5rem] border border-[#21262d] bg-[#161b22]/30 p-5 text-left transition-all hover:border-[#58a6ff]/50 hover:bg-[#161b22] hover:shadow-xl hover:shadow-blue-500/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-sm font-bold font-mono text-[#e6edf3] tracking-tight">{entry.domain}</p>
                    <ChevronRight className="h-4 w-4 text-[#484f58] transition-all group-hover:text-white group-hover:translate-x-1" />
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-[#484f58] group-hover:text-[#8b949e] transition-colors">
                      {new Date(entry.createdAt || entry.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {entry.results?.riskCounts?.High > 0 || (entry.riskCounts?.High > 0) ? (
                      <RiskBadge score="High" />
                    ) : (
                      <RiskBadge score="Low" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-24 text-center space-y-4">
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#30363d] to-transparent" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#484f58] font-bold">
            OSINT Infrastructure provided by Shodan · crt.sh · HIBP
          </p>
        </footer>
      </div>
    </div>
  )
}
