'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AnalysisLoading } from '@/components/AnalysisLoading'
import { ScoreBadge } from '@/components/ScoreBadge'
import { ArrowRight, Link2, Code2, CheckCircle2, Upload, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FloatingAssistant } from '@/components/FloatingAssistant'

function normalizeUrl(u: string): string {
  const trimmed = u.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

type Mode = 'url' | 'code' | 'file'

function GithubActions({ artifactId, laudoId, isLovable, isEditorUrl, lovableProjectId, onLinked }: { artifactId?: string; laudoId?: string; isLovable?: boolean; isEditorUrl?: boolean; lovableProjectId?: string; onLinked?: (url: string) => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [actionResult, setActionResult] = useState<any>(null)
  const [githubInput, setGithubInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [linking, setLinking] = useState(false)

  const run = async (action: string) => {
    if (!artifactId) return
    setLoading(true)
    setActionResult(null)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/github`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      setActionResult(data)
      if (data.success && data.new_url) onLinked?.(data.new_url)
    } catch { setActionResult({ error: 'Erro de conexão' }) }
    finally { setLoading(false) }
  }

  const linkGithub = async () => {
    if (!githubInput.trim() || !artifactId) return
    setLinking(true)
    // Atualiza o artifact com a URL do GitHub
    await fetch(`/api/artifacts/${artifactId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_url: githubInput.trim() }),
    })
    // Re-analisa o laudo existente (não cria novo artefato)
    if (laudoId) {
      const res = await fetch(`/api/laudos/${laudoId}/reanalyze`, { method: 'POST' })
      const data = await res.json()
      setLinking(false)
      if (data.laudo_id) router.push(`/laudos/${data.laudo_id}`)
    } else {
      setLinking(false)
    }
  }

  return (
    <div className="bg-amber-950/30 border border-amber-700/40 rounded-2xl p-5 text-left space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-semibold text-amber-300">Este projeto não está no GitHub</p>
      </div>
      <p className="text-xs text-amber-300/70">Conecte ao GitHub para homologação completa:</p>

      {showInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={githubInput}
            onChange={e => setGithubInput(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full rounded-lg border border-amber-700/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-300/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onKeyDown={e => e.key === 'Enter' && linkGithub()}
          />
          <div className="flex gap-2">
            <button onClick={linkGithub} disabled={linking || !githubInput.trim()}
              className="px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {linking ? 'Re-analisando...' : 'Vincular e re-analisar'}
            </button>
            <button onClick={() => setShowInput(false)}
              className="px-3 py-2 text-amber-300/60 text-xs hover:text-amber-300 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {isLovable && lovableProjectId ? (
            <a
              href={`https://lovable.dev/projects/${lovableProjectId}/settings/integrations?connector=github&subtab=connectors`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-500 transition-colors inline-flex items-center gap-1.5"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Conectar GitHub no Lovable
            </a>
          ) : isLovable ? (
            <button onClick={() => run('lovable_link')} disabled={loading}
              className="px-3 py-2 bg-amber-700/60 text-amber-100 text-xs font-medium rounded-lg hover:bg-amber-600/60 disabled:opacity-50 transition-colors">
              Como conectar no Lovable
            </button>
          ) : null}
          {!isLovable && (
            <button onClick={() => run('create')} disabled={loading}
              className="px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Criando...' : 'Criar repositório'}
            </button>
          )}
          <button onClick={() => setShowInput(true)}
            className="px-3 py-2 border border-amber-700/40 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-950/40 transition-colors">
            Já tenho o GitHub
          </button>
        </div>
      )}

      {actionResult && (
        <div className={`text-xs p-3 rounded-lg ${actionResult.error ? 'bg-red-950/40 text-red-300' : 'bg-emerald-950/40 text-emerald-300'}`}>
          {actionResult.error ?? actionResult.message}
          {actionResult.new_url && <a href={actionResult.new_url} target="_blank" rel="noopener noreferrer" className="block mt-1 text-primary underline">{actionResult.new_url}</a>}
          {actionResult.steps && (
            <ol className="mt-2 space-y-1 list-decimal list-inside">{actionResult.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
          )}
        </div>
      )}

      {/* Guia visual — só quando veio do editor, não do preview */}
      {isLovable && isEditorUrl && (
        <div className="border-t border-amber-700/30 pt-3 space-y-2">
          <p className="text-xs font-medium text-amber-300/70">Ou envie o link de preview para uma analise parcial:</p>
          <div className="space-y-2 text-xs text-amber-300/60">
            <p><span className="text-amber-300 font-medium">1.</span> No editor, clique em <span className="font-medium text-amber-300">Share</span> na barra superior:</p>
          </div>
          <div className="rounded-md overflow-hidden border border-amber-700/30 max-w-[200px]">
            <img src="/guide-lovable-toolbar.jpg" alt="Barra do Lovable" className="w-full h-auto" />
          </div>
          <div className="text-xs text-amber-300/60">
            <p><span className="text-amber-300 font-medium">2.</span> Clique em <span className="font-medium text-amber-300">Share preview</span> e copie o link:</p>
          </div>
          <div className="rounded-md overflow-hidden border border-amber-700/30 max-w-[240px]">
            <img src="/guide-lovable-share.jpg" alt="Painel Share do Lovable" className="w-full h-auto" />
          </div>
          <p className="text-xs text-amber-300/60"><span className="text-amber-300 font-medium">3.</span> Cole o link aqui e re-submeta para analise com o codigo real.</p>
        </div>
      )}
    </div>
  )
}

export default function SubmitPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [code, setCode] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [description, setDescription] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ laudo_id: string; artifact_id?: string; resultado: string; score: number; sem_github?: boolean; org_externa?: boolean; replaced?: boolean; content_changed?: boolean; version?: number } | null>(null)
  const [duplicate, setDuplicate] = useState<{ laudo_id: string; artifact_id: string; existing_name?: string; has_github?: boolean; lovable_project_id?: string } | null>(null)
  const [editorBlock, setEditorBlock] = useState<{ lovable_project_id?: string } | null>(null)

  const detectHint = (u: string) => {
    if (!u) return null
    try {
      const host = new URL(normalizeUrl(u)).hostname.toLowerCase()
      if (host === 'github.com') return { label: 'GitHub', color: 'text-muted-foreground' }
      if (host.endsWith('.lovable.app') || host.endsWith('.lovable.dev')) return { label: 'Lovable', color: 'text-primary' }
      if (host.endsWith('.vercel.app')) return { label: 'Vercel', color: 'text-muted-foreground' }
      return { label: 'Link externo', color: 'text-muted-foreground/70' }
    } catch { return null }
  }

  const hint = mode === 'url' ? detectHint(url) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setDuplicate(null)
    setEditorBlock(null)
    setLoading(true)
    setLoadingStep(0)

    const body: Record<string, string> = {
      mode,
      description,
      submitted_by: submittedBy || 'Anônimo',
    }

    if (mode === 'url') {
      body.url = normalizeUrl(url)
      if (githubUrl) body.github_url = normalizeUrl(githubUrl)
      setTimeout(() => setLoadingStep(1), 900)
    } else if (mode === 'code') {
      body.code = code
      if (fileName) body.file_name = fileName
    } else {
      body.file_name = fileName
      body.file_content = fileContent
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setLoadingStep(2)
      const data = await res.json()
      if (res.status === 409) {
        setDuplicate({ laudo_id: data.existing_laudo_id, artifact_id: data.existing_artifact_id, existing_name: data.existing_name, has_github: data.has_github, lovable_project_id: data.lovable_project_id })
        setLoading(false)
        return
      }
      if (res.status === 422 && data.error === 'link_editor') {
        setEditorBlock({ lovable_project_id: data.lovable_project_id })
        setLoading(false)
        return
      }
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); setLoading(false); return }
      setResult(data)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/seazone-logo.svg" alt="Seazone" width={90} height={15} className="brightness-0 invert opacity-90" />
            <span className="text-border">|</span>
            <span className="text-sm font-semibold text-primary">Auditor</span>
          </div>
          <a href="/catalog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Ver catálogo
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">

          {editorBlock ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/50 mx-auto">
                <GitBranch className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Link do editor detectado</h1>
                <p className="text-muted-foreground mt-1">Para analisar, precisamos do link de preview ou do GitHub.</p>
              </div>

              <div className="bg-amber-950/30 border border-amber-700/40 rounded-2xl p-5 text-left space-y-3">
                {editorBlock.lovable_project_id && (
                  <a
                    href={`https://lovable.dev/projects/${editorBlock.lovable_project_id}/settings/integrations?connector=github&subtab=connectors`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-500 transition-colors"
                  >
                    <GitBranch className="h-4 w-4" />
                    Conectar GitHub no Lovable
                  </a>
                )}

                <p className="text-xs font-medium text-amber-300/70 pt-1">Ou copie o link de preview:</p>
                <div className="space-y-2 text-xs text-amber-300/60">
                  <p><span className="text-amber-300 font-medium">1.</span> No editor, clique em <span className="font-medium text-amber-300">Share</span>:</p>
                </div>
                <div className="rounded-md overflow-hidden border border-amber-700/30 max-w-[200px]">
                  <img src="/guide-lovable-toolbar.jpg" alt="Barra do Lovable" className="w-full h-auto" />
                </div>
                <div className="text-xs text-amber-300/60">
                  <p><span className="text-amber-300 font-medium">2.</span> Clique em <span className="font-medium text-amber-300">Share preview</span> e copie o link:</p>
                </div>
                <div className="rounded-md overflow-hidden border border-amber-700/30 max-w-[240px]">
                  <img src="/guide-lovable-share.jpg" alt="Painel Share" className="w-full h-auto" />
                </div>
              </div>

              <button
                onClick={() => { setEditorBlock(null); setUrl('') }}
                className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                Voltar e colar o link correto
              </button>
            </div>
          ) : duplicate ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/50 mx-auto">
                <GitBranch className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Artefato já analisado</h1>
                {duplicate.existing_name && (
                  <p className="text-primary font-semibold mt-1">{duplicate.existing_name}</p>
                )}
                <p className="text-muted-foreground mt-1">Este artefato já possui um laudo. O que deseja fazer?</p>
              </div>
              {!duplicate.has_github && duplicate.lovable_project_id && (
                <a
                  href={`https://lovable.dev/projects/${duplicate.lovable_project_id}/settings/integrations?connector=github&subtab=connectors`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-500 transition-colors"
                >
                  <GitBranch className="h-4 w-4" />
                  Conectar GitHub no Lovable
                </a>
              )}
              {!duplicate.has_github && !duplicate.lovable_project_id && url.includes('lovable') && (
                <p className="text-xs text-amber-400/80">Este projeto não está no GitHub. Conecte pelo Lovable → Settings → GitHub.</p>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/laudos/${duplicate.laudo_id}`)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Ver laudo existente
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    setDuplicate(null)
                    setLoading(true)
                    setLoadingStep(0)
                    const body: Record<string, string> = { mode, description, submitted_by: submittedBy || 'Anônimo', force: 'true' }
                    if (mode === 'url') { body.url = normalizeUrl(url); if (githubUrl) body.github_url = normalizeUrl(githubUrl) }
                    else if (mode === 'code') { body.code = code; if (fileName) body.file_name = fileName }
                    else { body.file_name = fileName; body.file_content = fileContent }
                    try {
                      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                      const data = await res.json()
                      if (!res.ok) { setError(data.error ?? 'Erro'); return }
                      setResult(data)
                    } catch { setError('Erro de conexão.') }
                    finally { setLoading(false) }
                  }}
                  className="w-full px-6 py-3 border border-border text-muted-foreground font-medium rounded-xl hover:bg-accent transition-colors"
                >
                  Re-analisar mesmo assim
                </button>
                <button
                  onClick={async () => {
                    setDuplicate(null)
                    setLoading(true)
                    setLoadingStep(0)
                    const body: Record<string, string> = { mode, description, submitted_by: submittedBy || 'Anônimo', force: 'true', new_artifact: 'true' }
                    if (mode === 'url') { body.url = normalizeUrl(url); if (githubUrl) body.github_url = normalizeUrl(githubUrl) }
                    else if (mode === 'code') { body.code = code; if (fileName) body.file_name = fileName }
                    else { body.file_name = fileName; body.file_content = fileContent }
                    try {
                      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                      const data = await res.json()
                      if (!res.ok) { setError(data.error ?? 'Erro'); return }
                      setResult(data)
                    } catch { setError('Erro de conexão.') }
                    finally { setLoading(false) }
                  }}
                  className="w-full px-6 py-3 text-amber-400/80 text-sm hover:text-amber-300 transition-colors"
                >
                  Não é o mesmo projeto — criar novo
                </button>
                <button
                  onClick={() => setDuplicate(null)}
                  className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center">
              <AnalysisLoading step={loadingStep} />
            </div>
          ) : result ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950/50 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {result.replaced ? 'Laudo atualizado!' : result.version && result.version > 1 ? `Laudo V${result.version} gerado!` : 'Laudo gerado!'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {result.replaced
                    ? 'O artefato não mudou — o laudo anterior foi substituído pela nova análise.'
                    : result.content_changed
                      ? 'O artefato foi atualizado — nova versão do laudo criada.'
                      : 'A análise foi concluída com sucesso.'}
                </p>
              </div>
              <div className="bg-card rounded-2xl p-6 inline-block border border-border">
                <ScoreBadge
                  resultado={result.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
                  score={result.score}
                  showBar
                  size="lg"
                />
              </div>
              {result.org_externa && (
                <div className="bg-amber-950/30 border border-amber-700/40 rounded-2xl p-5 text-left space-y-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-amber-400" />
                    <p className="text-sm font-semibold text-amber-300">Repositório fora da organização Seazone</p>
                  </div>
                  <p className="text-xs text-amber-300/80">Este projeto está em um repositório pessoal ou em outra organização. Para a homologação ser válida, transfira para a org oficial:</p>
                  <ol className="text-xs text-amber-300/70 space-y-1.5 pl-1">
                    <li><span className="text-amber-300 font-medium">1.</span> No GitHub, vá em <span className="font-mono bg-amber-900/40 px-1 rounded">Settings → Transfer repository</span></li>
                    <li><span className="text-amber-300 font-medium">2.</span> Selecione a organização <span className="font-mono bg-amber-900/40 px-1 rounded">seazone-socios</span> ou <span className="font-mono bg-amber-900/40 px-1 rounded">businessoperations-seazone</span></li>
                    <li><span className="text-amber-300 font-medium">3.</span> Confirme a transferência e re-submeta</li>
                  </ol>
                </div>
              )}
              {result.sem_github && (
                <GithubActions artifactId={result.artifact_id} laudoId={result.laudo_id} isLovable={url.includes('lovable')} isEditorUrl={url.includes('lovable.dev/')} lovableProjectId={(result as any).lovable_project_id} />
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/laudos/${result.laudo_id}`)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Ver laudo completo
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setResult(null); setUrl(''); setCode('') }}
                  className="w-full px-6 py-3 border border-border text-muted-foreground font-medium rounded-xl hover:bg-accent transition-colors"
                >
                  Submeter outro artefato
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-foreground">Homologar artefato</h1>
                <p className="text-muted-foreground mt-2 text-base">
                  Cole o link ou o código — a IA analisa e gera o laudo automaticamente.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMode('url')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all',
                      mode === 'url'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Link2 className="h-4 w-4" />
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('code')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all',
                      mode === 'code'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Code2 className="h-4 w-4" />
                    Código
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('file')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all',
                      mode === 'file'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Arquivo
                  </button>
                </div>

                {mode === 'file' ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".py,.ts,.tsx,.js,.jsx,.sql,.json,.yaml,.yml,.txt,.md,.csv,.sh,.go,.rb,.php,.java,.r,.ipynb,.toml,.xml,.html,.env"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        setFileName(f.name)
                        const reader = new FileReader()
                        reader.onload = ev => setFileContent(ev.target?.result as string)
                        reader.readAsText(f)
                      }}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/15 file:text-primary hover:file:bg-primary/25"
                    />
                    {fileContent && <p className="text-xs text-emerald-400">{fileName} ({fileContent.length.toLocaleString()} chars)</p>}
                  </div>
                ) : mode === 'url' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        required
                        placeholder="https://meu-projeto.lovable.app ou github.com/org/repo"
                        className={inputCls}
                      />
                      {hint && (
                        <span className={cn('absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium', hint.color)}>
                          {hint.label}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="GitHub do projeto (opcional, se Lovable/Vercel)"
                      className={inputCls}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      placeholder="Nome do arquivo (ex: script.py, query.sql)"
                      className={inputCls}
                    />
                    <textarea
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      required
                      rows={8}
                      placeholder="Cole o código aqui..."
                      className={cn(inputCls, 'font-mono resize-none')}
                    />
                  </div>
                )}

                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="O que esse artefato faz? (opcional, mas melhora muito o laudo)"
                  className={cn(inputCls, 'resize-none')}
                />

                <input
                  type="text"
                  value={submittedBy}
                  onChange={e => setSubmittedBy(e.target.value)}
                  placeholder="Seu nome ou equipe (opcional)"
                  className={inputCls}
                />

                {error && (
                  <div className="rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm text-base"
                >
                  Gerar laudo
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground/50 mt-6">
                Análise automática via IA · Resultado em ~10 segundos
              </p>
            </>
          )}
        </div>
      </main>
      <FloatingAssistant initialMessage="Posso te ajudar a submeter seu artefato ou tirar dúvidas sobre o processo." />
    </div>
  )
}
