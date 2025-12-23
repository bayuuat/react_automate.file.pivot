export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (API_BASE) return `${API_BASE}${p}`
  // fallback dev/proxy: keep /api prefix so Vite proxy works
  return `/api${p}`
}


