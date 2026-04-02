'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ExternalLink, CheckCircle2, Clock, FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, Globe, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcon: Record<string, React.ElementType> = {
  script: FileCode2,
  planilha: FileSpreadsheet,
  flow: GitBranch,
  dashboard: LayoutDashboard,
  query: Database,
  outro: Globe,
}

const typeLabel: Record<string, string> = {
  script: 'Script',
  planilha: 'Planilha',
  flow: 'Flow',
  dashboard: 'Dashboard',
  query: 'Query',
  outro: 'Outro',
}

const typeGradient: Record<string, string> = {
  script: 'from-blue-600 to-blue-900',
  planilha: 'from-emerald-600 to-emerald-900',
  flow: 'from-purple-600 to-purple-900',
  dashboard: 'from-amber-500 to-amber-800',
  query: 'from-orange-600 to-orange-900',
  outro: 'from-slate-500 to-slate-800',
}

export default function CatalogDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [laudo, setLaudo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/laudos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setLaudo(data.laudo)
      })
      .catch(() => setError('Erro ao carregar artefato'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Image src="/seazone-logo.svg" alt="Seazone" width={90} height={15} className="brightness-0 invert opacity-90" />
            <span className="text-border">|</span>
            <span className="text-sm font-semibold text-primary">Auditor</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-border/40 border-t-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !laudo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground">{error ?? 'Artefato não encontrado'}</p>
        <Link href="/catalog" className="mt-4 text-sm text-primary hover:underline">Voltar ao catálogo</Link>
      </div>
    )
  }

  const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
  const Icon = typeIcon[artifact?.type] ?? Globe
  const gradient = typeGradient[artifact?.type] ?? typeGradient.outro
  const date = new Date(laudo.created_at ?? '').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const isApproved = laudo.resultado === 'aprovado'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/seazone-logo.svg" alt="Seazone" width={90} height={15} className="brightness-0 invert opacity-90" />
            <span className="text-border">|</span>
            <span className="text-sm font-semibold text-primary">Auditor</span>
          </div>
          <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Catálogo
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Back */}
        <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        {/* Hero */}
        <div className={cn('rounded-2xl bg-gradient-to-br flex items-center justify-center h-48 relative mb-8', gradient)}>
          <Icon className="h-20 w-20 text-white/15" />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-md text-xs font-semibold bg-black/25 backdrop-blur-sm text-white">
              {typeLabel[artifact?.type] ?? 'Outro'}
            </span>
            {isApproved ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/80 backdrop-blur-sm text-white">
                <CheckCircle2 className="h-3 w-3" />
                Aprovado
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-amber-500/80 backdrop-blur-sm text-white">
                <Clock className="h-3 w-3" />
                Em revisão
              </span>
            )}
          </div>
        </div>

        {/* Artifact info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{artifact?.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {artifact?.submitted_by}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {date}
              </span>
            </div>
          </div>

          {artifact?.description && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sobre este artefato</h2>
              <p className="text-foreground/80 leading-relaxed">{artifact.description}</p>
            </div>
          )}

          {laudo.resumo && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Análise</h2>
              <p className="text-foreground/80 leading-relaxed">{laudo.resumo}</p>
            </div>
          )}

          {/* Links */}
          {(artifact?.github_url || artifact?.source_url) && (
            <div className="flex flex-wrap gap-3">
              {artifact?.source_url && (
                <a
                  href={artifact.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Acessar aplicação
                </a>
              )}
              {artifact?.github_url && (
                <a
                  href={artifact.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver no GitHub
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
