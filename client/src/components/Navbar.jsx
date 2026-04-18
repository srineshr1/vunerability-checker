import { LogOut, Shield } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { postEvent } from '../lib/api'

export default function Navbar({ domain, right }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const logout = async () => {
    postEvent('auth.logout').catch(() => {})
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 h-13 px-6 flex items-center justify-between navbar">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 group"
      >
        <span
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ background: 'var(--amber)', boxShadow: '0 0 16px -4px var(--amber-glow)' }}
        >
          <Shield className="w-3.5 h-3.5 text-[#0a0804]" strokeWidth={2.5} />
        </span>
        <span className="text-[0.9rem] font-semibold tracking-tight" style={{ color: 'var(--text-0)' }}>
          ExposureIQ
        </span>
      </button>

      {domain && !isHome && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--amber)', boxShadow: '0 0 8px var(--amber-glow)' }}
          />
          <span className="mono text-[12px] text-[var(--text-1)] tracking-tight">{domain}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {right}
        <button
          onClick={logout}
          title="Sign out"
          className="text-[var(--text-3)] hover:text-[var(--text-0)] transition-colors p-1"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
