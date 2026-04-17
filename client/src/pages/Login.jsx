import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react'
import { postAuthLogin, postAuthRegister, postAuthGoogle } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const [mode, setMode] = useState('login')
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [googleError, setGoogleError] = useState('')
  const [googleReady, setGoogleReady] = useState(false)
  const navigate = useNavigate()

  const isRegister = mode === 'register'

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID missing')
      return
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval)
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setLoading(true)
            setGoogleError('')
            try {
              const result = await postAuthGoogle(response.credential)
              if (result.user) {
                login(result.user)
              }
              setMessage(result.message ?? 'Authentication successful.')
              setTimeout(() => navigate('/home'), 1200)
            } catch (err) {
              setGoogleError(err.message)
            } finally {
              setLoading(false)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        })

        if (document.getElementById('googleBtnContainer')) {
          window.google.accounts.id.renderButton(
            document.getElementById('googleBtnContainer'),
            { theme: 'outline', size: 'large', shape: 'circle', width: '320', logo_alignment: 'center' }
          )
        }
        setGoogleReady(true)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const payload = { email, password, name: isRegister ? name : undefined }
      const result = isRegister
        ? await postAuthRegister(payload)
        : await postAuthLogin(payload)

      if (result.user) {
        login(result.user)
      }
      setMessage(result.message ?? 'Welcome back.')
      setTimeout(() => navigate('/home'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-49px)] items-center justify-center px-4 py-20 bg-[#0d1117] relative overflow-hidden">
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[500px] h-[300px] bg-green-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#238636]/10 border border-[#238636]/20 mb-2">
            <ShieldCheck className="w-8 h-8 text-[#238636]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isRegister ? 'Access Intelligence' : 'Welcome to ExposureIQ'}
          </h1>
          <p className="text-[#8b949e]">
            {isRegister ? 'Create an account to save your scan data' : 'Sign in to access your digital footprint audit'}
          </p>
        </div>

        <div className="p-8 rounded-[2rem] border border-[#30363d] bg-[#161b22]/50 backdrop-blur-md shadow-2xl space-y-6">
          <div className="flex gap-1 p-1 bg-[#0d1117] rounded-full border border-[#30363d]">
            {['login', 'register'].map((type) => (
              <button
                key={type}
                onClick={() => setMode(type)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${mode === type ? 'bg-[#21262d] text-white shadow-sm' : 'text-[#484f58] hover:text-[#8b949e]'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#8b949e] tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58] transition-colors group-focus-within:text-[#58a6ff]" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-[#484f58] outline-none transition-all"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#8b949e] tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58] transition-colors group-focus-within:text-[#58a6ff]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-[#484f58] outline-none transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#8b949e] tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58] transition-colors group-focus-within:text-[#58a6ff]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-[#484f58] outline-none transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 animate-in fade-in">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-500 animate-in fade-in">
                <ShieldCheck className="w-4 h-4" />
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#238636] hover:bg-[#2ea043] text-white py-4 rounded-2xl text-sm font-bold shadow-lg shadow-[#238636]/10 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isRegister ? 'Create Secure Account' : 'Authenticate Credentials'}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#30363d]"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest leading-none">
                <span className="bg-[#161b22] px-3 text-[#484f58]">Secure Gateway</span>
              </div>
            </div>

            <div className="space-y-3">
              {!googleReady && !googleError && (
                <div className="text-center text-[10px] text-[#484f58] animate-pulse">
                  Initializing Google Auth...
                </div>
              )}
              <div className="flex justify-center min-h-[44px]" id="googleBtnContainer" />
            </div>
          </form>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest text-[#484f58] font-bold">
          Encrypted Authentication System
        </p>
      </div>
    </div>
  )
}
