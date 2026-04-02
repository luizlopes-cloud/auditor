'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisLoading } from '@/components/AnalysisLoading'
import { ScoreBadge } from '@/components/ScoreBadge'
import { cn } from '@/lib/utils'
import { Link2, Code2, Upload, ArrowRight, GitBranch } from 'lucide-react'
import { FloatingAssistant } from '@/components/FloatingAssistant'

function normalizeUrl(u: string): string {
  const t = u.trim()
  if (!t || /^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

type Mode = 'url' | 'code' | 'file'

const MODES = [
  { id: 'url' as Mode, label: 'URL', icon: Link2 },
  { id: 'code' as Mode, label: 'Código', icon: Code2 },
  { id: 'file' as Mode, label: 'Arquivo', icon: Upload },
]

export default function SubmitPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('url')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ laudo_id: string; resultado: string; score: number; sem_github?: boolean } | null>(null)
  const [duplicate, setDuplicate] = useState<{ laudo_id: string; artifact_id?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const codeFileRef = useRef<HTMLInputElement>(null)

  const [url, setUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [code, setCode] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [description, setDescription] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')

  const loadFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setFileContent(ev.target?.result as string)
    reader.readAsText(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    loadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setMode('file')
    loadFile(file)
  }

  const handleNewVersion = async () => {
    setError(null)
    setDuplicate(null)
    setLoading(true)
    setLoadingStep(0)
    const body: Record<string, string | boolean> = {
      mode, description, submitted_by: submittedBy, force: true,
    }
    if (mode === 'url') { body.url = normalizeUrl(url); if (githubUrl) body.github_url = normalizeUrl(githubUrl) }
    else if (mode === 'code') { body.code = code; if (fileName) body.file_name = fileName }
    else { body.file_name = fileName; body.file_content = fileContent }
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setLoadingStep(2)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); return }
      setResult(data)
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setDuplicate(null)
    setLoading(true)
    setLoadingStep(0)

    const body: Record<string, string> = { mode, description, submitted_by: submittedBy }
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
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setLoadingStep(2)
      const data = await res.json()
      if (res.status === 409) { setDuplicate({ laudo_id: data.existing_laudo_id, artifact_id: data.existing_artifact_id }); setLoading(false); return }
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); setLoading(false); return }
      setResult(data)
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors'

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Auditar artefato</h1>
        <p className="text-muted-foreground text-sm mt-1">Envie um artefato para homologação automática via IA</p>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <AnalysisLoading step={loadingStep} />
        </div>
      ) : result ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 animate-in fade-in duration-500">
          <ScoreBadge resultado={result.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'} score={result.score} showBar size="lg" />
          {result.sem_github && (
            <p className="text-xs text-amber-400/80">Análise baseada em HTML compilado. Para laudo mais preciso, publique o código no GitHub.</p>
          )}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => router.push(`/laudos/${result.laudo_id}`)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Ver laudo <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => router.push('/catalog')} className="px-4 py-2 border border-border text-muted-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors">
              Catálogo
            </button>
            <button onClick={() => { setResult(null); setUrl(''); setCode(''); setFileContent(''); setFileName('') }} className="px-4 py-2 text-muted-foreground/60 text-sm hover:text-muted-foreground transition-colors">
              Novo
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="space-y-4"
        >
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Mode tabs */}
            <div className="flex border-b border-border">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id} type="button" onClick={() => setMode(id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                    mode === id ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3">
              {/* URL mode */}
              {mode === 'url' && (
                <>
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://meu-projeto.lovable.app ou github.com/org/repo" required className={inputCls} />
                  <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="GitHub do projeto (opcional)" className={inputCls} />
                </>
              )}

              {/* Code mode */}
              {mode === 'code' && (
                <>
                  <div className="flex items-center justify-between">
                    <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Nome do arquivo (ex: script.py)" className={cn(inputCls, 'flex-1')} />
                    <button type="button" onClick={() => codeFileRef.current?.click()} className="ml-2 text-xs text-primary hover:text-primary/80 whitespace-nowrap">
                      <Upload className="h-3.5 w-3.5 inline mr-1" />Importar
                    </button>
                    <input ref={codeFileRef} type="file" className="hidden" accept=".py,.ts,.tsx,.js,.jsx,.sql,.json,.yaml,.yml,.txt,.md,.csv,.sh,.go,.rb,.php,.java,.r,.ipynb,.toml,.xml,.html,.env" onChange={e => { const f = e.target.files?.[0]; if (f) { setFileName(f.name); const r = new FileReader(); r.onload = ev => setCode(ev.target?.result as string); r.readAsText(f) } }} />
                  </div>
                  <textarea value={code} onChange={e => setCode(e.target.value)} required rows={8} placeholder="Cole o código aqui..." className={cn(inputCls, 'font-mono resize-y')} />
                </>
              )}

              {/* File mode */}
              {mode === 'file' && (
                <div>
                  <input ref={fileRef} type="file" accept=".py,.ts,.tsx,.js,.jsx,.sql,.json,.yaml,.yml,.txt,.md,.csv,.sh,.go,.rb,.php,.java,.r,.ipynb,.toml,.xml,.html,.env" onChange={handleFileChange} className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/15 file:text-primary hover:file:bg-primary/25" />
                  {fileContent && <p className="mt-1.5 text-xs text-emerald-400">{fileName} ({fileContent.length.toLocaleString()} chars)</p>}
                </div>
              )}

              {/* Common fields */}
              <div className="border-t border-border/50 pt-3 space-y-3">
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivo do artefato (opcional)" className={inputCls} />
                <input type="text" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} placeholder="Seu nome *" required className={inputCls} />
              </div>
            </div>
          </div>

          {duplicate && (
            <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-300 space-y-2">
              <p className="font-medium">Artefato já analisado.</p>
              <div className="flex flex-wrap gap-2">
                {duplicate.laudo_id && <button type="button" onClick={() => router.push(`/laudos/${duplicate.laudo_id}`)} className="text-amber-300 underline hover:text-amber-200 text-xs">Ver laudo existente →</button>}
                <button type="button" onClick={handleNewVersion} className="text-primary underline hover:text-primary/80 text-xs">Re-analisar</button>
              </div>
            </div>
          )}

          {error && <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}

          <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
            Gerar laudo <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
      <FloatingAssistant initialMessage="Posso te ajudar a submeter seu artefato ou tirar dúvidas sobre o processo." />
    </div>
  )
}
