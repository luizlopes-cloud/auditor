import { cn } from '@/lib/utils'

type Resultado = 'aprovado' | 'ajustes_necessarios' | 'reprovado'

const config: Record<Resultado, { label: string; color: string; bar: string }> = {
  aprovado: {
    label: 'Aprovado',
    color: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    bar: 'bg-emerald-500',
  },
  ajustes_necessarios: {
    label: 'Ajustes necessários',
    color: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    bar: 'bg-amber-500',
  },
  reprovado: {
    label: 'Reprovado',
    color: 'bg-red-900/50 text-red-300 border-red-700/50',
    bar: 'bg-red-500',
  },
}

interface ScoreBadgeProps {
  resultado: Resultado
  score: number
  showBar?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ resultado, score, showBar = false, size = 'md' }: ScoreBadgeProps) {
  const c = config[resultado]
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border font-medium',
            c.color,
            size === 'sm' && 'px-2 py-0.5 text-xs',
            size === 'md' && 'px-2.5 py-1 text-sm',
            size === 'lg' && 'px-3 py-1.5 text-base',
          )}
        >
          {c.label}
        </span>
        <span
          className={cn(
            'font-semibold tabular-nums text-foreground',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-xl',
          )}
        >
          {score}
          <span className="text-muted-foreground font-normal">/100</span>
        </span>
      </div>
      {showBar && (
        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', c.bar)}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  )
}
