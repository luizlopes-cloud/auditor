'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, Globe, Trash2, Pencil, Check, X } from 'lucide-react'

type Resultado = 'aprovado' | 'ajustes_necessarios' | 'reprovado'
type ArtifactType = 'script' | 'planilha' | 'flow' | 'dashboard' | 'query' | 'outro'

const typeIcon: Record<ArtifactType, React.ElementType> = {
  script: FileCode2,
  planilha: FileSpreadsheet,
  flow: GitBranch,
  dashboard: LayoutDashboard,
  query: Database,
  outro: Globe,
}

interface LaudoCardProps {
  id: string
  artifactId: string
  name: string
  type: ArtifactType
  resultado: Resultado
  score: number
  resumo: string
  submittedBy: string
  createdAt: string
}

export function LaudoCard({ id, artifactId, name, type, resultado, score, resumo, submittedBy, createdAt }: LaudoCardProps) {
  const router = useRouter()
  const Icon = typeIcon[type] ?? Globe
  const date = new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [saving, setSaving] = useState(false)

  const handleSaveName = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editName.trim() || editName === name) { setEditing(false); return }
    setSaving(true)
    await fetch(`/api/artifacts/${artifactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

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
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-center gap-1.5" onClick={e => e.preventDefault()}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(e as any); if (e.key === 'Escape') setEditing(false) }}
                    className="flex-1 min-w-0 text-sm font-semibold bg-white text-slate-900 border border-primary/60 rounded px-2 py-0.5 focus:outline-none"
                  />
                  <button onClick={handleSaveName} disabled={saving} className="text-emerald-400 hover:text-emerald-300 shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.preventDefault(); setEditing(false) }} className="text-muted-foreground/50 hover:text-muted-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/name">
                  <p className="font-semibold text-foreground truncate">{editName}</p>
                  <button
                    onClick={e => { e.preventDefault(); setEditing(true) }}
                    className="opacity-0 group-hover/name:opacity-100 text-muted-foreground/40 hover:text-muted-foreground transition-opacity shrink-0"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
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
