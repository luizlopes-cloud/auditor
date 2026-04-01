import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'default' | 'emerald' | 'amber' | 'red' | 'blue'
}

const accentMap = {
  default: 'text-slate-900',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
}

export function StatCard({ label, value, sub, accent = 'default' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={cn('text-3xl font-bold mt-1 tabular-nums', accentMap[accent])}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
