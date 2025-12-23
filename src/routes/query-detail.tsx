import { useEffect, useRef, useState } from 'react'
import { Link, createRoute, useParams } from '@tanstack/react-router'
import { apiUrl } from '@/lib/api'

type SavedQuery = { id: number; name: string; sql: string }
type RunResp = { columns: string[]; items: any[]; limit: number; offset: number }

export function QueryDetail() {
  const { id } = useParams({ from: '/queries/$id' as any }) as { id: string }
  const [query, setQuery] = useState<SavedQuery | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  async function loadQuery() {
    setError(null)
    const res = await fetch(apiUrl(`/queries/${encodeURIComponent(id)}`))
    if (!res.ok) {
      setError(`Gagal memuat query (HTTP ${res.status})`)
      return
    }
    const data = await res.json()
    setQuery(data)
  }

  async function runPage(p: number, append: boolean) {
    setLoading(true)
    try {
      const res = await fetch(apiUrl(`/queries/${encodeURIComponent(id)}/run`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: pageSize, offset: p * pageSize }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Gagal menjalankan query (HTTP ${res.status})`)
      }
      const data: RunResp = await res.json()
      setColumns(data.columns || [])
      if (append) setRows((prev) => [...prev, ...(data.items || [])])
      else setRows(data.items || [])
      setHasMore((data.items || []).length === pageSize)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    if (!query) return
    setError(null)
    const res = await fetch(apiUrl(`/queries/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: query.name, sql: query.sql }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || `Gagal menyimpan (HTTP ${res.status})`)
    }
  }

  useEffect(() => {
    loadQuery()
    setRows([])
    setColumns([])
    setPage(0)
    setHasMore(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    runPage(page, page > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !loading && hasMore) {
        setPage((p) => p + 1)
      }
    })
    io.observe(node)
    return () => io.disconnect()
  }, [loading, hasMore])

  return (
    <div className="min-h-[calc(100vh)] bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Detail Query</h1>
          <div className="flex items-center gap-3">
            <Link to="/queries" className="text-sm text-emerald-700 hover:underline">
              ← Kembali ke daftar
            </Link>
            <Link to="/sql" className="text-sm text-emerald-700 hover:underline">
              SQL Explorer
            </Link>
          </div>
        </div>
        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {query && (
          <div className="rounded border border-gray-200 bg-white p-4 space-y-2">
            <input
              className="w-full rounded border border-gray-300 p-2 text-sm"
              value={query.name}
              onChange={(e) => setQuery({ ...(query as SavedQuery), name: e.currentTarget.value })}
            />
            <textarea
              className="w-full rounded border border-gray-300 p-2 font-mono text-sm"
              rows={5}
              value={query.sql}
              onChange={(e) => setQuery({ ...(query as SavedQuery), sql: e.currentTarget.value })}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRows([])
                  setColumns([])
                  setPage(0)
                  setHasMore(true)
                  runPage(0, false)
                }}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Jalankan
              </button>
              <button
                onClick={onSave}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, columns.length)} className="px-4 py-6 text-center text-gray-500">
                      {loading ? 'Memuat…' : 'Belum ada data'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={idx}>
                      {columns.map((c) => (
                        <td key={c} className="px-4 py-2 text-sm text-gray-800 align-top">
                          {typeof r[c] === 'object' ? JSON.stringify(r[c], null, 2) : String(r[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div ref={sentinelRef} className="h-10 w-full" />
          {!hasMore && rows.length > 0 && (
            <div className="px-4 py-3 text-center text-sm text-gray-500">Semua data sudah dimuat</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default (parentRoute: any) =>
  createRoute({
    path: '/queries/$id',
    component: QueryDetail,
    getParentRoute: () => parentRoute,
  })


