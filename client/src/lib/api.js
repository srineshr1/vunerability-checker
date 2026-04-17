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

export function postScan(domain, userEmail) {
  return request('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, userEmail }),
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

export function postAuthLogin(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function postAuthRegister(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function postAuthGoogle(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
}

export function getRemoteHistory(email) {
  return request(`/api/history/${email}`)
}
