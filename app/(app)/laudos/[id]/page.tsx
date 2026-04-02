'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ScoreBadge } from '@/components/ScoreBadge'
import { CheckItem } from '@/components/CheckItem'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion, ArrowLeft, ExternalLink, Trash2, Merge, Lightbulb, RotateCcw, Link2, CheckCircle2, XCircle, MessageSquare, Send, Pencil } from 'lucide-react'
import Link from 'next/link'

type Check = {
  categoria: string
  item: string
  status: 'ok' | 'aviso' | 'erro'
  detalhe: string
  sugestao?: string
}

type Comentario = { id: string; autor: string; texto: string; created_at: string }

const typeIcon: Record<string, React.ElementType> = {
  script: FileCode2, planilha: FileSpreadsheet, flow: GitBranch,
  dashboard: LayoutDashboard, query: Database, outro: FileQuestion,
}
const typeLabel: Record<string, string> = {
  script: 'Script', planilha: 'Planilha', flow: 'Flow',
  dashboard: 'Dashboard', query: 'Query', outro: 'Outro',
}
const sourceLabel: Record<string, string> = {
  github: 'GitHub', upload: 'Upload / Código colado', url: 'URL deployada',
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
  const [copied, setCopied] = useState(false)

  // Equipe inline edit
  const [editingEquipe, setEditingEquipe] = useState(false)
  const [equipeValue, setEquipeValue] = useState('')
  const [savingEquipe, setSavingEquipe] = useState(false)

  // Manual approval
  const [aprovacaoManual, setAprovacaoManual] = useState<string | null>(null)
  const [notaAprovacao, setNotaAprovacao] = useState('')
  const [showAprovacaoForm, setShowAprovacaoForm] = useState(false)
  const [savingAprovacao, setSavingAprovacao] = useState(false)

  // Re-analyze
  const [reanalyzing, setReanalyzing] = useState(false)

  // Similar artifacts
  const [similares, setSimilares] = useState<{ id: string; motivo: string; recomendacao: string }[] | null>(null)
  const [loadingSimilares, setLoadingSimilares] = useState(false)

  // Recommended actions
  const [acoes, setAcoes] = useState<{ tipo: 'urgente' | 'sugerida' | 'oportunidade'; titulo: string; descricao: string }[] | null>(null)
  const [loadingAcoes, setLoadingAcoes] = useState(false)

  // Comments
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loadingComentarios, setLoadingComentarios] = useState(false)
  const [newAutor, setNewAutor] = useState('')
  const [newTexto, setNewTexto] = useState('')
  const [sendingComentario, setSendingComentario] = useState(false)

  useEffect(() => {
    fetch(`/api/laudos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else {
          setLaudo(data.laudo)
          setAprovacaoManual((data.laudo as any).aprovacao_manual ?? null)
          setNotaAprovacao((data.laudo as any).nota_aprovacao ?? '')
          const art = Array.isArray(data.laudo.artifacts) ? data.laudo.artifacts[0] : data.laudo.artifacts
          setEquipeValue((art as any)?.equipe ?? '')
        }
      })
      .catch(() => setError('Erro ao carregar laudo'))
      .finally(() => setLoading(false))

    // Load comments
    setLoadingComentarios(true)
    fetch(`/api/laudos/${id}/comentarios`)
      .then(r => r.json())
      .then(d => setComentarios(d.comentarios ?? []))
      .catch(() => {})
      .finally(() => setLoadingComentarios(false))
  }, [id])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveEquipe = async () => {
    if (!laudo) return
    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return
    setSavingEquipe(true)
    await fetch(`/api/artifacts/${artifact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipe: equipeValue }),
    })
    setSavingEquipe(false)
    setEditingEquipe(false)
  }

  const handleSaveAprovacao = async (tipo: 'aprovado' | 'reprovado' | null) => {
    setSavingAprovacao(true)
    await fetch(`/api/laudos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aprovacao_manual: tipo, nota_aprovacao: notaAprovacao }),
    })
    setAprovacaoManual(tipo)
    setSavingAprovacao(false)
    setShowAprovacaoForm(false)
  }

  const handleReanalyze = async () => {
    if (!confirm('Re-analisar irá criar uma nova versão deste laudo. Continuar?')) return
    setReanalyzing(true)
    try {
      const res = await fetch(`/api/laudos/${id}/reanalyze`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.laudo_id) {
        router.push(`/laudos/${data.laudo_id}`)
      } else {
        alert(data.error ?? 'Erro ao re-analisar')
      }
    } finally {
      setReanalyzing(false)
    }
  }

  const fetchAcoes = () => {
    if (acoes !== null || loadingAcoes) return
    setLoadingAcoes(true)
    fetch(`/api/laudos/${id}/actions`)
      .then(r => r.json())
      .then(d => setAcoes(d.acoes ?? []))
      .catch(() => setAcoes([]))
      .finally(() => setLoadingAcoes(false))
  }

  const fetchSimilares = () => {
    if (similares !== null || loadingSimilares) return
    setLoadingSimilares(true)
    fetch(`/api/laudos/${id}/similar`)
      .then(r => r.json())
      .then(d => setSimilares(d.similares ?? []))
      .catch(() => setSimilares([]))
      .finally(() => setLoadingSimilares(false))
  }

  const handleSendComentario = async () => {
    if (!newAutor.trim() || !newTexto.trim()) return
    setSendingComentario(true)
    try {
      const res = await fetch(`/api/laudos/${id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autor: newAutor, texto: newTexto }),
      })
      const data = await res.json()
      if (res.ok && data.comentario) {
        setComentarios(prev => [...prev, data.comentario])
        setNewTexto('')
      }
    } finally {
      setSendingComentario(false)
    }
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
  const version = (laudo as any).version ?? 1
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground truncate">{artifact?.name}</h1>
              {version > 1 && (
                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  v{version}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">{typeLabel[artifact?.type] ?? 'Outro'}</span>
              <span className="text-border">·</span>
              <span className="text-sm text-muted-foreground">{artifact?.submitted_by}</span>
              <span className="text-border">·</span>
              <span className="text-sm text-muted-foreground">{date}</span>
            </div>
            {/* Equipe */}
            <div className="mt-2 flex items-center gap-1.5">
              {editingEquipe ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={equipeValue}
                    onChange={e => setEquipeValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEquipe(); if (e.key === 'Escape') setEditingEquipe(false) }}
                    placeholder="Ex: Revenue, Ops, Marketing..."
                    className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <button onClick={handleSaveEquipe} disabled={savingEquipe} className="text-xs text-primary hover:text-primary/80 font-medium">{savingEquipe ? '...' : 'Salvar'}</button>
                  <button onClick={() => setEditingEquipe(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingEquipe(true)}
                  className="group flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <span>{equipeValue || 'Definir equipe'}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
            {artifact?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{artifact.description}</p>
            )}
          </div>
          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              title="Copiar link"
              className="p-2 text-muted-foreground/60 hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                title="Remover laudo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 bg-red-700 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {deleting ? 'Removendo...' : 'Confirmar'}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="px-3 py-1.5 border border-border text-muted-foreground text-xs font-medium rounded-lg hover:bg-accent transition-colors">
                  Cancelar
                </button>
              </div>
            )}
          </div>
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
          {laudo.model_used && <span className="text-xs text-muted-foreground/60">· {laudo.model_used}</span>}
          {laudo.tempo_analise_ms && <span className="text-xs text-muted-foreground/60">· {(laudo.tempo_analise_ms / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {/* Score + Resultado */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <ScoreBadge
              resultado={laudo.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
              score={laudo.score ?? 0}
              showBar
              size="lg"
            />
            <p className="mt-4 text-foreground/80">{laudo.resumo}</p>
          </div>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            title="Re-analisar (criar nova versão)"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-accent hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
            {reanalyzing ? 'Analisando...' : 'Re-analisar'}
          </button>
        </div>
      </div>

      {/* Aprovação manual */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Decisão manual</h2>
          {!showAprovacaoForm && (
            <button
              onClick={() => setShowAprovacaoForm(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              {aprovacaoManual ? 'Alterar' : 'Registrar decisão'}
            </button>
          )}
        </div>

        {aprovacaoManual === 'aprovado' && !showAprovacaoForm && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-300 font-medium">Aprovado manualmente</p>
              {notaAprovacao && <p className="text-xs text-muted-foreground mt-1">{notaAprovacao}</p>}
            </div>
          </div>
        )}
        {aprovacaoManual === 'reprovado' && !showAprovacaoForm && (
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Reprovado manualmente</p>
              {notaAprovacao && <p className="text-xs text-muted-foreground mt-1">{notaAprovacao}</p>}
            </div>
          </div>
        )}
        {!aprovacaoManual && !showAprovacaoForm && (
          <p className="text-sm text-muted-foreground/60">Nenhuma decisão manual registrada. A análise automática é o resultado vigente.</p>
        )}

        {showAprovacaoForm && (
          <div className="space-y-3">
            <textarea
              value={notaAprovacao}
              onChange={e => setNotaAprovacao(e.target.value)}
              placeholder="Nota opcional (motivo da decisão, condições, etc.)"
              rows={2}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveAprovacao('aprovado')}
                disabled={savingAprovacao}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprovar
              </button>
              <button
                onClick={() => handleSaveAprovacao('reprovado')}
                disabled={savingAprovacao}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reprovar
              </button>
              {aprovacaoManual && (
                <button
                  onClick={() => handleSaveAprovacao(null)}
                  disabled={savingAprovacao}
                  className="px-3 py-2 border border-border text-muted-foreground text-xs font-medium rounded-lg hover:bg-accent transition-colors"
                >
                  Remover decisão
                </button>
              )}
              <button
                onClick={() => setShowAprovacaoForm(false)}
                className="px-3 py-2 text-muted-foreground text-xs hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ações complementares */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Ações recomendadas</h2>
          </div>
          {acoes === null && (
            <button onClick={fetchAcoes} disabled={loadingAcoes} className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50">
              {loadingAcoes ? 'Gerando...' : 'Gerar agora'}
            </button>
          )}
        </div>
        {acoes === null && !loadingAcoes && (
          <p className="text-sm text-muted-foreground/60">Clique em "Gerar agora" para obter recomendações de ações complementares.</p>
        )}
        {loadingAcoes && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
            Analisando e gerando recomendações...
          </div>
        )}
        {acoes !== null && acoes.length === 0 && (
          <p className="text-sm text-muted-foreground/60">Nenhuma ação complementar identificada.</p>
        )}
        {acoes !== null && acoes.length > 0 && (
          <div className="space-y-3">
            {acoes.map((a, i) => {
              const colorMap = { urgente: 'border-red-700/40 bg-red-950/20', sugerida: 'border-amber-700/40 bg-amber-950/20', oportunidade: 'border-blue-700/40 bg-blue-950/20' }
              const labelMap = { urgente: 'text-red-300', sugerida: 'text-amber-300', oportunidade: 'text-blue-300' }
              const badgeMap = { urgente: 'bg-red-900/50 text-red-300', sugerida: 'bg-amber-900/50 text-amber-300', oportunidade: 'bg-blue-900/50 text-blue-300' }
              return (
                <div key={i} className={`rounded-lg border p-4 ${colorMap[a.tipo]}`}>
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeMap[a.tipo]}`}>{a.tipo}</span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-sm font-medium ${labelMap[a.tipo]}`}>{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{a.descricao}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Artefatos similares */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Merge className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Artefatos similares</h2>
          </div>
          {similares === null && (
            <button onClick={fetchSimilares} disabled={loadingSimilares} className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50">
              {loadingSimilares ? 'Verificando...' : 'Verificar agora'}
            </button>
          )}
        </div>
        {similares === null && !loadingSimilares && (
          <p className="text-sm text-muted-foreground/60">Clique em "Verificar agora" para identificar artefatos com funcionalidades sobrepostas.</p>
        )}
        {loadingSimilares && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
            Comparando com artefatos do catálogo...
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
                  <Link href={`/laudos/${s.id}`} className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium">Ver laudo →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checks por categoria */}
      <div className="space-y-6 mb-8">
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
                  <CheckItem key={i} {...check} laudoId={id} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Comentários */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Comentários</h2>
          {comentarios.length > 0 && <span className="text-xs text-muted-foreground/60">({comentarios.length})</span>}
        </div>

        {loadingComentarios && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <div className="h-4 w-4 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
            Carregando comentários...
          </div>
        )}

        {!loadingComentarios && comentarios.length === 0 && (
          <p className="text-sm text-muted-foreground/60 mb-4">Nenhum comentário ainda.</p>
        )}

        {comentarios.length > 0 && (
          <div className="space-y-3 mb-4">
            {comentarios.map(c => (
              <div key={c.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{c.autor}</span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.texto}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-3 border-t border-border/50">
          <input
            value={newAutor}
            onChange={e => setNewAutor(e.target.value)}
            placeholder="Seu nome"
            className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="flex gap-2">
            <textarea
              value={newTexto}
              onChange={e => setNewTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSendComentario() }}
              placeholder="Adicionar comentário... (⌘+Enter para enviar)"
              rows={2}
              className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
            <button
              onClick={handleSendComentario}
              disabled={sendingComentario || !newAutor.trim() || !newTexto.trim()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
