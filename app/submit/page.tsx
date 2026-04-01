'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisLoading } from '@/components/AnalysisLoading'
import { ScoreBadge } from '@/components/ScoreBadge'
import { ArrowRight, Link2, Code2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      const host = new URL(u).hostname.toLowerCase()
      if (host === 'github.com') return { label: 'GitHub', color: 'text-slate-600' }
      if (host.endsWith('.lovable.app') || host.endsWith('.lovable.dev')) return { label: 'Lovable', color: 'text-purple-600' }
      if (host.endsWith('.vercel.app')) return { label: 'Vercel', color: 'text-slate-600' }
      return { label: 'Link externo', color: 'text-slate-500' }
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
      body.url = url
      if (githubUrl) body.github_url = githubUrl
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Auditor</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500">Seazone</span>
          </div>
          <a href="/dashboard" className="text-sm text-slate-500 hover:text-foreground transition-colors">
            Ver dashboard
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">

          {loading ? (
            <div className="text-center">
              <AnalysisLoading step={loadingStep} />
            </div>
          ) : result ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Laudo gerado!</h1>
                <p className="text-slate-500 mt-1">A análise foi concluída com sucesso.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 inline-block">
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
                  className="w-full px-6 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Submeter outro artefato
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Headline */}
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-foreground">Homologar artefato</h1>
                <p className="text-slate-500 mt-2 text-base">
                  Cole o link ou o código — a IA analisa e gera o laudo automaticamente.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mode toggle */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMode('url')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all',
                      mode === 'url'
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
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
                        ? 'bg-white text-foreground shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Code2 className="h-4 w-4" />
                    Colar código
                  </button>
                </div>

                {/* Main input */}
                {mode === 'url' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        required
                        placeholder="https://meu-projeto.lovable.app ou github.com/org/repo"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      {hint && (
                        <span className={cn('absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium', hint.color)}>
                          {hint.label}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="GitHub do projeto (opcional, se Lovable/Vercel)"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      placeholder="Nome do arquivo (ex: script.py, query.sql)"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <textarea
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      required
                      rows={8}
                      placeholder="Cole o código aqui..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    />
                  </div>
                )}

                {/* Description */}
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="O que esse artefato faz? (opcional, mas melhora muito o laudo)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />

                {/* Submitter */}
                <input
                  type="text"
                  value={submittedBy}
                  onChange={e => setSubmittedBy(e.target.value)}
                  placeholder="Seu nome ou equipe (opcional)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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

              <p className="text-center text-xs text-slate-400 mt-6">
                Análise automática via IA · Resultado em ~10 segundos
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
