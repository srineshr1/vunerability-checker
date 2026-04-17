const KEY = 'exposureiq_history'
const MAX = 5

export function saveToHistory(entry) {
  const existing = getHistory().filter(e => e.scanId !== entry.scanId)
  const updated = [entry, ...existing].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch {}
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
