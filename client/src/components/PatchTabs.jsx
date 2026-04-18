import { useState } from 'react'
import { Server, Cloud, FileCode, Shield, Check, Copy } from 'lucide-react'

const TYPE_META = {
  nginx:      { label: 'nginx',      icon: Server,   color: 'var(--green)' },
  cloudflare: { label: 'Cloudflare', icon: Cloud,   color: '#f59f00' },
  htaccess:   { label: '.htaccess',  icon: FileCode, color: 'var(--text-1)' },
  iptables:   { label: 'iptables',  icon: Shield,   color: 'var(--amber)' },
}

export default function PatchTabs({ patches }) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)

  if (!patches?.length) return null
  const current = patches[active]
  const meta = TYPE_META[current.type] ?? { label: current.type, icon: FileCode, color: 'var(--text-2)' }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.content ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="mt-3 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
        {patches.map((p, i) => {
          const m = TYPE_META[p.type] ?? { label: p.type, icon: FileCode, color: 'var(--text-2)' }
          const Icon = m.icon
          const isActive = i === active
          return (
            <button
              key={i}
              onClick={() => { setActive(i); setCopied(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] transition-colors border-b-2 ${
                isActive
                  ? 'border-[var(--amber)] text-[var(--text-0)]'
                  : 'border-transparent text-[var(--text-3)]'
              }`}
              style={isActive ? { background: 'var(--bg-surface)' } : {}}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
              <span>{m.label}</span>
            </button>
          )
        })}
        <div className="ml-auto flex items-center pr-2">
          <button
            onClick={copy}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors ${
              copied ? 'text-[var(--green)]' : 'text-[var(--text-3)]'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {current.filename && (
        <p className="px-3 pt-2 font-mono text-[10px] truncate" style={{ color: meta.color, opacity: 0.6 }}>
          {current.filename}
        </p>
      )}
      <pre
        className="font-mono text-[11px] p-3 overflow-x-auto leading-relaxed whitespace-pre"
        style={{ background: 'var(--bg-base)', color: 'var(--text-1)' }}
      >
        {current.content ?? ''}
      </pre>
    </div>
  )
}
