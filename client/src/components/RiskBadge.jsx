const MAP = {
  High:     { label: 'CRITICAL', color: 'var(--red)',    bg: 'var(--red-soft)',    border: 'rgba(212,83,59,0.3)' },
  Critical: { label: 'CRITICAL', color: 'var(--red)',    bg: 'var(--red-soft)',    border: 'rgba(212,83,59,0.3)' },
  Medium:   { label: 'MEDIUM',   color: 'var(--yellow)', bg: 'var(--yellow-soft)', border: 'rgba(201,147,58,0.3)' },
  Low:      { label: 'LOW',      color: 'var(--green)',  bg: 'var(--green-soft)',  border: 'rgba(74,158,107,0.25)' },
}

export default function RiskBadge({ score, size = 'sm' }) {
  const c = MAP[score] || MAP.Low
  const pad = size === 'lg' ? 'px-2.5 py-1 text-[10px]' : 'px-2 py-0.5 text-[9px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border mono font-semibold tracking-[0.1em] ${pad}`}
      style={{
        color: c.color,
        background: c.bg,
        borderColor: c.border,
      }}
    >
      {c.label}
    </span>
  )
}
