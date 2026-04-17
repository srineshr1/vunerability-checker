const RISK_NODE_COLORS = {
  High: '#f85149',
  Medium: '#d29922',
  Low: '#3fb950',
}

const DANGEROUS_PORTS = new Set([22, 23, 3306, 5432, 27017, 6379, 21, 3389])

const RISK_RANK = { High: 3, Medium: 2, Low: 1 }

export function buildGraph(scan) {
  const results = scan?.results
  if (!results) return { nodes: [], links: [] }

  const domain = scan.domain ?? 'root'
  let subdomains = results.subdomains ?? []

  if (subdomains.length > 80) {
    subdomains = [...subdomains]
      .sort((a, b) => (RISK_RANK[b.risk?.score] ?? 0) - (RISK_RANK[a.risk?.score] ?? 0))
      .slice(0, 80)
  }

  const nodes = []
  const links = []
  const seen = new Set()

  const addNode = (node) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    nodes.push(node)
  }

  addNode({
    id: `domain:${domain}`,
    label: domain,
    type: 'domain',
    color: '#58a6ff',
    val: 14,
    raw: { domain, totalAssets: results.resolvedSubdomains, breaches: results.hibp?.breachCount },
  })

  for (const sub of subdomains) {
    const subId = `sub:${sub.subdomain}`
    const score = sub.risk?.score ?? 'Low'
    addNode({
      id: subId,
      label: sub.subdomain.replace(`.${domain}`, '') || sub.subdomain,
      fullLabel: sub.subdomain,
      type: 'subdomain',
      color: RISK_NODE_COLORS[score],
      val: score === 'High' ? 8 : score === 'Medium' ? 6 : 4,
      raw: sub,
    })
    links.push({ source: `domain:${domain}`, target: subId, type: 'contains' })

    for (const ip of sub.ips ?? []) {
      const ipId = `ip:${ip}`
      addNode({
        id: ipId,
        label: ip,
        type: 'ip',
        color: '#8b949e',
        val: 4,
        raw: { ip, shodan: results.shodan?.[ip] },
      })
      links.push({ source: subId, target: ipId, type: 'resolves_to' })

      const shodanData = results.shodan?.[ip]
      const ports = shodanData?.ports ?? []
      for (const port of ports) {
        const portId = `port:${ip}:${port}`
        const dangerous = DANGEROUS_PORTS.has(port)
        const service = shodanData?.services?.find((s) => s.port === port)
        addNode({
          id: portId,
          label: `:${port}`,
          fullLabel: service?.product ? `${port} ${service.product}` : `port ${port}`,
          type: 'service',
          color: dangerous ? '#f85149' : '#a371f7',
          val: dangerous ? 5 : 3,
          raw: { ip, port, dangerous, service },
        })
        links.push({ source: ipId, target: portId, type: 'exposes' })
      }
    }
  }

  return { nodes, links }
}
