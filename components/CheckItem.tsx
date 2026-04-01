'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
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
}

export function CheckItem({ categoria, item, status, detalhe, sugestao }: CheckItemProps) {
  const [open, setOpen] = useState(status !== 'ok')
  const { icon: Icon, color, bg, border } = statusConfig[status]

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
        </div>
      )}
    </div>
  )
}
