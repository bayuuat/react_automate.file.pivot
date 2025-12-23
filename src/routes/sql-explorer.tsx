import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import { apiUrl } from '@/lib/api'

type QueryResponse = {
  columns: string[]
  items: any[]
  limit: number
  offset: number
}

const DEFAULT_SQL =
  'select id, row_index, data from staging_rows order by row_index asc'

export function SQLExplorer() {
  const [sqlText, setSqlText] = useState<string>(DEFAULT_SQL)
  const [saveName, setSaveName] = useState<string>("")
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<HTMLDivElement | null>(null)
  const runTokenRef = useRef<number>(0)

  const canRun = useMemo(() => sqlText.trim().toLowerCase().startsWith('select'), [sqlText])

  const fetchPage = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true)
      try {
        const res = await fetch(apiUrl('/query/sql'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sql: sqlText, limit: pageSize, offset: p * pageSize }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Gagal menjalankan query (HTTP ${res.status})`)
        }
        const data: QueryResponse = await res.json()
        setColumns(data.columns || [])
        if (append) {
          setRows((prev) => [...prev, ...(data.items || [])])
        } else {
          setRows(data.items || [])
        }
        setHasMore((data.items || []).length === pageSize)
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan')
        // Hentikan infinite scroll jika terjadi error, agar tidak fetch berkali-kali
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [sqlText],
  )

  const onRun = async () => {
    setError(null)
    setSaveInfo(null)
    setRows([])
    setColumns([])
    setPage(0)
    setHasMore(true)
    runTokenRef.current++
    await fetchPage(0, false)
  }

  const onSave = async () => {
    setError(null)
    setSaveInfo(null)
    if (!saveName.trim()) {
      setError("Nama query wajib diisi")
      return
    }
    try {
      const res = await fetch(apiUrl('/queries'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), sql: sqlText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Gagal menyimpan (HTTP ${res.status})`)
      }
      setSaveInfo("Query tersimpan.")
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan query")
    }
  }

  useEffect(() => {
    const node = observerRef.current
    if (!node) return
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !loading && hasMore) {
        const next = page + 1
        setPage(next)
        fetchPage(next, true)
      }
    })
    io.observe(node)
    return () => {
      io.disconnect()
    }
  }, [observerRef, loading, hasMore, page, fetchPage])

  return (
    <div className="min-h-[calc(100vh)] bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SQL Explorer</h1>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-emerald-700 hover:underline">
              ← Kembali
            </Link>
            <Link to="/imports" className="text-sm text-emerald-700 hover:underline">
              Daftar Imports
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-700 mb-2">
            Masukkan query SELECT (read-only). Limit per halaman: 100. Scroll ke bawah untuk memuat
            data berikutnya.
          </div>
          <div className="mb-2 flex items-center gap-2">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.currentTarget.value)}
              placeholder="Nama query (untuk disimpan)"
              className="w-64 rounded border border-gray-300 p-2 text-sm"
            />
            <button
              onClick={onSave}
              disabled={!saveName.trim() || !canRun || loading}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Simpan
            </button>
            <Link
              to="/queries"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Lihat Query Tersimpan
            </Link>
          </div>
          <textarea
            value={sqlText}
            onChange={(e) => setSqlText(e.currentTarget.value)}
            rows={5}
            className="w-full rounded border border-gray-300 p-2 font-mono text-sm"
            placeholder="SELECT ..."
          />
          {error && <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          {saveInfo && <div className="mt-2 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{saveInfo}</div>}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onRun}
              disabled={!canRun || loading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Menjalankan…' : 'Jalankan'}
            </button>
            <button
              onClick={() => {
                setSqlText(DEFAULT_SQL)
              }}
              disabled={loading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Reset contoh
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(1, columns.length)}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      {loading ? 'Memuat…' : 'Belum ada data'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={idx}>
                      {columns.map((c) => (
                        <td key={c} className="px-4 py-2 text-sm text-gray-800 align-top">
                          {typeof r[c] === 'object'
                            ? JSON.stringify(r[c], null, 2)
                            : String(r[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div ref={observerRef} className="h-10 w-full" />
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
    path: '/sql',
    component: SQLExplorer,
    getParentRoute: () => parentRoute,
  })


