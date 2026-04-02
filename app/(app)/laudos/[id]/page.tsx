'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ScoreBadge } from '@/components/ScoreBadge'
import { CheckItem } from '@/components/CheckItem'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, Globe, ArrowLeft, ExternalLink, Trash2, Merge, RotateCcw, Link2, CheckCircle2, XCircle, MessageSquare, Send, Pencil, ChevronDown, ChevronRight, Monitor, Code2, FileText, ClipboardCheck, Square, SquareCheck } from 'lucide-react'
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
  dashboard: LayoutDashboard, query: Database, outro: Globe,
}
const typeLabel: Record<string, string> = {
  script: 'Script', planilha: 'Planilha', flow: 'Flow',
  dashboard: 'Dashboard', query: 'Query', outro: 'Outro',
}
const TARGET_ORG = 'businessoperations-seazone'
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
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingEquipe, setSavingEquipe] = useState(false)

  // Manual approval
  const [aprovacaoManual, setAprovacaoManual] = useState<string | null>(null)
  const [notaAprovacao, setNotaAprovacao] = useState('')
  const [showAprovacaoForm, setShowAprovacaoForm] = useState(false)
  const [savingAprovacao, setSavingAprovacao] = useState(false)

  // Re-analyze
  const [reanalyzing, setReanalyzing] = useState(false)

  // Similar artifacts — auto-trigger on load
  const [similares, setSimilares] = useState<{ id: string; motivo: string; recomendacao: string }[] | null>(null)
  const [loadingSimilares, setLoadingSimilares] = useState(true)

  // Funcionalidades deep dive — auto-trigger on load, starts collapsed
  const [funcionalidades, setFuncionalidades] = useState<any[] | null>(null)
  const [loadingFunc, setLoadingFunc] = useState(true)
  const [funcOpen, setFuncOpen] = useState(false)

  // Review UI
  const [reviewUi, setReviewUi] = useState<any | null>(null)
  const [loadingUi, setLoadingUi] = useState(false)

  // Review Code
  const [reviewCode, setReviewCode] = useState<any | null>(null)
  const [loadingCode, setLoadingCode] = useState(false)

  // Spec
  const [spec, setSpec] = useState<any | null>(null)
  const [loadingSpec, setLoadingSpec] = useState(false)

  // Checklist de acessos
  const [acessos, setAcessos] = useState<Record<string, boolean>>({
    github: false, supabase: false, vercel: false, dominio: false, staging: false,
  })

  // GitHub actions
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubResult, setGithubResult] = useState<any>(null)

  const saveName = async () => {
    if (!nameValue.trim() || !artifact) return
    setSavingName(true)
    await fetch(`/api/artifacts/${artifact.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue.trim() }),
    })
    setSavingName(false)
    setEditingName(false)
    router.refresh()
  }

  const runGithubAction = async (action: string) => {
    setGithubLoading(true)
    setGithubResult(null)
    try {
      const art = Array.isArray(laudo?.artifacts) ? laudo.artifacts[0] : laudo?.artifacts
      const res = await fetch(`/api/artifacts/${art?.id}/github`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      setGithubResult(data)
      if (data.success && data.new_url) router.refresh()
    } catch { setGithubResult({ error: 'Erro de conexão' }) }
    finally { setGithubLoading(false) }
  }

  // Um painel aberto por vez
  const [activePanel, setActivePanel] = useState<'ui' | 'code' | 'spec' | 'acessos' | null>(null)
  const togglePanel = (panel: typeof activePanel) => setActivePanel(prev => prev === panel ? null : panel)

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
          setNameValue((art as any)?.name ?? '')
          if ((data.laudo as any).spec) setSpec((data.laudo as any).spec)
        }
      })
      .catch(() => setError('Erro ao carregar laudo'))
      .finally(() => setLoading(false))

    // Auto-load funcionalidades → depois roda similares com as funcionalidades
    fetch(`/api/laudos/${id}/funcionalidades`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        const funcs = d.funcionalidades ?? []
        setFuncionalidades(funcs)
        // Agora roda similares usando as funcionalidades como base
        fetch(`/api/laudos/${id}/similar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ funcionalidades: funcs }),
        })
          .then(r => r.json())
          .then(d => setSimilares(d.similares ?? []))
          .catch(() => setSimilares([]))
          .finally(() => setLoadingSimilares(false))
      })
      .catch(() => {
        setFuncionalidades([])
        setSimilares([])
        setLoadingSimilares(false)
      })
      .finally(() => setLoadingFunc(false))

    // Load cached review UI & code via GET
    fetch(`/api/laudos/${id}/review-ui`).then(r => r.json()).then(d => { if (d.review) setReviewUi(d.review) }).catch(() => {})
    fetch(`/api/laudos/${id}/review-code`).then(r => r.json()).then(d => { if (d.review) setReviewCode(d.review) }).catch(() => {})

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
  const Icon = typeIcon[artifact?.type] ?? Globe
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
            <div className="flex items-center gap-2 group/name">
              {editingName ? (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="text-xl font-bold bg-white text-slate-900 border border-primary/60 rounded px-2 py-0.5 focus:outline-none min-w-0 flex-1"
                  />
                  <button onClick={saveName} disabled={savingName} className="text-emerald-400 hover:text-emerald-300 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-muted-foreground/50 hover:text-muted-foreground shrink-0">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-foreground truncate">{nameValue}</h1>
                  <button onClick={() => setEditingName(true)} className="text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {version > 1 && !editingName && (
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

      {/* GitHub actions */}
      {artifact && !artifact.github_url && (
        <div className="bg-amber-950/20 border border-amber-700/40 rounded-xl p-5 mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">Projeto sem GitHub</p>
          </div>
          <p className="text-xs text-amber-300/70">Conecte ao GitHub para homologação completa:</p>
          <div className="flex flex-wrap gap-2">
            {(artifact as any).lovable_project_id ? (
              <a
                href={`https://lovable.dev/projects/${(artifact as any).lovable_project_id}/settings/integrations?connector=github&subtab=connectors`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-500 transition-colors inline-flex items-center gap-1.5"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Conectar GitHub no Lovable
              </a>
            ) : artifact.source_url?.includes('lovable') ? (
              <button onClick={() => runGithubAction('lovable_link')} disabled={githubLoading}
                className="px-3 py-2 bg-amber-700/60 text-amber-100 text-xs font-medium rounded-lg hover:bg-amber-600/60 disabled:opacity-50 transition-colors">
                Como conectar no Lovable
              </button>
            ) : null}
            {!artifact.source_url?.includes('lovable') && (
              <button onClick={() => runGithubAction('create')} disabled={githubLoading}
                className="px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {githubLoading ? 'Criando...' : 'Criar repositório'}
              </button>
            )}
          </div>
          {githubResult && (
            <div className={`text-xs p-3 rounded-lg ${githubResult.error ? 'bg-red-950/40 text-red-300' : 'bg-emerald-950/40 text-emerald-300'}`}>
              {githubResult.error ?? githubResult.message}
              {githubResult.new_url && <a href={githubResult.new_url} target="_blank" className="block mt-1 text-primary underline">{githubResult.new_url}</a>}
              {githubResult.steps && (
                <ol className="mt-2 space-y-1 list-decimal list-inside">{githubResult.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
              )}
            </div>
          )}
        </div>
      )}
      {artifact?.github_url && (() => {
        const match = artifact.github_url.match(/github\.com\/([^/]+)\//)
        const owner = match?.[1]?.toLowerCase()
        const isOrgOk = ['seazone-socios', 'businessoperations-seazone', 'seazone'].includes(owner ?? '')
        if (isOrgOk) return null
        return (
          <div className="bg-amber-950/20 border border-amber-700/40 rounded-xl p-5 mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-semibold text-amber-300">Repositório fora da organização</p>
            </div>
            <p className="text-xs text-amber-300/70">Atualmente em <span className="font-mono">{owner}</span>. Transfira para a org Seazone:</p>
            <button onClick={() => runGithubAction('transfer')} disabled={githubLoading}
              className="px-3 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-500 disabled:opacity-50 transition-colors">
              {githubLoading ? 'Transferindo...' : `Transferir para ${TARGET_ORG}`}
            </button>
            {githubResult && (
              <div className={`text-xs p-3 rounded-lg ${githubResult.error ? 'bg-red-950/40 text-red-300' : 'bg-emerald-950/40 text-emerald-300'}`}>
                {githubResult.error ?? githubResult.message}
                {githubResult.new_url && <a href={githubResult.new_url} target="_blank" className="block mt-1 text-primary underline">{githubResult.new_url}</a>}
              </div>
            )}
          </div>
        )
      })()}

      {/* Score + Resultado */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {reviewUi && reviewCode ? (
              <ScoreBadge
                resultado={laudo.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
                score={laudo.score ?? 0}
                showBar
                size="lg"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold text-muted-foreground">?</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Score pendente</p>
                    <p className="text-xs text-muted-foreground">
                      Execute {!reviewUi && !reviewCode ? 'Revisão de UI e Código' : !reviewUi ? 'Revisão de UI' : 'Revisão de Código'} para calcular o score final
                    </p>
                  </div>
                </div>
              </div>
            )}
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

      {/* Mapeamento de funcionalidades — dropdown colapsável */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
        <button
          onClick={() => funcionalidades && funcionalidades.length > 0 && setFuncOpen(v => !v)}
          className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-accent/30 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-foreground flex-1">Funcionalidades do artefato</h2>
          {loadingFunc && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
              Mapeando...
            </div>
          )}
          {funcionalidades && funcionalidades.length > 0 && (
            <span className="text-xs text-muted-foreground">{funcionalidades.length} features</span>
          )}
          {funcionalidades && funcionalidades.length > 0 && (
            funcOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        {funcOpen && funcionalidades && funcionalidades.length > 0 && (
          <div className="px-6 pb-5 space-y-3 border-t border-border/50 pt-4">
            {funcionalidades.map((f: any, i: number) => {
              const tipoColors: Record<string, string> = {
                tela: 'bg-blue-900/50 text-blue-300', filtro: 'bg-violet-900/50 text-violet-300',
                formulario: 'bg-emerald-900/50 text-emerald-300', tabela: 'bg-cyan-900/50 text-cyan-300',
                grafico: 'bg-pink-900/50 text-pink-300', botao: 'bg-orange-900/50 text-orange-300',
                modal: 'bg-amber-900/50 text-amber-300', navegacao: 'bg-slate-700/50 text-slate-300',
                integracao: 'bg-indigo-900/50 text-indigo-300', auth: 'bg-red-900/50 text-red-300',
              }
              const statusColors: Record<string, string> = {
                completa: 'text-emerald-400', parcial: 'text-amber-400',
                placeholder: 'text-red-400', nao_verificavel: 'text-muted-foreground',
              }
              const statusLabels: Record<string, string> = {
                completa: 'Completa', parcial: 'Parcial',
                placeholder: 'Placeholder', nao_verificavel: 'Não verificável',
              }
              return (
                <div key={i} className="rounded-lg border border-border/50 p-4 space-y-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${tipoColors[f.tipo] ?? 'bg-muted text-muted-foreground'}`}>{f.tipo}</span>
                    <p className="text-sm font-medium text-foreground flex-1">{f.nome}</p>
                    <span className={`text-xs font-medium ${statusColors[f.status] ?? 'text-muted-foreground'}`}>{statusLabels[f.status] ?? f.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.descricao}</p>
                  {f.detalhes_tecnicos && (
                    <p className="text-xs text-muted-foreground/50 font-mono">{f.detalhes_tecnicos}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Artefatos similares — auto-loaded */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Merge className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Artefatos similares</h2>
          {loadingSimilares && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
              Comparando...
            </div>
          )}
        </div>
        {!loadingSimilares && similares !== null && similares.length === 0 && (
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
                  <Link href={`/laudos/${s.id}`} className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium">Ver laudo do semelhante →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Botões das ferramentas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => {
            if (reviewUi) { togglePanel('ui'); return }
            setLoadingUi(true)
            fetch(`/api/laudos/${id}/review-ui`, { method: 'POST' })
              .then(r => r.json())
              .then(d => { setReviewUi(d.review ?? d.error ?? 'Erro'); setActivePanel('ui') })
              .catch(() => setReviewUi('Erro ao revisar UI'))
              .finally(() => setLoadingUi(false))
          }}
          disabled={loadingUi}
          className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all text-left disabled:opacity-60"
        >
          <div className="h-9 w-9 rounded-lg bg-violet-900/40 flex items-center justify-center shrink-0"><Monitor className="h-4 w-4 text-violet-400" /></div>
          <div>
            <p className="text-sm font-medium text-foreground">Revisar UI</p>
            <p className="text-xs text-muted-foreground">{loadingUi ? 'Analisando...' : reviewUi ? (activePanel === 'ui' ? 'Fechar' : 'Ver resultado') : 'Interface e UX'}</p>
          </div>
        </button>

        <button
          onClick={() => {
            if (reviewCode) { togglePanel('code'); return }
            setLoadingCode(true)
            fetch(`/api/laudos/${id}/review-code`, { method: 'POST' })
              .then(r => r.json())
              .then(d => { setReviewCode(d.review ?? d.error ?? 'Erro'); setActivePanel('code') })
              .catch(() => setReviewCode('Erro ao revisar código'))
              .finally(() => setLoadingCode(false))
          }}
          disabled={loadingCode}
          className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all text-left disabled:opacity-60"
        >
          <div className="h-9 w-9 rounded-lg bg-cyan-900/40 flex items-center justify-center shrink-0"><Code2 className="h-4 w-4 text-cyan-400" /></div>
          <div>
            <p className="text-sm font-medium text-foreground">Revisar Código</p>
            <p className="text-xs text-muted-foreground">{loadingCode ? 'Analisando...' : reviewCode ? (activePanel === 'code' ? 'Fechar' : 'Ver resultado') : 'Qualidade e segurança'}</p>
          </div>
        </button>

        {(() => {
          const missing: string[] = []
          if (!funcionalidades || funcionalidades.length === 0) missing.push('Funcionalidades')
          if (!reviewUi) missing.push('Revisão UI')
          if (!reviewCode) missing.push('Revisão Código')
          if (!similares) missing.push('Similares')
          const canGenerate = missing.length === 0
          return (
            <button
              onClick={() => {
                if (!canGenerate) return
                if (spec) { togglePanel('spec'); return }
                setLoadingSpec(true)
                fetch(`/api/laudos/${id}/spec`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ funcionalidades: funcionalidades ?? [], reviewUi, reviewCode, similares: similares ?? [] }) })
                  .then(r => r.json())
                  .then(d => { setSpec(d.spec ?? d.error ?? 'Erro'); setActivePanel('spec') })
                  .catch(() => setSpec('Erro ao gerar spec'))
                  .finally(() => setLoadingSpec(false))
              }}
              disabled={loadingSpec || !canGenerate}
              className={`flex items-center gap-3 p-4 bg-card rounded-xl border transition-all text-left ${canGenerate ? 'border-border hover:border-primary/30' : 'border-border/50 opacity-60 cursor-not-allowed'}`}
            >
              <div className="h-9 w-9 rounded-lg bg-emerald-900/40 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-emerald-400" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Gerar Spec</p>
                <p className="text-xs text-muted-foreground truncate">
                  {loadingSpec ? 'Gerando...' : spec ? (activePanel === 'spec' ? 'Fechar' : 'Ver resultado') : !canGenerate ? `Falta: ${missing.join(', ')}` : 'Todas as análises prontas'}
                </p>
              </div>
            </button>
          )
        })()}

        <button
          onClick={() => togglePanel('acessos')}
          className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all text-left"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-900/40 flex items-center justify-center shrink-0"><ClipboardCheck className="h-4 w-4 text-amber-400" /></div>
          <div>
            <p className="text-sm font-medium text-foreground">Checklist de Acessos</p>
            <p className="text-xs text-muted-foreground">
              {activePanel === 'acessos' ? 'Fechar' : (() => {
                const a = artifact as any
                const auto = [a?.github_url, (a?.content ?? '').match(/supabase/i), (a?.source_url ?? '').includes('vercel.app')].filter(Boolean).length
                return `${auto}/5 detectados automaticamente`
              })()}
            </p>
          </div>
        </button>
      </div>

      {/* ── Resultados das ferramentas (abaixo dos botões) ── */}

      {activePanel === 'ui' && reviewUi && typeof reviewUi === 'object' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Monitor className="h-4 w-4 text-violet-400" /> Revisão de UI — Score {reviewUi.score_ui}/100</h2>
            <button onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-muted-foreground">{reviewUi.resumo}</p>
          {reviewUi.categorias?.map((cat: any, ci: number) => (
            <div key={ci} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.nome} {cat.score != null && `— ${cat.score}/100`}</h3>
              {cat.itens?.map((item: any, ii: number) => (
                <div key={ii} className={`rounded-lg border p-3 text-xs space-y-1 ${item.status === 'ok' ? 'border-emerald-800/40 bg-emerald-950/20' : item.status === 'erro' ? 'border-red-800/40 bg-red-950/20' : 'border-amber-800/40 bg-amber-950/20'}`}>
                  <p className="font-medium text-foreground">{item.item}</p>
                  <p className="text-muted-foreground">{item.detalhe}</p>
                  {item.sugestao && <p className="text-primary">{item.sugestao}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activePanel === 'code' && reviewCode && typeof reviewCode === 'object' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Code2 className="h-4 w-4 text-cyan-400" /> Revisão de Código — Score {reviewCode.score_code}/100</h2>
            <button onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-muted-foreground">{reviewCode.resumo}</p>
          {reviewCode.categorias?.map((cat: any, ci: number) => (
            <div key={ci} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.nome}</h3>
              {cat.itens?.map((item: any, ii: number) => (
                <div key={ii} className={`rounded-lg border p-3 text-xs space-y-1 ${item.status === 'ok' ? 'border-emerald-800/40 bg-emerald-950/20' : item.status === 'erro' ? 'border-red-800/40 bg-red-950/20' : 'border-amber-800/40 bg-amber-950/20'}`}>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{item.item}</p>
                    {item.arquivo && <span className="font-mono text-muted-foreground/50">{item.arquivo}</span>}
                  </div>
                  <p className="text-muted-foreground">{item.detalhe}</p>
                  {item.sugestao && <p className="text-primary">{item.sugestao}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activePanel === 'spec' && spec && typeof spec === 'object' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-400" /> Spec — {spec.nome}</h2>
            <button onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-muted-foreground">{spec.descricao}</p>
          {spec.publico_alvo && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Público:</span> {spec.publico_alvo}</p>}
          {spec.stack?.length > 0 && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Stack:</span> {spec.stack.join(', ')}</p>}
          {spec.funcionalidades?.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Funcionalidades</h3>
              {spec.funcionalidades.map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${f.prioridade === 'essencial' ? 'bg-red-900/40 text-red-300' : f.prioridade === 'importante' ? 'bg-amber-900/40 text-amber-300' : 'bg-blue-900/40 text-blue-300'}`}>{f.prioridade}</span>
                  <div><span className="font-medium text-foreground">{f.nome}</span> <span className="text-muted-foreground">— {f.descricao}</span></div>
                </div>
              ))}
            </div>
          )}
          {spec.integrações?.length > 0 && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Integrações:</span> {spec.integrações.join(', ')}</p>}
          {spec.riscos?.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Riscos</h3>
              {spec.riscos.map((r: string, i: number) => <p key={i} className="text-xs text-amber-400">• {r}</p>)}
            </div>
          )}
          {spec.proximos_passos?.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Próximos passos</h3>
              {spec.proximos_passos.map((p: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {p}</p>)}
            </div>
          )}
        </div>
      )}

      {activePanel === 'acessos' && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-amber-400" /> Checklist de Acessos</h2>
            <button onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-4 w-4" /></button>
          </div>
          {[
            { key: 'github', label: 'GitHub', auto: !!artifact?.github_url, detail: artifact?.github_url ?? 'Não vinculado' },
            { key: 'supabase', label: 'Supabase', auto: !!(artifact?.content ?? '').match(/supabase/i), detail: (artifact?.content ?? '').match(/supabase/i) ? 'Detectado no código' : 'Não detectado' },
            { key: 'vercel', label: 'Vercel', auto: !!(artifact?.source_url ?? '').includes('vercel.app'), detail: (artifact?.source_url ?? '').includes('vercel.app') ? artifact?.source_url : 'Não detectado' },
            { key: 'dominio', label: 'Domínio personalizado', auto: !!(artifact?.source_url && !artifact.source_url.includes('.vercel.app') && !artifact.source_url.includes('.lovable.app')), detail: artifact?.source_url && !artifact.source_url.includes('.vercel.app') && !artifact.source_url.includes('.lovable.app') ? artifact.source_url : 'Usando domínio padrão' },
            { key: 'staging', label: 'Staging', auto: false, detail: 'Verificação manual' },
          ].map(({ key, label, auto, detail }) => (
            <button
              key={key}
              onClick={() => setAcessos(prev => ({ ...prev, [key]: !prev[key] }))}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors text-left"
            >
              {(acessos[key] || auto) ? (
                <SquareCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${(acessos[key] || auto) ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                <p className="text-xs text-muted-foreground/60 truncate">{detail}</p>
              </div>
              {auto && <span className="text-[10px] text-emerald-400 font-medium shrink-0">Auto</span>}
            </button>
          ))}
        </div>
      )}

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
