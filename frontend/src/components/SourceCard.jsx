import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl border border-ink-700/60 bg-ink-900/40 overflow-hidden
                 hover:border-gold-400/20 transition-all duration-200 animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-ink-800/30 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gold-600/15 flex items-center justify-center shrink-0">
          <BookOpen size={12} className="text-gold-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gold-400">p.{source.page}</span>
            <span className="text-xs font-body text-ink-500 truncate">{source.filename}</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-ink-500 shrink-0" />
          : <ChevronDown size={14} className="text-ink-500 shrink-0" />
        }
      </button>

      {/* Snippet */}
      {expanded && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="rounded-lg bg-ink-950/60 border-l-2 border-gold-500/40 p-3">
            <p className="font-mono text-xs text-ink-300 leading-relaxed line-clamp-6">
              {source.snippet}
              {source.snippet.length >= 300 && (
                <span className="text-ink-600">…</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
