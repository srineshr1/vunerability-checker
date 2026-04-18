import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import DotGrid from './components/DotGrid'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import KillChain from './pages/KillChain'
import Login from './pages/Login'
import { supabase } from './lib/supabase'
import { postEvent } from './lib/api'

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)', color: 'var(--text-0)' }}>
      <div
        className="w-4 h-4 rounded-full"
        style={{ border: '2px solid var(--text-3)', borderTopColor: 'var(--amber)', animation: 'spin 0.7s linear infinite' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Protected({ children, session, authReady }) {
  if (!authReady) {
    return <AuthLoading />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-base)', color: 'var(--text-0)', zIndex: 10 }}>
      <Navbar />
      {children}
    </div>
  )
}

function AppRoutes({ session, authReady }) {
  const location = useLocation()
  const showDotGrid = location.pathname !== '/'

  return (
    <>
      {showDotGrid ? <DotGrid /> : null}
      <Routes>
        <Route path="/login" element={<Login session={session} authReady={authReady} />} />
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Protected session={session} authReady={authReady}><Home /></Protected>} />
          <Route path="/dashboard/:scanId" element={<Protected session={session} authReady={authReady}><Dashboard /></Protected>} />
        <Route path="/graph/:scanId" element={<Protected session={session} authReady={authReady}><GraphView /></Protected>} />
        <Route path="/killchain/:scanId" element={<Protected session={session} authReady={authReady}><KillChain /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null)
      setAuthReady(true)

      if (event === 'SIGNED_IN') {
        postEvent('auth.login_success').catch(() => {})
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <AppRoutes session={session} authReady={authReady} />
    </BrowserRouter>
  )
}
