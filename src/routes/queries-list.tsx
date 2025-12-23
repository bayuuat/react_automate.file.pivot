import { useEffect, useState } from 'react'
import { Link, createRoute } from '@tanstack/react-router'

type SavedQuery = {
  id: number
  name: string
  sql: string
  updated_at?: string
}

export function QueriesList() {
  const [items, setItems] = useState<SavedQuery[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 20
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/queries?limit=${pageSize}&offset=${page * pageSize}`)
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

  const onDelete = async (id: number) => {
    if (!confirm('Hapus query ini?')) return
    try {
      const res = await fetch(`/api/queries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Gagal menghapus (HTTP ${res.status})`)
      await load()
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus')
    }
  }

  return (
    <div className="min-h-[calc(100vh)] bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Query Tersimpan</h1>
          <div className="flex items-center gap-3">
            <Link to="/sql" className="text-sm text-emerald-700 hover:underline">
              + Buat/Run Query
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {error && <div className="m-4 rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Nama</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Diubah</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                      Memuat…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                      Belum ada data
                    </td>
                  </tr>
                ) : (
                  items.map((q) => (
                    <tr key={q.id}>
                      <td className="px-4 py-2 text-sm text-gray-800">{q.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{q.updated_at ?? '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          to="/queries/$id"
                          params={{ id: String(q.id) }}
                          className="mr-3 text-sm text-emerald-700 hover:underline"
                        >
                          Buka
                        </Link>
                        <button
                          onClick={() => onDelete(q.id)}
                          className="text-sm text-red-700 hover:underline"
                        >
                          Hapus
                        </button>
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
    path: '/queries',
    component: QueriesList,
    getParentRoute: () => parentRoute,
  })


