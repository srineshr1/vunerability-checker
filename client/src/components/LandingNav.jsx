import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { postEvent } from '../lib/api'

export default function LandingNav({ session }) {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const signOut = async (e) => {
    e.preventDefault()
    postEvent('auth.logout').catch(() => {})
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`} id="nav">
      <a href="#" className="brand" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        <span className="brand-mark"><span /></span>
        <span className="brand-txt">Exposure<em>IQ</em></span>
      </a>
      <div className="nav-links">
        <a href="#features">Features</a>
        <a href="#how">How it Works</a>
        <a href="#cta">Intel</a>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {session ? (
          <>
            <button
              type="button"
              className="nav-cta"
              onClick={() => navigate('/home')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className="nav-cta"
              onClick={signOut}
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="nav-cta"
              onClick={() => navigate('/login')}
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            >
              Log In
            </button>
            <a href="#cta" className="nav-cta">Request Access</a>
          </>
        )}
      </div>
    </nav>
  )
}
