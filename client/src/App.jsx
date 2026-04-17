import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import KillChain from './pages/KillChain'
import { AuthProvider } from './lib/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard/:scanId" element={<Dashboard />} />
            <Route path="/graph/:scanId" element={<GraphView />} />
            <Route path="/killchain/:scanId" element={<KillChain />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
