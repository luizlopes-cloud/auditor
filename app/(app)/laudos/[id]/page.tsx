'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ScoreBadge } from '@/components/ScoreBadge'
import { CheckItem } from '@/components/CheckItem'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion, ArrowLeft, ExternalLink, Trash2, Merge } from 'lucide-react'
import Link from 'next/link'

type Check = {
  categoria: string
  item: string
  status: 'ok' | 'aviso' | 'erro'
  detalhe: string
  sugestao?: string
}

const typeIcon: Record<string, React.ElementType> = {
  script: FileCode2,
  planilha: FileSpreadsheet,
  flow: GitBranch,
  dashboard: LayoutDashboard,
  query: Database,
  outro: FileQuestion,
}

const typeLabel: Record<string, string> = {
  script: 'Script',
  planilha: 'Planilha',
  flow: 'Flow',
  dashboard: 'Dashboard',
  query: 'Query',
  outro: 'Outro',
}

const sourceLabel: Record<string, string> = {
  github: 'GitHub',
  upload: 'Upload / Código colado',
  url: 'URL deployada',
}

export default function LaudoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [laudo, setLaudo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [similares, setSimilares] = useState<{ id: string; motivo: string; recomendacao: string }[] | null>(null)
  const [loadingSimilares, setLoadingSimilares] = useState(false)

  useEffect(() => {
    fetch(`/api/laudos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setLaudo(data.laudo)
      })
      .catch(() => setError('Erro ao carregar laudo'))
      .finally(() => setLoading(false))
  }, [id])

  const fetchSimilares = () => {
    if (similares !== null || loadingSimilares) return
    setLoadingSimilares(true)
    fetch(`/api/laudos/${id}/similar`)
      .then(r => r.json())
      .then(d => setSimilares(d.similares ?? []))
      .catch(() => setSimilares([]))
      .finally(() => setLoadingSimilares(false))
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/laudos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/laudos')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Erro ao deletar laudo')
        setConfirmDelete(false)
      }
    } catch {
      setError('Erro de conexão ao deletar')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-6 w-32 bg-muted rounded animate-pulse mb-6" />
        <div className="bg-card rounded-xl border border-border p-6 mb-6 animate-pulse">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
          <div className="h-8 w-1/3 bg-muted rounded mb-4" />
          <div className="h-4 w-full bg-muted rounded mb-2" />
          <div className="h-4 w-4/5 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !laudo) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/laudos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar para laudos
        </Link>
        <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error ?? 'Laudo não encontrado'}
        </div>
      </div>
    )
  }

  const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
  const checks = (laudo.checks as Check[]) ?? []
  const categories = [...new Set(checks.map((c: Check) => c.categoria))]
  const Icon = typeIcon[artifact?.type] ?? FileQuestion
  const date = new Date(laudo.created_at ?? '').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/laudos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Voltar para laudos
      </Link>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{artifact?.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">{typeLabel[artifact?.type] ?? 'Outro'}</span>
              <span className="text-border">·</span>
              <span className="text-sm text-muted-foreground">{artifact?.submitted_by}</span>
              <span className="text-border">·</span>
              <span className="text-sm text-muted-foreground">{date}</span>
            </div>
            {artifact?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{artifact.description}</p>
            )}
          </div>
          {/* Delete button */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
              title="Remover laudo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-red-700 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Removendo...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-3 py-1.5 border border-border text-muted-foreground text-xs font-medium rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {artifact?.github_url && (
            <a href={artifact.github_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver no GitHub
            </a>
          )}
          {artifact?.source_url && (
            <a href={artifact.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver aplicação
            </a>
          )}
          <span className="text-xs text-muted-foreground/60">{sourceLabel[artifact?.source] ?? artifact?.source}</span>
          {laudo.model_used && (
            <span className="text-xs text-muted-foreground/60">· {laudo.model_used}</span>
          )}
          {laudo.tempo_analise_ms && (
            <span className="text-xs text-muted-foreground/60">· {(laudo.tempo_analise_ms / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>

      {/* Score + Resultado */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <ScoreBadge
          resultado={laudo.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
          score={laudo.score ?? 0}
          showBar
          size="lg"
        />
        <p className="mt-4 text-foreground/80">{laudo.resumo}</p>
      </div>

      {/* Artefatos similares */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Merge className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Artefatos similares</h2>
          </div>
          {similares === null && (
            <button
              onClick={fetchSimilares}
              disabled={loadingSimilares}
              className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50"
            >
              {loadingSimilares ? 'Verificando...' : 'Verificar agora'}
            </button>
          )}
        </div>

        {similares === null && !loadingSimilares && (
          <p className="text-sm text-muted-foreground/60">
            Clique em "Verificar agora" para identificar artefatos com funcionalidades sobrepostas.
          </p>
        )}

        {loadingSimilares && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
            Comparando com {'\u2026'} artefatos do catálogo
          </div>
        )}

        {similares !== null && similares.length === 0 && (
          <p className="text-sm text-muted-foreground/60">Nenhum artefato similar encontrado no catálogo.</p>
        )}

        {similares !== null && similares.length > 0 && (
          <div className="space-y-3">
            {similares.map(s => (
              <div key={s.id} className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-amber-300">{s.motivo}</p>
                    <p className="text-xs text-muted-foreground">{s.recomendacao}</p>
                  </div>
                  <Link
                    href={`/laudos/${s.id}`}
                    className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Ver laudo →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checks por categoria */}
      <div className="space-y-6">
        {categories.map(categoria => {
          const categoryChecks = checks.filter((c: Check) => c.categoria === categoria)
          const hasError = categoryChecks.some((c: Check) => c.status === 'erro')
          const hasWarning = categoryChecks.some((c: Check) => c.status === 'aviso')

          return (
            <div key={categoria}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{categoria}</h2>
                {hasError && <span className="h-2 w-2 rounded-full bg-red-500" />}
                {!hasError && hasWarning && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                {!hasError && !hasWarning && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
              </div>
              <div className="space-y-2">
                {categoryChecks.map((check: Check, i: number) => (
                  <CheckItem key={i} {...check} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
