import { useEffect, useState } from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import { apiUrl } from '@/lib/api'

type ImportJob = {
  id: string
  filename: string
  status: string
  total_rows: number
  processed_rows: number
  error_message?: string
  created_at?: string
  updated_at?: string
}

export function ImportsList() {
  const [items, setItems] = useState<ImportJob[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 20
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl(`/imports?limit=${pageSize}&offset=${page * pageSize}`))
      if (!res.ok) throw new Error(`Gagal memuat daftar (HTTP ${res.status})`)
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-[calc(100vh)] bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Daftar Import</h1>
          <Link to="/" className="text-sm text-emerald-700 hover:underline">
            + Mulai Import Baru
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {error && <div className="m-4 rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Memuat…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  items.map((j) => (
                    <tr key={j.id}>
                      <td className="px-4 py-2 text-sm text-gray-800">{j.filename}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">{j.status}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {j.processed_rows} / {j.total_rows}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{j.created_at ?? '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          to="/imports/$id"
                          params={{ id: j.id }}
                          className="text-sm text-emerald-700 hover:underline"
                        >
                          Lihat detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-gray-600">
              Halaman {page + 1} / {totalPages} • Total {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                Prev
              </button>
              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default (parentRoute: any) =>
  createRoute({
    path: '/imports',
    component: ImportsList,
    getParentRoute: () => parentRoute,
  })


