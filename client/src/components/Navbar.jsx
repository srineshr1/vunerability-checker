import { Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  return (
    <header className="border-b border-[#21262d] bg-[#0d1117] px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 group"
      >
        <Shield className="w-5 h-5 text-[#58a6ff] group-hover:text-[#79c0ff] transition-colors" strokeWidth={1.5} />
        <span className="text-white font-semibold text-base tracking-tight">ExposureIQ</span>
      </button>
      <p className="text-[#484f58] text-xs hidden sm:block">
        Know your exposure before attackers do
      </p>
    </header>
  )
}
