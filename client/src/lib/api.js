async function request(path, options = {}) {
  const res = await fetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data
}

export function getResults(scanId) {
  return request(`/api/results/${scanId}`)
}

export function postScan(domain) {
  return request('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  })
}

export function postSuggest(assets) {
  return request('/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets }),
  })
}

export function postKillchain(scanId) {
  return request(`/api/killchain/${scanId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}
