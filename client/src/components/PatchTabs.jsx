import { useState } from 'react'
import { Server, Cloud, FileCode, Shield, Check, Copy } from 'lucide-react'

const TYPE_META = {
  nginx:      { label: 'nginx',      icon: Server,   color: '#3fb950' },
  cloudflare: { label: 'Cloudflare', icon: Cloud,    color: '#f59f00' },
  htaccess:   { label: '.htaccess',  icon: FileCode, color: '#79c0ff' },
  iptables:   { label: 'iptables',   icon: Shield,   color: '#a371f7' },
}

export default function PatchTabs({ patches }) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)

  if (!patches?.length) return null
  const current = patches[active]
  const meta = TYPE_META[current.type] ?? { label: current.type, icon: FileCode, color: '#8b949e' }

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
    <div className="mt-4 border border-[#21262d] rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#21262d] bg-[#0d1117]">
        {patches.map((p, i) => {
          const m = TYPE_META[p.type] ?? { label: p.type, icon: FileCode, color: '#8b949e' }
          const Icon = m.icon
          const isActive = i === active
          return (
            <button
              key={i}
              onClick={() => { setActive(i); setCopied(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 ${
                isActive
                  ? 'border-[#a371f7] text-[#e6edf3] bg-[#161b22]'
                  : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
              <span>{m.label}</span>
            </button>
          )
        })}
        <div className="ml-auto flex items-center pr-2">
          <button
            onClick={copy}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              copied ? 'text-[#3fb950]' : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Filename + body */}
      {current.filename && (
        <p className="px-3 pt-2 font-mono text-[10px] text-[#484f58]" style={{ color: meta.color, opacity: 0.7 }}>
          {current.filename}
        </p>
      )}
      <pre className="bg-[#0d1117] font-mono text-[11px] text-[#e6edf3] p-3 overflow-x-auto leading-relaxed whitespace-pre">
{current.content ?? ''}
      </pre>
    </div>
  )
}
