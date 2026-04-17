import { X, Globe, Server, Network as NetworkIcon, Shield } from 'lucide-react'
import RiskBadge from './RiskBadge'

const TYPE_META = {
  domain: { icon: Globe, label: 'Root Domain', color: 'text-[#58a6ff]' },
  subdomain: { icon: NetworkIcon, label: 'Subdomain', color: 'text-[#79c0ff]' },
  ip: { icon: Server, label: 'IP Address', color: 'text-[#8b949e]' },
  service: { icon: Shield, label: 'Open Port', color: 'text-[#a371f7]' },
}

export default function NodeDetailPanel({ node, onClose }) {
  const open = Boolean(node)
  const meta = node ? TYPE_META[node.type] ?? TYPE_META.subdomain : TYPE_META.domain
  const Icon = meta.icon

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#161b22] border-l border-[#30363d] z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {node && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <h2 className="text-white font-semibold text-sm uppercase tracking-wider">{meta.label}</h2>
              </div>
              <button onClick={onClose} className="text-[#8b949e] hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="font-mono text-[#e6edf3] text-base mb-6 break-all">
              {node.fullLabel ?? node.label}
            </p>

            {node.type === 'subdomain' && <SubdomainBody data={node.raw} />}
            {node.type === 'ip' && <IpBody data={node.raw} />}
            {node.type === 'service' && <ServiceBody data={node.raw} />}
            {node.type === 'domain' && <DomainBody data={node.raw} />}
          </div>
        )}
      </div>
    </>
  )
}

function Section({ label, children }) {
  return (
    <div className="mb-5">
      <p className="text-[#8b949e] text-xs uppercase tracking-wider font-semibold mb-2">{label}</p>
      {children}
    </div>
  )
}

function SubdomainBody({ data }) {
  return (
    <>
      <Section label="Risk">
        <div className="flex items-center gap-2">
          <RiskBadge score={data.risk?.score ?? 'Low'} />
        </div>
      </Section>
      {data.risk?.reasons?.length > 0 && (
        <Section label="Reasons">
          <ul className="space-y-1.5">
            {data.risk.reasons.map((r, i) => (
              <li key={i} className="text-sm text-[#e6edf3] flex gap-2">
                <span className="text-[#f85149] shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {data.ips?.length > 0 && (
        <Section label="IPs">
          <div className="space-y-1">
            {data.ips.map((ip) => (
              <p key={ip} className="font-mono text-[#8b949e] text-sm">{ip}</p>
            ))}
          </div>
        </Section>
      )}
      {data.ports?.length > 0 && (
        <Section label="Open Ports">
          <div className="flex flex-wrap gap-1.5">
            {data.ports.map((p) => (
              <span key={p} className="text-xs font-mono bg-[#21262d] text-[#e6edf3] px-2 py-0.5 rounded">
                {p}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  )
}

function IpBody({ data }) {
  const s = data.shodan
  return (
    <>
      {s?.org && <Section label="Organization"><p className="text-[#e6edf3] text-sm">{s.org}</p></Section>}
      {s?.os && <Section label="OS"><p className="text-[#e6edf3] text-sm">{s.os}</p></Section>}
      {s?.hostnames?.length > 0 && (
        <Section label="Hostnames">
          <div className="space-y-1">
            {s.hostnames.map((h) => (
              <p key={h} className="font-mono text-[#79c0ff] text-xs break-all">{h}</p>
            ))}
          </div>
        </Section>
      )}
      {s?.ports?.length > 0 && (
        <Section label="Ports">
          <div className="flex flex-wrap gap-1.5">
            {s.ports.map((p) => (
              <span key={p} className="text-xs font-mono bg-[#21262d] text-[#e6edf3] px-2 py-0.5 rounded">{p}</span>
            ))}
          </div>
        </Section>
      )}
      {!s && <p className="text-[#8b949e] text-sm">No Shodan data available for this IP.</p>}
    </>
  )
}

function ServiceBody({ data }) {
  return (
    <>
      <Section label="Port"><p className="font-mono text-[#e6edf3] text-base">{data.port}</p></Section>
      {data.dangerous && (
        <div className="mb-5 bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg p-3 text-[#f85149] text-sm">
          ⚠ Sensitive port — should not be publicly exposed
        </div>
      )}
      {data.service?.product && (
        <Section label="Service">
          <p className="text-[#e6edf3] text-sm">
            {data.service.product}{data.service.version ? ` ${data.service.version}` : ''}
          </p>
        </Section>
      )}
      {data.service?.banner && (
        <Section label="Banner">
          <pre className="bg-[#0d1117] border border-[#21262d] rounded p-2 font-mono text-[10px] text-[#8b949e] overflow-x-auto whitespace-pre-wrap break-all">
            {data.service.banner}
          </pre>
        </Section>
      )}
    </>
  )
}

function DomainBody({ data }) {
  return (
    <>
      <Section label="Total Assets"><p className="text-[#e6edf3] text-2xl font-mono">{data.totalAssets ?? '—'}</p></Section>
      <Section label="Breaches"><p className="text-[#a371f7] text-2xl font-mono">{data.breaches ?? '—'}</p></Section>
    </>
  )
}
