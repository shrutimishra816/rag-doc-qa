import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'

// In dev: Vite proxy forwards /api → localhost:8000
// In prod: VITE_API_URL = https://your-render-url.onrender.com
const API_BASE = import.meta.env.VITE_API_URL || ''

export default function UploadBox({ onUploadSuccess, uploadedFiles, onClear }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleUpload = useCallback(async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File is too large. Maximum size is 20MB.')
      return
    }

    setError(null)
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUploadSuccess(response.data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Is the backend running?'
      setError(msg)
    } finally {
      setIsUploading(false)
    }
  }, [onUploadSuccess])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleUpload(file)
  }, [handleUpload])

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onFileChange = (e) => handleUpload(e.target.files[0])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center
          transition-all duration-300
          ${isDragging
            ? 'drop-zone-active'
            : 'border-ink-700 hover:border-gold-400/40 hover:bg-ink-900/30'
          }
          ${isUploading ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <Loader2 size={36} className="text-gold-400 animate-spin" />
              <p className="font-body text-ink-300 text-sm">Processing your document…</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center">
                <Upload size={24} className="text-gold-400" />
              </div>
              <div>
                <p className="font-body font-medium text-ink-200">
                  Drop a PDF here, or <span className="text-gold-400 underline underline-offset-2">browse</span>
                </p>
                <p className="font-body text-ink-500 text-xs mt-1">PDF only · max 20MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-900/20 border border-red-800/40 p-3 animate-fade-in">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-sm font-body">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-body text-ink-500 uppercase tracking-widest">Loaded documents</p>
            <button
              onClick={onClear}
              className="text-xs text-ink-500 hover:text-red-400 transition-colors font-body"
            >
              Clear all
            </button>
          </div>
          {uploadedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl glass-light p-3 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-8 h-8 rounded-lg bg-gold-600/20 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-medium text-ink-200 truncate">{f.filename}</p>
                <p className="text-xs font-body text-ink-500">{f.page_count} pages · {f.chunk_count} chunks</p>
              </div>
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}