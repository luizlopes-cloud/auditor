'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AnalysisLoading } from '@/components/AnalysisLoading'
import { ScoreBadge } from '@/components/ScoreBadge'
import { ArrowRight, Link2, Code2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function normalizeUrl(u: string): string {
  const trimmed = u.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

type Mode = 'url' | 'code'

export default function SubmitPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('url')
  const [url, setUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [code, setCode] = useState('')
  const [fileName, setFileName] = useState('')
  const [description, setDescription] = useState('')
  const [submittedBy, setSubmittedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ laudo_id: string; resultado: string; score: number } | null>(null)

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
    } else {
      body.code = code
      if (fileName) body.file_name = fileName
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setLoadingStep(2)
      const data = await res.json()
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
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Ver dashboard
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">

          {loading ? (
            <div className="text-center">
              <AnalysisLoading step={loadingStep} />
            </div>
          ) : result ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950/50 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Laudo gerado!</h1>
                <p className="text-muted-foreground mt-1">A análise foi concluída com sucesso.</p>
              </div>
              <div className="bg-card rounded-2xl p-6 inline-block border border-border">
                <ScoreBadge
                  resultado={result.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
                  score={result.score}
                  showBar
                  size="lg"
                />
              </div>
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
                    Colar código
                  </button>
                </div>

                {mode === 'url' ? (
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
    </div>
  )
}
