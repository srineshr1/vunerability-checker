import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const headers = {
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const res = await fetch(url, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data
}

export function getResults(scanId) {
  return request(`/api/results/${scanId}`)
}

export function postScan(domain, { forceRescan = false } = {}) {
  return request('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, forceRescan }),
  })
}

export function postSuggest(assets, scanId = null) {
  return request('/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets, scanId }),
  })
}

export function postKillchain(scanId) {
  return request(`/api/killchain/${scanId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getRecentScans(limit = 5) {
  return request(`/api/scans/recent?limit=${limit}`)
}

export function postEvent(action, metadata = {}) {
  return request('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, metadata }),
  })
}