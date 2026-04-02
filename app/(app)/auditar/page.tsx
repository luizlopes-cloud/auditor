'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisLoading } from '@/components/AnalysisLoading'
import { ScoreBadge } from '@/components/ScoreBadge'
import { cn } from '@/lib/utils'
import { Link2, Code2, Upload, ArrowRight, GitBranch } from 'lucide-react'

function normalizeUrl(u: string): string {
  const t = u.trim()
  if (!t || /^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

type Mode = 'url' | 'code' | 'file'

const MODES = [
  { id: 'url' as Mode, label: 'URL', icon: Link2 },
  { id: 'code' as Mode, label: 'Colar código', icon: Code2 },
  { id: 'file' as Mode, label: 'Upload arquivo', icon: Upload },
]

export default function AuditarPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('url')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ laudo_id: string; resultado: string; score: number } | null>(null)
  const [duplicate, setDuplicate] = useState<{ laudo_id: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [url, setUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [code, setCode] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setFileContent(ev.target?.result as string)
    reader.readAsText(file)
  }

  const detectUrlHint = (u: string): string => {
    if (!u) return ''
    try {
      const host = new URL(normalizeUrl(u)).hostname.toLowerCase()
      if (host === 'github.com') return 'GitHub detectado — buscando repositório ou arquivo...'
      if (host.endsWith('.lovable.app') || host.endsWith('.lovable.dev')) return 'Lovable detectado — buscando código...'
      if (host.endsWith('.vercel.app')) return 'Vercel detectado — buscando aplicação...'
      return 'Link externo — buscando página...'
    } catch { return '' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setDuplicate(null)
    setLoading(true)
    setLoadingStep(0)

    const body: Record<string, string> = {
      mode,
      name,
      description,
      submitted_by: submittedBy,
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
        setDuplicate({ laudo_id: data.existing_laudo_id })
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Erro desconhecido')
        setLoading(false)
        return
      }

      setResult(data)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const urlHint = detectUrlHint(url)

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Auditar artefato</h1>
        <p className="text-muted-foreground mt-1">Envie um artefato para homologação automática via IA</p>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <AnalysisLoading step={loadingStep} />
        </div>
      ) : result ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 animate-in fade-in duration-500">
          <ScoreBadge
            resultado={result.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
            score={result.score}
            showBar
            size="lg"
          />
          <p className="text-muted-foreground text-sm">Laudo gerado com sucesso.</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/laudos/${result.laudo_id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Ver laudo completo
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setResult(null); setUrl(''); setCode(''); setFileContent(''); setFileName('') }}
              className="px-4 py-2 border border-border text-muted-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              Novo artefato
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex border-b border-border">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                    mode === id
                      ? 'bg-primary/10 text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {mode === 'url' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                      URL do artefato <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://meu-projeto.lovable.app ou github.com/org/repo"
                      required
                      className={inputCls}
                    />
                    {urlHint && (
                      <p className="mt-1.5 text-xs text-primary">{urlHint}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                      <GitBranch className="inline h-3.5 w-3.5 mr-1" />
                      GitHub do projeto (opcional)
                    </label>
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/org/repo — se Lovable/Vercel tiver repo vinculado"
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {mode === 'code' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">Nome do arquivo (opcional)</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      placeholder="script.py, query.sql, workflow.json..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                      Código <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      required
                      rows={10}
                      placeholder="Cole o código aqui..."
                      className={cn(inputCls, 'font-mono resize-y')}
                    />
                  </div>
                </>
              )}

              {mode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Arquivo <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".py,.ts,.js,.sql,.json,.yaml,.yml,.txt,.md,.csv,.sh"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/15 file:text-primary hover:file:bg-primary/25"
                  />
                  {fileContent && (
                    <p className="mt-1.5 text-xs text-emerald-400">{fileName} carregado ({fileContent.length.toLocaleString()} chars)</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground/80">Informações do artefato</h2>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Nome do artefato</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Script de importação Pipedrive" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Objetivo do artefato</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="O que este artefato deve fazer? Quanto mais contexto, melhor o laudo."
                className={cn(inputCls, 'resize-none')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Quem está submetendo <span className="text-red-400">*</span>
              </label>
              <input type="text" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} placeholder="Seu nome ou equipe" required className={inputCls} />
            </div>
          </div>

          {duplicate && (
            <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300 flex items-center justify-between gap-3">
              <span>Este artefato já foi analisado anteriormente.</span>
              {duplicate.laudo_id && (
                <button
                  type="button"
                  onClick={() => router.push(`/laudos/${duplicate.laudo_id}`)}
                  className="shrink-0 text-amber-300 underline hover:text-amber-200"
                >
                  Ver laudo existente →
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            Gerar laudo
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  )
}
