const styles = {
  High:   'bg-[#3d1a1a] text-[#f85149] border border-[#f85149]/30',
  Medium: 'bg-[#3d2e0a] text-[#d29922] border border-[#d29922]/30',
  Low:    'bg-[#0d2a14] text-[#3fb950] border border-[#3fb950]/30',
}

export default function RiskBadge({ score }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${styles[score] || styles.Low}`}>
      {score}
    </span>
  )
}
