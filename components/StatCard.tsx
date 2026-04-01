import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'default' | 'emerald' | 'amber' | 'red' | 'blue'
}

const accentMap = {
  default: 'text-foreground',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-primary',
}

export function StatCard({ label, value, sub, accent = 'default' }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={cn('text-3xl font-bold mt-1 tabular-nums', accentMap[accent])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  )
}
