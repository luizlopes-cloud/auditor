import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ScoreBadge } from '@/components/ScoreBadge'
import { CheckItem } from '@/components/CheckItem'
import { FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Json } from '@/types/database'

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

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LaudoDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: laudo } = await supabase
    .from('laudos')
    .select(`*, artifacts (*)`)
    .eq('id', id)
    .maybeSingle()

  if (!laudo) notFound()

  const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
  if (!artifact) notFound()

  const checks = (laudo.checks as Json as Check[]) ?? []
  const categories = [...new Set(checks.map(c => c.categoria))]

  const Icon = typeIcon[artifact.type] ?? FileQuestion
  const date = new Date(laudo.created_at ?? '').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/laudos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Voltar para laudos
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{artifact.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-sm text-slate-500">{typeLabel[artifact.type] ?? 'Outro'}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">{artifact.submitted_by}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">{date}</span>
            </div>
            {artifact.description && (
              <p className="mt-2 text-sm text-slate-600">{artifact.description}</p>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-wrap gap-3">
          {artifact.github_url && (
            <a href={artifact.github_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver no GitHub
            </a>
          )}
          {artifact.source_url && (
            <a href={artifact.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver aplicação
            </a>
          )}
          <span className="text-xs text-slate-400">{sourceLabel[artifact.source] ?? artifact.source}</span>
          {laudo.model_used && (
            <span className="text-xs text-slate-400">· {laudo.model_used}</span>
          )}
          {laudo.tempo_analise_ms && (
            <span className="text-xs text-slate-400">· {(laudo.tempo_analise_ms / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>

      {/* Score + Resultado */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <ScoreBadge
          resultado={laudo.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
          score={laudo.score ?? 0}
          showBar
          size="lg"
        />
        <p className="mt-4 text-slate-700">{laudo.resumo}</p>
      </div>

      {/* Checks por categoria */}
      <div className="space-y-6">
        {categories.map(categoria => {
          const categoryChecks = checks.filter(c => c.categoria === categoria)
          const hasError = categoryChecks.some(c => c.status === 'erro')
          const hasWarning = categoryChecks.some(c => c.status === 'aviso')

          return (
            <div key={categoria}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{categoria}</h2>
                {hasError && <span className="h-2 w-2 rounded-full bg-red-500" />}
                {!hasError && hasWarning && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                {!hasError && !hasWarning && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
              </div>
              <div className="space-y-2">
                {categoryChecks.map((check, i) => (
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
