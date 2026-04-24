import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Bot, User, Loader2, FileQuestion, Sparkles } from 'lucide-react'
import SourceCard from './SourceCard'

const API_BASE = import.meta.env.VITE_API_URL || ''

const SUGGESTED_QUESTIONS = [
  'What is the main topic of this document?',
  'Summarize the key findings.',
  'What conclusions are drawn?',
  'What methodology is used?',
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="w-8 h-8 rounded-full bg-gold-600/20 border border-gold-500/30 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-gold-400" />
      </div>
      <div className="chat-bubble-ai px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex items-end gap-3 animate-fade-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isUser
          ? 'bg-gold-500/20 border border-gold-400/40'
          : 'bg-gold-600/20 border border-gold-500/30'
        }
      `}>
        {isUser
          ? <User size={14} className="text-gold-300" />
          : <Bot size={14} className="text-gold-400" />
        }
      </div>

      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Bubble */}
        <div className={isUser ? 'chat-bubble-user px-4 py-2.5' : 'chat-bubble-ai px-4 py-3'}>
          <p className={`font-body text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-ink-950' : 'text-ink-200'}`}>
            {msg.content}
          </p>
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="w-full space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <Sparkles size={11} className="text-gold-500" />
              <span className="text-xs font-body text-ink-500 uppercase tracking-widest">
                Sources ({msg.sources.length})
              </span>
            </div>
            {msg.sources.map((src, i) => (
              <SourceCard key={i} source={src} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatWindow({ hasDocuments }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async (question) => {
    const q = question || input.trim()
    if (!q || isLoading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setIsLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/ask`, {
        question: q,
        collection_name: 'default',
        k: 3,
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
      }])
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(msg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${msg}`,
        sources: [],
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Empty state
  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center">
          <FileQuestion size={28} className="text-ink-600" />
        </div>
        <div>
          <p className="font-display text-ink-400 text-lg">No document loaded</p>
          <p className="font-body text-ink-600 text-sm mt-1">Upload a PDF on the left to start asking questions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-6 min-h-0">
        {messages.length === 0 && (
          <div className="animate-fade-in">
            <p className="text-xs font-body text-ink-500 uppercase tracking-widest text-center mb-4">
              Suggested questions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left rounded-xl glass-light p-3 hover:border-gold-400/30 
                             transition-all duration-200 group animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <p className="font-body text-sm text-ink-300 group-hover:text-ink-100 transition-colors">
                    {q}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="pt-4 border-t border-ink-800">
        <div className="flex items-end gap-3 glass rounded-2xl p-2 pl-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your document…"
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent font-body text-sm text-ink-200 placeholder-ink-600 
                       resize-none outline-none leading-relaxed max-h-32 py-2
                       disabled:opacity-50"
            style={{ minHeight: '40px' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-30
                       disabled:cursor-not-allowed flex items-center justify-center shrink-0
                       transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {isLoading
              ? <Loader2 size={16} className="text-ink-950 animate-spin" />
              : <Send size={16} className="text-ink-950" />
            }
          </button>
        </div>
        <p className="text-center text-xs font-body text-ink-700 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}