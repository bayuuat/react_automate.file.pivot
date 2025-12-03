import { useState, useRef } from 'react'
import { createRoute } from '@tanstack/react-router'

export function CRPondsUploader() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState<string | null>(null)
  const downloadRef = useRef<HTMLAnchorElement | null>(null)

  function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) {
      setFiles(null)
      return
    }
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
      // Filter only excel files if needed
      handleFiles(dt.files)
      dt.clearData()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDownloadName(null)

    if (!files || files.length === 0) {
      setError('Pilih minimal satu file Excel.')
      return
    }

    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append('files', file, file.name)
    })

    setIsUploading(true)
    try {
      const res = await fetch('http://localhost:8000/api/cr-ponds/pivot', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          throw new Error(data.detail || 'Gagal memproses file.')
        } else {
          throw new Error(`Gagal memproses file. Status: ${res.status}`)
        }
      }

      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      let filename = match?.[1]
      if (!filename) {
        // Fallback penamaan: sesuaikan dengan jumlah file
        if (files.length > 1) {
          filename = 'cr-ponds-pivot-combined.xlsx'
        } else {
          const first = files[0]
          const base = first.name.replace(/\.(xlsx|xls)$/i, '')
          filename = `${base} - CR PONDS pivot by username.xlsx`
        }
      }
      setDownloadName(filename)

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
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
              Pivot CR PONDS
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Unggah satu atau beberapa file Excel. Server akan memproses dan
              menghasilkan file Excel (.xlsx). Jika lebih dari satu file, hasil
              akan digabung menyamping dalam satu Excel.
            </p>
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
                <div className="text-xs text-gray-500">
                  Format didukung: .xlsx, .xls
                </div>
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

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isUploading ? 'Memproses…' : 'Proses & Unduh Excel'}
              </button>
              <button
                type="button"
                disabled={isUploading || !files || files.length === 0}
                onClick={() => setFiles(null)}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Reset
              </button>
              {downloadName && (
                <span className="text-sm text-gray-700">
                  Siap diunduh: <strong>{downloadName}</strong>
                </span>
              )}
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


