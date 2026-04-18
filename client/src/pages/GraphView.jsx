import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { ArrowLeft, Maximize2, Focus } from 'lucide-react'
import { getResults, postEvent } from '../lib/api'
import { buildGraph } from '../lib/buildGraph'
import NodeDetailPanel from '../components/NodeDetailPanel'

const LEGEND = [
  { color: '#e8a045', label: 'Domain' },
  { color: '#d4533b', label: 'High' },
  { color: '#c9933a', label: 'Medium' },
  { color: '#4a9e6b', label: 'Low' },
  { color: '#5a5550', label: 'IP' },
  { color: '#9a9590', label: 'Service' },
]

const TYPE_SIZE = { domain: 10, subdomain: 5, ip: 2.5, service: 2 }

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
    getResults(scanId).then(setScan).catch(e => setError(e.message))
  }, [scanId, scan])

  useEffect(() => {
    if (!scan || scan.status !== 'complete') return
    postEvent('view.graph', {
      scanId,
      domain: scan.domain,
      cacheAgeSeconds: scan.cacheAgeSeconds ?? null,
    }).catch(() => {})
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

  useEffect(() => {
    const fg = fgRef.current
    if (!fg || !graph.nodes.length) return
    const charge = fg.d3Force('charge')
    if (charge) charge.strength(-320).distanceMax(600)
    const link = fg.d3Force('link')
    if (link) {
      link.distance(l => {
        const t = l.target?.type ?? l.target
        if (t === 'service') return 24
        if (t === 'ip') return 60
        return 90
      })
      link.strength(0.35)
    }
    fg.d3ReheatSimulation()
    setTimeout(() => fg.zoomToFit(500, 80), 800)
  }, [graph])

  const zoomToFit = () => fgRef.current?.zoomToFit(500, 80)
  const focusNode = () => {
    const root = graph.nodes.find(n => n.type === 'domain')
    if (root && fgRef.current) {
      fgRef.current.centerAt(root.x ?? 0, root.y ?? 0, 500)
      fgRef.current.zoom(1.6, 500)
    }
  }

  if (error) return <Fallback>{error}</Fallback>
  if (!scan) return <Fallback spinner>Loading…</Fallback>
  if (!graph.nodes.length) return <Fallback>No scan data to visualize.</Fallback>

  return (
    <div className="relative h-[calc(100vh-52px)] w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(232,160,69,0.10) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, var(--bg-base) 85%)',
        }}
      />

      {/* Top-left controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => navigate(`/dashboard/${scanId}`, { state: { scanData: scan } })}
          className="btn btn-ghost"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div
          className="px-3 py-2 rounded text-xs mono"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text-0)',
          }}
        >
          {scan.domain}
        </div>
        <div
          className="px-3 py-2 rounded text-xs"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text-2)',
          }}
        >
          {graph.nodes.length} nodes · {graph.links.length} edges
        </div>
      </div>

      {/* Top-right zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button onClick={focusNode} className="btn btn-ghost" title="Focus root">
          <Focus className="w-4 h-4" />
        </button>
        <button onClick={zoomToFit} className="btn btn-ghost" title="Fit to view">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 z-10 rounded px-3 py-2.5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)' }}
      >
        <p className="text-[var(--text-3)] text-[10px] uppercase tracking-widest mb-1.5">Legend</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[var(--text-2)] text-[11px]">{l.label}</span>
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
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={4}
          nodeVal={n => TYPE_SIZE[n.type] ?? 3}
          nodeColor={n => {
            if (n.type === 'subdomain') return n.color ?? '#9a9590'
            if (n.type === 'ip') return '#5a5550'
            return n.color ?? '#9a9590'
          }}
          linkColor={() => 'rgba(154, 164, 178, 0.10)'}
          linkWidth={0.8}
          linkDirectionalParticles={0}
          cooldownTicks={200}
          warmupTicks={80}
          d3AlphaDecay={0.022}
          d3VelocityDecay={0.35}
          nodeCanvasObjectMode={node => {
            if (node === selectedNode) return 'before'
            return 'after'
          }}
          nodeCanvasObject={(node, ctx, scale) => {
            if (node === selectedNode) {
              const radius = Math.sqrt(TYPE_SIZE[node.type] ?? 3) * 4 + 6
              ctx.beginPath()
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
              ctx.fillStyle = 'rgba(232,160,69,0.10)'
              ctx.fill()
              ctx.strokeStyle = '#e8a045'
              ctx.lineWidth = 1.2 / scale
              ctx.stroke()
              return
            }
            if (node.type === 'ip' && scale < 2.8) return
            if (node.type === 'service' && scale < 2.2) return
            if (node.type === 'subdomain' && scale < 0.9) return

            const label = node.label
            if (!label) return
            const fontSize = Math.max(10 / scale, 3.5)
            ctx.font = `${fontSize}px 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            const radius = Math.sqrt(TYPE_SIZE[node.type] ?? 3) * 2.2
            ctx.fillStyle = 'rgba(9,9,12,0.85)'
            const metrics = ctx.measureText(label)
            const padX = 3 / scale
            const padY = 1.5 / scale
            ctx.fillRect(
              node.x - metrics.width / 2 - padX,
              node.y + radius + 1 - padY,
              metrics.width + padX * 2,
              fontSize + padY * 2,
            )
            ctx.fillStyle = node.type === 'domain' ? '#e8e4dc' : '#9a9590'
            ctx.fillText(label, node.x, node.y + radius + 2)
          }}
          onNodeClick={node => {
            setSelectedNode(node)
            if (fgRef.current) {
              fgRef.current.centerAt(node.x, node.y, 600)
              fgRef.current.zoom(3, 600)
            }
          }}
          onBackgroundClick={() => setSelectedNode(null)}
        />
      </div>

      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}

function Fallback({ children, spinner }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" style={{ color: 'var(--text-2)' }}>
      {spinner && (
        <div
          className="w-5 h-5 border-2 rounded-full"
          style={{ borderColor: 'var(--text-3)', borderTopColor: 'var(--amber)', animation: 'spin 0.7s linear infinite' }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p className="text-sm">{children}</p>
    </div>
  )
}
