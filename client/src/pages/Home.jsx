import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Zap, Clock, ChevronRight } from 'lucide-react'
import { MOCK_SCAN } from '../lib/mockData'
import { getHistory } from '../lib/history'
import RiskBadge from '../components/RiskBadge'

export default function Home() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const navigate = useNavigate()

  useEffect(() => { setHistory(getHistory()) }, [])

  const startScan = async (targetDomain) => {
    const d = (targetDomain ?? domain).trim()
    if (!d) return
    setLoading(true)
    setError('')
    setStatusMsg('Initiating scan...')

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const { scanId, error: err } = await res.json()
      if (err) throw new Error(err)

      const statuses = ['Querying crt.sh...', 'Resolving DNS...', 'Checking breach databases...']
      let si = 0
      setStatusMsg(statuses[0])

      const interval = setInterval(async () => {
        try {
          const data = await fetch(`/api/results/${scanId}`).then(r => r.json())
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
            setError(data.error ?? 'Scan failed — check if the domain is valid')
          }
        } catch {
          clearInterval(interval)
          setLoading(false)
          setError('Lost connection to server. Is the backend running?')
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-49px)] px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10 fade-in">
        <p className="text-[#8b949e] text-base">Attack surface intelligence for every domain</p>
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); startScan() }}
        className="w-full max-w-xl fade-in"
        style={{ animationDelay: '0.08s', opacity: 0 }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="example.com"
              disabled={loading}
              className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#58a6ff] rounded-lg pl-9 pr-4 py-3 text-[#e6edf3] placeholder-[#484f58] focus:outline-none transition-colors font-mono text-sm disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className="px-5 py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#484f58] disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
          >
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </div>

        {/* Demo button */}
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={loadDemo}
            disabled={loading}
            className="flex items-center gap-1.5 text-[#8b949e] hover:text-[#e6edf3] text-xs transition-colors disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5 text-[#d29922]" />
            Demo Mode — see a full tesla.com report instantly
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#8b949e] text-sm">{statusMsg}</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mt-4 text-[#f85149] text-sm text-center bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </form>

      {/* Scan history */}
      {history.length > 0 && !loading && (
        <div
          className="w-full max-w-xl mt-10 fade-in"
          style={{ animationDelay: '0.16s', opacity: 0 }}
        >
          <div className="flex items-center gap-2 mb-3 text-[#8b949e] text-xs uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            Recent Scans
          </div>
          <div className="space-y-1.5">
            {history.map(entry => (
              <button
                key={entry.scanId}
                onClick={() => navigate(`/dashboard/${entry.scanId}`)}
                className="w-full flex items-center justify-between bg-[#161b22] hover:bg-[#1c2128] border border-[#21262d] rounded-lg px-4 py-2.5 transition-colors text-left"
              >
                <div>
                  <p className="font-mono text-[#e6edf3] text-sm">{entry.domain}</p>
                  <p className="text-[#484f58] text-xs mt-0.5">
                    {new Date(entry.completedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.riskCounts?.High > 0 && (
                    <RiskBadge score="High" />
                  )}
                  <ChevronRight className="w-4 h-4 text-[#484f58]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p
        className="mt-12 text-[#484f58] text-xs fade-in text-center"
        style={{ animationDelay: '0.24s', opacity: 0 }}
      >
        Powered by crt.sh · Shodan · HaveIBeenPwned · Claude AI
      </p>
    </div>
  )
}
