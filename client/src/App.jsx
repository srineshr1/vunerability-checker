import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import KillChain from './pages/KillChain'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard/:scanId" element={<Dashboard />} />
          <Route path="/graph/:scanId" element={<GraphView />} />
          <Route path="/killchain/:scanId" element={<KillChain />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
