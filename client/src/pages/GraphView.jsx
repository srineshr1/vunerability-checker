import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { ArrowLeft } from 'lucide-react'
import { getResults } from '../lib/api'
import { buildGraph } from '../lib/buildGraph'
import NodeDetailPanel from '../components/NodeDetailPanel'

const LEGEND = [
  { color: '#58a6ff', label: 'Domain' },
  { color: '#f85149', label: 'High Risk' },
  { color: '#d29922', label: 'Medium' },
  { color: '#3fb950', label: 'Low' },
  { color: '#8b949e', label: 'IP' },
  { color: '#a371f7', label: 'Service' },
]

export default function GraphView() {
  const { scanId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const fgRef = useRef(null)
  const containerRef = useRef(null)

  const [scan, setScan] = useState(location.state?.scanData ?? null)
  const [error, setError] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    if (scan) return
    getResults(scanId).then(setScan).catch((e) => setError(e.message))
  }, [scanId, scan])

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const graph = useMemo(() => buildGraph(scan), [scan])

  if (error) return <FallbackMessage>{error}</FallbackMessage>
  if (!scan) return <FallbackMessage spinner>Loading scan…</FallbackMessage>
  if (!graph.nodes.length) return <FallbackMessage>No scan data to visualize.</FallbackMessage>

  return (
    <div className="relative h-[calc(100vh-49px)] w-full bg-[#0d1117] overflow-hidden">
      {/* Top controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate(`/dashboard/${scanId}`, { state: { scanData: scan } })}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#161b22]/90 hover:bg-[#21262d] border border-[#30363d] text-[#e6edf3] rounded-lg text-sm transition-colors backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div className="px-3 py-2 bg-[#161b22]/90 border border-[#30363d] rounded-lg text-sm font-mono text-[#79c0ff] backdrop-blur">
          {scan.domain}
        </div>
        <div className="px-3 py-2 bg-[#161b22]/90 border border-[#30363d] rounded-lg text-xs text-[#8b949e] backdrop-blur">
          {graph.nodes.length} nodes · {graph.links.length} edges
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#161b22]/90 border border-[#30363d] rounded-lg p-3 backdrop-blur">
        <p className="text-[#8b949e] text-xs uppercase tracking-wider mb-2 font-semibold">Legend</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
              <span className="text-[#e6edf3] text-xs">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="w-full h-full">
        <ForceGraph2D
          ref={fgRef}
          graphData={graph}
          width={size.width}
          height={size.height}
          backgroundColor="#0d1117"
          nodeRelSize={5}
          nodeVal={(n) => n.val ?? 4}
          linkColor={() => 'rgba(139, 148, 158, 0.25)'}
          linkWidth={1}
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          warmupTicks={40}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, scale) => {
            if (scale < 1.4 && node.type === 'service') return
            const label = node.label
            const fontSize = Math.max(10 / scale, 3)
            ctx.font = `${fontSize}px ui-monospace, Menlo, Consolas, monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = '#e6edf3'
            const radius = Math.sqrt(node.val ?? 4) * 1.6
            ctx.fillText(label, node.x, node.y + radius + 2)
          }}
          onNodeClick={(node) => {
            setSelectedNode(node)
            if (fgRef.current) {
              fgRef.current.centerAt(node.x, node.y, 600)
              fgRef.current.zoom(2.4, 600)
            }
          }}
          onBackgroundClick={() => setSelectedNode(null)}
        />
      </div>

      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}

function FallbackMessage({ children, spinner }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-49px)] gap-3 text-[#8b949e]">
      {spinner && <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />}
      <p>{children}</p>
    </div>
  )
}
