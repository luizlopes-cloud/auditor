'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'ok' | 'aviso' | 'erro'

const statusConfig: Record<Status, { icon: React.ElementType; color: string; bg: string }> = {
  ok: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  aviso: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  erro: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
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
  const { icon: Icon, color, bg } = statusConfig[status]

  return (
    <div className={cn('rounded-lg border overflow-hidden', status === 'erro' && 'border-red-200', status === 'aviso' && 'border-amber-200', status === 'ok' && 'border-slate-200')}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50', bg)}
      >
        <Icon className={cn('h-4 w-4 shrink-0', color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{categoria}</span>
          </div>
          <p className="text-sm font-medium text-slate-800 truncate">{item}</p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-slate-100 bg-white space-y-2">
          <p className="text-sm text-slate-600">{detalhe}</p>
          {sugestao && (
            <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
              <p className="text-xs font-medium text-blue-700 mb-0.5">Sugestão</p>
              <p className="text-sm text-blue-800">{sugestao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
