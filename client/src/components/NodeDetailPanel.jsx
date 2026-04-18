import { X } from 'lucide-react'
import RiskBadge from './RiskBadge'

const TYPE_LABEL = {
  domain: 'Root domain',
  subdomain: 'Subdomain',
  ip: 'IP address',
  service: 'Open port',
}

export default function NodeDetailPanel({ node, onClose }) {
  const open = Boolean(node)
  const label = node ? TYPE_LABEL[node.type] ?? 'Node' : ''

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
        {node && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[var(--text-2)] text-[11px] uppercase tracking-widest">{label}</p>
              <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-0)] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mono text-[var(--text-0)] text-base mb-6 break-all">
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
      <p className="text-[var(--text-3)] text-[11px] uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  )
}

function SubdomainBody({ data }) {
  return (
    <>
      <Section label="Risk">
        <RiskBadge score={data.risk?.score ?? 'Low'} />
      </Section>
      {data.risk?.reasons?.length > 0 && (
        <Section label="Reasons">
          <ul className="space-y-1.5">
            {data.risk.reasons.map((r, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-1)' }}>
                <span style={{ color: 'var(--red)' }} className="shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {data.ips?.length > 0 && (
        <Section label="IPs">
          <div className="space-y-1">
            {data.ips.map(ip => (
              <p key={ip} className="mono text-[var(--text-2)] text-sm">{ip}</p>
            ))}
          </div>
        </Section>
      )}
      {data.ports?.length > 0 && (
        <Section label="Open ports">
          <div className="flex flex-wrap gap-1.5">
            {data.ports.map(p => (
              <span
                key={p}
                className="text-xs mono px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              >
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
      {s?.org && <Section label="Organization"><p className="text-sm" style={{ color: 'var(--text-1)' }}>{s.org}</p></Section>}
      {s?.os && <Section label="OS"><p className="text-sm" style={{ color: 'var(--text-1)' }}>{s.os}</p></Section>}
      {s?.hostnames?.length > 0 && (
        <Section label="Hostnames">
          <div className="space-y-1">
            {s.hostnames.map(h => (
              <p key={h} className="mono text-[var(--text-2)] text-xs break-all">{h}</p>
            ))}
          </div>
        </Section>
      )}
      {s?.ports?.length > 0 && (
        <Section label="Ports">
          <div className="flex flex-wrap gap-1.5">
            {s.ports.map(p => (
              <span
                key={p}
                className="text-xs mono px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              >
                {p}
              </span>
            ))}
          </div>
        </Section>
      )}
      {!s && <p className="text-[var(--text-2)] text-sm">No Shodan data available.</p>}
    </>
  )
}

function ServiceBody({ data }) {
  return (
    <>
      <Section label="Port"><p className="mono text-[var(--text-0)] text-base">{data.port}</p></Section>
      {data.dangerous && (
        <div
          className="mb-5 rounded p-3 text-xs"
          style={{
            border: '1px solid rgba(212,83,59,0.25)',
            background: 'rgba(212,83,59,0.05)',
            color: 'var(--red)',
          }}
        >
          Sensitive port — should not be publicly exposed.
        </div>
      )}
      {data.service?.product && (
        <Section label="Service">
          <p className="text-sm" style={{ color: 'var(--text-1)' }}>
            {data.service.product}{data.service.version ? ` ${data.service.version}` : ''}
          </p>
        </Section>
      )}
      {data.service?.banner && (
        <Section label="Banner">
          <pre
            className="mono text-[10px] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
            }}
          >
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
      <Section label="Total assets"><p className="text-2xl mono" style={{ color: 'var(--text-0)' }}>{data.totalAssets ?? '—'}</p></Section>
      <Section label="Breaches"><p className="text-2xl mono" style={{ color: 'var(--amber)' }}>{data.breaches ?? '—'}</p></Section>
    </>
  )
}
