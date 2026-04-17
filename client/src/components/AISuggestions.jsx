import { X, Cpu } from 'lucide-react'
import PatchTabs from './PatchTabs'

export default function AISuggestions({ open, onClose, loading, suggestions, error }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#161b22] border-l border-[#30363d] z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#a371f7]" />
              <h2 className="text-white font-semibold">AI Remediation</h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#8b949e] hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-8 h-8 border-2 border-[#a371f7] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#8b949e] text-sm">Generating fixes &amp; patches…</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg p-4 text-[#f85149] text-sm">
              {error}
            </div>
          )}

          {suggestions && !loading && (
            <div className="space-y-4">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4 fade-in"
                  style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
                >
                  <p className="font-mono text-[#79c0ff] text-xs mb-3 break-all">{s.asset}</p>
                  <ul className="space-y-2">
                    {(s.fixes || []).map((fix, j) => (
                      <li key={j} className="flex gap-2 text-sm text-[#8b949e]">
                        <span className="text-[#3fb950] shrink-0 mt-0.5">→</span>
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                  {s.patches?.length > 0 && <PatchTabs patches={s.patches} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
