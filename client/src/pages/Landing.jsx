import { useNavigate } from 'react-router-dom'
import { Shield, Sparkles, Zap, ShieldAlert, Cpu } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-[calc(100vh-49px)] items-center justify-center bg-[#0d1117] px-4 py-20 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10 text-center">
        <div className="space-y-12">
          <div className="space-y-8 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 text-sm font-semibold text-[#58a6ff] mb-4">
              <Shield className="h-4 w-4" />
              ExposureIQ — Enterprise-Grade Attack Surface Intelligence
            </div>

            <div className="space-y-6 max-w-4xl mx-auto">
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05]">
                Visibility that outpaces the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] via-[#79c0ff] to-[#a371f7]">adversary.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed text-[#8b949e]">
                Identify, map, and remediate your external digital footprint. Gain real-time insights into vulnerabilities before they become liabilities.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#238636] hover:bg-[#2ea043] px-10 py-4 text-sm font-bold text-white transition-all hover:scale-105 shadow-xl shadow-[#238636]/20 active:scale-95"
            >
              Sign In to Console
            </button>
            <button
              onClick={() => navigate('/home')}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-[#30363d] bg-transparent hover:bg-[#161b22] px-10 py-4 text-sm font-bold text-[#8b949e] transition-all hover:text-white hover:border-[#58a6ff] active:scale-95"
            >
              Scan Domain as Guest
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 mt-16 max-w-5xl mx-auto fade-in" style={{ animationDelay: '0.2s' }}>
            {[
              { icon: Zap, title: 'Instant Recon', desc: 'Scan subdomains and DNS records in seconds.' },
              { icon: ShieldAlert, title: 'Breach Audit', desc: 'Check for leaked credentials and data exposures.' },
              { icon: Cpu, title: 'AI Remediate', desc: 'Get automated fixes for high-risk findings.' }
            ].map((item, i) => (
              <div key={i} className="group p-6 rounded-3xl border border-[#21262d] bg-[#161b22]/40 backdrop-blur-sm text-left transition-all hover:bg-[#161b22] hover:border-[#30363d] hover:-translate-y-1">
                <div className="p-3 w-fit rounded-2xl bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors mb-5">
                  <item.icon className="h-6 w-6 text-[#58a6ff]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-6 text-[#8b949e]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-24 text-[10px] uppercase font-bold tracking-[0.4em] text-[#484f58] fade-in" style={{ animationDelay: '0.3s' }}>
        Designed for Modern Security Teams · Powered by Claude AI
      </footer>
    </div>
  )
}
