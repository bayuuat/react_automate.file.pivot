import { useEffect, useState } from 'react'
import { Link, createRoute, useParams } from '@tanstack/react-router'

type Job = {
  id: string
  filename: string
  status: string
  total_rows: number
  processed_rows: number
  error_message?: string
  created_at?: string
  updated_at?: string
}

type RowItem = {
  id: number
  import_id: string
  row_index: number
  data: any
  created_at?: string
}

export function ImportDetail() {
  const { id } = useParams({ from: '/imports/$id' }) as { id: string }
  const [job, setJob] = useState<Job | null>(null)
  const [rows, setRows] = useState<RowItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 50
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadJob() {
    setError(null)
    try {
      const res = await fetch(`/api/imports/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`Gagal memuat job (HTTP ${res.status})`)
      const data = await res.json()
      setJob(data)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    }
  }

  async function loadRows() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/imports/${encodeURIComponent(id)}/rows?limit=${pageSize}&offset=${page * pageSize}`,
      )
      if (!res.ok) throw new Error(`Gagal memuat baris (HTTP ${res.status})`)
      const data = await res.json()
      setRows(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJob()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-[calc(100vh)] bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Detail Import</h1>
          <div className="flex items-center gap-3">
            <Link to="/imports" className="text-sm text-emerald-700 hover:underline">
              ← Kembali ke daftar
            </Link>
            <Link to="/" className="text-sm text-emerald-700 hover:underline">
              + Import Baru
            </Link>
          </div>
        </div>

        {job && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <div className="text-sm text-gray-500">Job ID</div>
                <div className="text-sm font-medium">{job.id}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Filename</div>
                <div className="text-sm font-medium">{job.filename}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-sm font-medium">{job.status}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Progress</div>
                <div className="text-sm font-medium">
                  {job.processed_rows} / {job.total_rows}
                </div>
              </div>
              {job.error_message && (
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Error</div>
                  <div className="text-sm text-red-600">{job.error_message}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {error && <div className="m-4 rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                      Memuat…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm text-gray-800">{r.row_index}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        <pre className="whitespace-pre-wrap break-words text-xs text-gray-700">
                          {typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)}
                        </pre>
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
    path: '/imports/$id',
    component: ImportDetail,
    getParentRoute: () => parentRoute,
  })


