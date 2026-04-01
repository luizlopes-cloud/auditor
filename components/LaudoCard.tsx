import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

type Resultado = 'aprovado' | 'ajustes_necessarios' | 'reprovado'
type ArtifactType = 'script' | 'planilha' | 'flow' | 'dashboard' | 'query' | 'outro'

const typeIcon: Record<ArtifactType, React.ElementType> = {
  script: FileCode2,
  planilha: FileSpreadsheet,
  flow: GitBranch,
  dashboard: LayoutDashboard,
  query: Database,
  outro: FileQuestion,
}

interface LaudoCardProps {
  id: string
  name: string
  type: ArtifactType
  resultado: Resultado
  score: number
  resumo: string
  submittedBy: string
  createdAt: string
}

export function LaudoCard({ id, name, type, resultado, score, resumo, submittedBy, createdAt }: LaudoCardProps) {
  const Icon = typeIcon[type] ?? FileQuestion
  const date = new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <Link href={`/laudos/${id}`} className="block">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{name}</p>
              <p className="text-xs text-slate-500">{submittedBy} · {date}</p>
            </div>
          </div>
          <ScoreBadge resultado={resultado} score={score} size="sm" />
        </div>
        <p className="mt-3 text-sm text-slate-600 line-clamp-2">{resumo}</p>
      </div>
    </Link>
  )
}
