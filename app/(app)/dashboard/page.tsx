import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/StatCard'
import { LaudoCard } from '@/components/LaudoCard'
import { ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()

  const [{ data: laudos }, { data: counts }] = await Promise.all([
    supabase
      .from('laudos')
      .select(`
        id, resultado, score, resumo, created_at,
        artifacts ( id, name, type, submitted_by )
      `)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('laudos')
      .select('resultado'),
  ])

  const total = counts?.length ?? 0
  const aprovados = counts?.filter(l => l.resultado === 'aprovado').length ?? 0
  const ajustes = counts?.filter(l => l.resultado === 'ajustes_necessarios').length ?? 0
  const reprovados = counts?.filter(l => l.resultado === 'reprovado').length ?? 0
  const avgScore = total > 0
    ? Math.round((laudos ?? []).reduce((acc, l) => acc + (l.score ?? 0), 0) / Math.min((laudos ?? []).length, total))
    : 0

  return { laudos: laudos ?? [], total, aprovados, ajustes, reprovados, avgScore }
}

export default async function DashboardPage() {
  const { laudos, total, aprovados, ajustes, reprovados } = await getDashboardData()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral das homologações</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total de laudos" value={total} />
        <StatCard label="Aprovados" value={aprovados} accent="emerald" sub={total ? `${Math.round(aprovados / total * 100)}% do total` : undefined} />
        <StatCard label="Ajustes necessários" value={ajustes} accent="amber" sub={total ? `${Math.round(ajustes / total * 100)}% do total` : undefined} />
        <StatCard label="Reprovados" value={reprovados} accent="red" sub={total ? `${Math.round(reprovados / total * 100)}% do total` : undefined} />
      </div>

      {/* Últimos laudos */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos laudos</h2>

        {laudos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <ShieldCheck className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum laudo ainda</p>
            <p className="text-slate-400 text-sm mt-1">
              Acesse <span className="font-medium text-blue-600">Auditar</span> para homologar seu primeiro artefato
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {laudos.map(laudo => {
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
    </div>
  )
}
