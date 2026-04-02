'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

interface FloatingAssistantProps {
  context?: Record<string, unknown>
  initialMessage?: string
  forceOpen?: boolean
  onClose?: () => void
}

export function FloatingAssistant({ context, initialMessage, forceOpen, onClose }: FloatingAssistantProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (forceOpen) { setOpen(true); onClose?.() }
  }, [forceOpen, onClose])

  useEffect(() => {
    if (open && messages.length === 0 && initialMessage) {
      setMessages([{ role: 'assistant', content: initialMessage }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text ?? 'Não consegui processar. Tente novamente.',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: '72px', right: '24px',
          width: '360px', maxHeight: '520px',
          zIndex: 999999,
          display: 'flex', flexDirection: 'column',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid var(--border)',
          background: 'var(--card)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', flexShrink: 0 }}>
            <div style={{ height: '28px', width: '28px', borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>Assistente</p>
              <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: 0 }}>Auditoria · Seazone</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--accent)',
                  color: m.role === 'user' ? 'white' : 'var(--foreground)',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex' }}>
                <div style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: 'var(--accent)' }}>
                  <Loader2 size={16} style={{ color: 'var(--muted-foreground)', animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escreva sua pergunta..."
              disabled={loading}
              style={{ flex: 1, borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)', padding: '8px 12px', fontSize: '14px', color: 'var(--foreground)', outline: 'none' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{ height: '36px', width: '36px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1, flexShrink: 0 }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Assistente"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          height: '52px', width: '52px', borderRadius: '50%',
          background: open ? 'var(--muted)' : 'var(--primary)',
          color: open ? 'var(--foreground)' : 'white',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
          zIndex: 999999,
          transition: 'transform 0.2s, background 0.2s',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>,
    document.body
  )
}
