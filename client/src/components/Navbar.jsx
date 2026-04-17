import { Shield, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="border-b border-[#21262d] bg-[#0d1117] px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
        >
          <Shield className="w-5 h-5 text-[#58a6ff] group-hover:text-[#79c0ff] transition-colors" strokeWidth={1.5} />
          <span className="text-white font-semibold text-base tracking-tight">ExposureIQ</span>
        </button>
        <p className="text-[#484f58] text-xs hidden sm:block">
          Exposure intelligence for any domain
        </p>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161b22] border border-[#30363d]">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-6 h-6 rounded-full border border-[#30363d]" />
              ) : (
                <User className="w-4 h-4 text-[#8b949e]" />
              )}
              <span className="text-sm font-medium text-[#e6edf3]">{user.name || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-[#8b949e] hover:text-[#f85149] transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-full text-sm font-semibold transition-colors shadow-lg shadow-[#238636]/10"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
}
