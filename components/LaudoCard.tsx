'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion, Trash2 } from 'lucide-react'

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
  const router = useRouter()
  const Icon = typeIcon[type] ?? FileQuestion
  const date = new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await fetch(`/api/laudos/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="group bg-card rounded-xl border border-border shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
      <Link href={`/laudos/${id}`} className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{submittedBy} · {date}</p>
            </div>
          </div>
          <ScoreBadge resultado={resultado} score={score} size="sm" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{resumo}</p>
      </Link>

      <div className="px-5 pb-3 flex justify-end min-h-[28px]">
        {!confirm ? (
          <button
            onClick={e => { e.preventDefault(); setConfirm(true) }}
            className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-red-400 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Remover laudo?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              {deleting ? 'Removendo...' : 'Sim'}
            </button>
            <button
              onClick={e => { e.preventDefault(); setConfirm(false) }}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
            >
              Não
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
