'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, MessageSquarePlus, Send, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'ok' | 'aviso' | 'erro'

const statusConfig: Record<Status, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  ok:    { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40' },
  aviso: { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-800/40'  },
  erro:  { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-950/40',     border: 'border-red-800/40'    },
}

interface CheckItemProps {
  categoria: string
  item: string
  status: Status
  detalhe: string
  sugestao?: string
  laudoId?: string
}

export function CheckItem({ categoria, item, status, detalhe, sugestao, laudoId }: CheckItemProps) {
  const [open, setOpen] = useState(status !== 'ok')
  const [contesting, setContesting] = useState(false)
  const [contestText, setContestText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const { icon: Icon, color, bg, border } = statusConfig[status]

  const handleContest = async () => {
    if (!contestText.trim() || !laudoId) return
    setSending(true)
    try {
      await fetch(`/api/laudos/${laudoId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autor: 'Revisor',
          texto: `[Contestação — ${item}]\n${contestText.trim()}`,
        }),
      })
      setSent(true)
      setContestText('')
      setTimeout(() => { setSent(false); setContesting(false) }, 2000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden', border)}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-110', bg)}
      >
        <Icon className={cn('h-4 w-4 shrink-0', color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/70 uppercase tracking-wide font-medium">{categoria}</span>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{item}</p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-border/50 bg-card space-y-2">
          <p className="text-sm text-muted-foreground">{detalhe}</p>
          {sugestao && (
            <div className="bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
              <p className="text-xs font-medium text-primary mb-0.5">Sugestão</p>
              <p className="text-sm text-foreground/80">{sugestao}</p>
            </div>
          )}
          {laudoId && !contesting && (
            <button
              onClick={() => setContesting(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Contestar este check
            </button>
          )}
          {contesting && (
            <div className="mt-2 space-y-2">
              <textarea
                autoFocus
                value={contestText}
                onChange={e => setContestText(e.target.value)}
                rows={2}
                placeholder="Descreva o que está incorreto ou forneça contexto adicional..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleContest}
                  disabled={!contestText.trim() || sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {sent ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                  {sent ? 'Enviado' : sending ? 'Enviando...' : 'Enviar contestação'}
                </button>
                <button
                  onClick={() => { setContesting(false); setContestText('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
