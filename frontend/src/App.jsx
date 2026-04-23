import { useState, useCallback } from 'react'
import axios from 'axios'
import { BookOpen, Github, Cpu } from 'lucide-react'
import UploadBox from './components/UploadBox'
import ChatWindow from './components/ChatWindow'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([])

  const handleUploadSuccess = useCallback((data) => {
    setUploadedFiles(prev => [...prev, data])
  }, [])

  const handleClear = useCallback(async () => {
    try {
      await axios.delete(`${API_BASE}/clear?collection_name=default`)
    } catch (e) {
      // silently fail — user-facing UX still clears
    }
    setUploadedFiles([])
  }, [])

  const hasDocuments = uploadedFiles.length > 0

  return (
    <div className="min-h-screen flex flex-col grain">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-5"
             style={{ background: 'radial-gradient(circle, #d4a843, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-5"
             style={{ background: 'radial-gradient(circle, #c49a35, transparent)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-ink-800 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/15 border border-gold-400/30 flex items-center justify-center">
              <BookOpen size={18} className="text-gold-400" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg text-ink-100 leading-none">
                Doc<span className="text-gradient">Mind</span>
              </h1>
              <p className="font-body text-xs text-ink-600 leading-none mt-0.5">RAG-powered document intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-900/30 border border-emerald-700/40 px-3 py-1">
              <Cpu size={11} className="text-emerald-400" />
              <span className="font-mono text-xs text-emerald-400">ChromaDB · GPT-3.5</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-500 hover:text-ink-200 transition-colors"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-full" style={{ minHeight: 'calc(100vh - 140px)' }}>

          {/* Left panel — Upload */}
          <aside className="lg:w-80 shrink-0">
            <div className="glass rounded-2xl p-5 h-full">
              <div className="mb-5">
                <h2 className="font-display font-semibold text-ink-100">Documents</h2>
                <p className="font-body text-xs text-ink-500 mt-0.5">
                  Upload PDFs to query across them
                </p>
              </div>
              <UploadBox
                onUploadSuccess={handleUploadSuccess}
                uploadedFiles={uploadedFiles}
                onClear={handleClear}
              />

              {/* How it works */}
              <div className="mt-6 pt-5 border-t border-ink-800">
                <p className="text-xs font-body text-ink-600 uppercase tracking-widest mb-3">How it works</p>
                <ol className="space-y-2.5">
                  {[
                    'PDF is parsed and split into chunks',
                    'Chunks are embedded via OpenAI',
                    'Stored in ChromaDB vector store',
                    'Your question retrieves top-3 chunks',
                    'GPT-3.5 answers using only those chunks',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs text-gold-500/70 w-4 shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-body text-xs text-ink-500 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </aside>

          {/* Right panel — Chat */}
          <section className="flex-1 min-w-0">
            <div className="glass rounded-2xl p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-display font-semibold text-ink-100">Ask your document</h2>
                  <p className="font-body text-xs text-ink-500 mt-0.5">
                    {hasDocuments
                      ? `${uploadedFiles.length} document${uploadedFiles.length > 1 ? 's' : ''} loaded — ask anything`
                      : 'Upload a PDF to get started'
                    }
                  </p>
                </div>
                {hasDocuments && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-900/20 border border-emerald-700/30 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-body text-xs text-emerald-400">Ready</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <ChatWindow hasDocuments={hasDocuments} />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-ink-800 py-4 text-center">
        <p className="font-body text-xs text-ink-700">
          Built with LangChain · ChromaDB · FastAPI · React — RAG Document Q&A
        </p>
      </footer>
    </div>
  )
}
