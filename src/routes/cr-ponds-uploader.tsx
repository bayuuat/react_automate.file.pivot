import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { createRoute } from '@tanstack/react-router'

type JobState = {
  id: string
  status: string | null
  processed: number
  total: number
  filename?: string
}

export function CRPondsUploader() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobState[]>([])
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const downloadRef = useRef<HTMLAnchorElement | null>(null)
  const pollTimer = useRef<number | null>(null)

  function handleFiles(selected: FileList | null) {
    setFiles(selected)
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    const dt = e.dataTransfer
    if (dt?.files && dt.files.length > 0) {
      handleFiles(dt.files)
      dt.clearData()
    }
  }

  function stopPolling() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current)
      pollTimer.current = null
    }
    setIsPolling(false)
  }

  async function pollAllStatuses(ids: string[]) {
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/imports/${encodeURIComponent(id)}`)
          if (!res.ok) throw new Error(`Gagal status ${id} (HTTP ${res.status})`)
          const data = await res.json()
          return {
            id,
            status: data.status ?? null,
            processed: typeof data.processed_rows === 'number' ? data.processed_rows : 0,
            total: typeof data.total_rows === 'number' ? data.total_rows : 0,
            filename: data.filename,
            error_message: data.error_message,
          }
        }),
      )
      setJobs((prev) =>
        prev.map((j) => {
          const found = results.find((r) => r.id === j.id)
          return found
            ? {
                id: j.id,
                status: found.status,
                processed: found.processed,
                total: found.total,
                filename: found.filename,
              }
            : j
        }),
      )
      const allDone = results.every((r) => r.status === 'completed' || r.status === 'failed')
      if (allDone) {
        stopPolling()
        const anyErr = results.find((r) => r.status === 'failed' && r.error_message)
        if (anyErr?.error_message) setError(anyErr.error_message)
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat status')
      stopPolling()
    }
  }

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setJobs([])

    if (!files || files.length === 0) {
      setError('Pilih minimal satu file Excel (.xlsx/.xls).')
      return
    }

    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('files', f, f.name))

    setIsUploading(true)
    try {
      const res = await fetch('/api/imports/excel', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Gagal memulai impor (HTTP ${res.status}).`)
      }

      const data = await res.json()
      const ids: string[] = data.job_ids || (data.job_id ? [data.job_id] : [])
      if (!ids.length) throw new Error('Respon tidak berisi job_id(s)')
      setJobs(ids.map((id) => ({ id, status: 'pending', processed: 0, total: 0 })))
      setIsPolling(true)
      pollTimer.current = window.setInterval(() => {
        pollAllStatuses(ids)
      }, 2000)
      await pollAllStatuses(ids)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh)] bg-gray-50 py-10 px-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-xl font-semibold text-gray-900">
              Import Excel ke Database (Go Service)
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Unggah satu file Excel (.xlsx) berisi hingga ratusan ribu baris. Server akan memproses
              secara asinkron dan menyimpannya ke database. Lihat progres di bawah.
            </p>
            <div className="mt-3">
              <Link
                to="/imports"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Lihat Daftar Imports
              </Link>
              <Link
                to="/sql"
                className="ml-2 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                SQL Explorer
              </Link>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-3">
              <label
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center hover:bg-gray-100"
              >
                <div className="text-sm font-medium text-gray-900">
                  Tarik & lepas file ke sini, atau klik untuk memilih
                </div>
                <div className="text-xs text-gray-500">Format didukung: .xlsx, .xls</div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={(e) => handleFiles(e.currentTarget.files)}
                  className="hidden"
                />
              </label>

              {files && files.length > 0 && (
                <div className="rounded-lg border border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                    {files.length} file terpilih
                  </div>
                  <ul className="max-h-56 overflow-auto divide-y divide-gray-100">
                    {Array.from(files).map((f) => (
                      <li key={f.name} className="flex items-center justify-between px-4 py-2">
                        <span className="truncate text-sm text-gray-800">{f.name}</span>
                        <span className="ml-3 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {(f.size / 1024).toFixed(1)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Status impor */}
            {jobs.length > 0 && (
              <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="mb-2 font-medium">Progres Jobs</div>
                <ul className="space-y-1">
                  {jobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-medium">{j.filename || j.id}</span>
                        <span className="ml-2 text-gray-700">({j.status ?? '-'})</span>
                      </div>
                      <div className="shrink-0">
                        {j.processed} / {j.total || '—'}
                      </div>
                    </li>
                  ))}
                </ul>
                {isPolling && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      onClick={stopPolling}
                    >
                      Hentikan Polling
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isUploading || !files || files.length === 0}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isUploading ? 'Mengunggah…' : 'Unggah Banyak & Mulai Impor'}
              </button>
              <button
                type="button"
                disabled={isUploading || !files || files.length === 0}
                onClick={() => {
                  stopPolling()
                  setFiles(null)
                  setJobs([])
                  setError(null)
                }}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Reset
              </button>
              <a ref={downloadRef} className="hidden" />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default (parentRoute: any) =>
  createRoute({
    path: '/cr-ponds/uploader',
    component: CRPondsUploader,
    getParentRoute: () => parentRoute,
  })


