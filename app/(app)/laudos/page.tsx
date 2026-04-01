import { createClient } from '@/lib/supabase/server'
import { LaudoCard } from '@/components/LaudoCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const RESULTADO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'ajustes_necessarios', label: 'Ajustes necessários' },
  { value: 'reprovado', label: 'Reprovado' },
]

const TIPO_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'script', label: 'Script' },
  { value: 'planilha', label: 'Planilha' },
  { value: 'flow', label: 'Flow' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'query', label: 'Query' },
  { value: 'outro', label: 'Outro' },
]

interface PageProps {
  searchParams: Promise<{ resultado?: string; tipo?: string }>
}

export default async function LaudosPage({ searchParams }: PageProps) {
  const { resultado, tipo } = await searchParams

  const supabase = await createClient()

  let query = supabase
    .from('laudos')
    .select(`
      id, resultado, score, resumo, created_at,
      artifacts ( id, name, type, submitted_by )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (resultado) query = query.eq('resultado', resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado')

  const { data: laudos } = await query

  const filtered = tipo
    ? laudos?.filter(l => {
        const art = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
        return art?.type === tipo
      })
    : laudos

  const buildUrl = (key: string, value: string) => {
    const p = new URLSearchParams()
    if (key !== 'resultado') resultado && p.set('resultado', resultado)
    if (key !== 'tipo') tipo && p.set('tipo', tipo)
    if (value) p.set(key, value)
    const s = p.toString()
    return `/laudos${s ? `?${s}` : ''}`
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Laudos</h1>
        <p className="text-muted-foreground mt-1">Histórico de homologações</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1.5">
          {RESULTADO_OPTIONS.map(opt => (
            <Link
              key={opt.value}
              href={buildUrl('resultado', opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                (resultado ?? '') === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <div className="h-6 w-px bg-border self-center mx-1" />
        <div className="flex gap-1.5 flex-wrap">
          {TIPO_OPTIONS.map(opt => (
            <Link
              key={opt.value}
              href={buildUrl('tipo', opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                (tipo ?? '') === opt.value
                  ? 'bg-foreground/90 text-background'
                  : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {!filtered?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum laudo encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(laudo => {
            const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
            if (!artifact) return null
            return (
              <LaudoCard
                key={laudo.id}
                id={laudo.id}
                name={artifact.name}
                type={artifact.type as 'script' | 'planilha' | 'flow' | 'dashboard' | 'query' | 'outro'}
                resultado={laudo.resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado'}
                score={laudo.score ?? 0}
                resumo={laudo.resumo}
                submittedBy={artifact.submitted_by}
                createdAt={laudo.created_at ?? ''}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
