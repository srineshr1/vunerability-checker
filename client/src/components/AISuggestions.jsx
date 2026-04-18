import { X, Sparkles } from 'lucide-react'
import PatchTabs from './PatchTabs'

export default function AISuggestions({ open, onClose, loading, suggestions, error }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md z-50 overflow-y-auto transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-mid)' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--amber)' }} />
              <h2 className="text-[var(--text-0)] text-sm font-medium">AI remediation</h2>
            </div>
            <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-0)] p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-3 py-10">
              <div
                className="w-4 h-4 border-2 rounded-full"
                style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}
              />
              <p className="text-[var(--text-2)] text-sm">Analyzing high-risk assets…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {error && !loading && (
            <p className="text-[var(--red)] text-sm">{error}</p>
          )}

          {suggestions && !loading && (
            <div className="space-y-6">
              {suggestions.map((s, i) => (
                <div key={i} className="fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <p className="mono text-[var(--text-2)] text-xs mb-2 break-all">{s.asset}</p>
                  <ul className="space-y-1.5 mb-3">
                    {(s.fixes || []).map((fix, j) => (
                      <li key={j} className="flex gap-2 text-sm" style={{ color: 'var(--text-1)' }}>
                        <span style={{ color: 'var(--green)' }} className="shrink-0 mt-0.5">→</span>
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
