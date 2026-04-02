import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/StatCard'
import { LaudoCard } from '@/components/LaudoCard'
import { ShieldCheck, Trophy, BarChart3, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

const tipoLabel: Record<string, string> = {
  script: 'Script', planilha: 'Planilha', flow: 'Flow',
  dashboard: 'Dashboard', query: 'Query', outro: 'Outro',
}

async function getDashboardData() {
  const supabase = await createClient()

  const [{ data: recentLaudos }, { data: allLaudos }] = await Promise.all([
    supabase
      .from('laudos')
      .select('id, resultado, score, resumo, created_at, artifacts(id, name, type, submitted_by)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('laudos')
      .select('resultado, score, created_at, artifacts(submitted_by, type)')
      .order('created_at', { ascending: true }),
  ])

  const total = allLaudos?.length ?? 0
  const aprovados = allLaudos?.filter(l => l.resultado === 'aprovado').length ?? 0
  const ajustes = allLaudos?.filter(l => l.resultado === 'ajustes_necessarios').length ?? 0
  const reprovados = allLaudos?.filter(l => l.resultado === 'reprovado').length ?? 0

  // Ranking
  const submitterMap = new Map<string, { total: number; soma: number; aprovados: number }>()
  for (const l of allLaudos ?? []) {
    const a = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
    if (!a?.submitted_by) continue
    const cur = submitterMap.get(a.submitted_by) ?? { total: 0, soma: 0, aprovados: 0 }
    cur.total++; cur.soma += l.score ?? 0
    if (l.resultado === 'aprovado') cur.aprovados++
    submitterMap.set(a.submitted_by, cur)
  }
  const ranking = [...submitterMap.entries()]
    .map(([nome, { total: t, soma, aprovados: ap }]) => ({ nome, total: t, media: Math.round(soma / t), aprovados: ap }))
    .sort((a, b) => b.media - a.media || b.total - a.total)
    .slice(0, 5)

  // Categorias
  const tipoMap = new Map<string, { total: number; soma: number }>()
  for (const l of allLaudos ?? []) {
    const a = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
    if (!a?.type) continue
    const cur = tipoMap.get(a.type) ?? { total: 0, soma: 0 }
    cur.total++; cur.soma += l.score ?? 0
    tipoMap.set(a.type, cur)
  }
  const categorias = [...tipoMap.entries()]
    .map(([tipo, { total: t, soma }]) => ({ tipo, label: tipoLabel[tipo] ?? tipo, total: t, media: Math.round(soma / t) }))
    .sort((a, b) => b.total - a.total)

  // Tendência semanal
  const now = new Date()
  const weekKeys: string[] = []
  const weekData = new Map<string, { total: number; soma: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = getWeekStart(d)
    if (!weekData.has(key)) { weekKeys.push(key); weekData.set(key, { total: 0, soma: 0 }) }
  }
  for (const l of allLaudos ?? []) {
    const key = getWeekStart(new Date(l.created_at ?? ''))
    if (weekData.has(key)) { const cur = weekData.get(key)!; cur.total++; cur.soma += l.score ?? 0 }
  }
  const tendencia = weekKeys.map(key => {
    const { total: t, soma } = weekData.get(key)!
    const d = new Date(key + 'T12:00:00')
    return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), total: t, media: t > 0 ? Math.round(soma / t) : null }
  })

  return { laudos: recentLaudos ?? [], total, aprovados, ajustes, reprovados, ranking, categorias, tendencia }
}

export default async function DashboardPage() {
  const { laudos, total, aprovados, ajustes, reprovados, ranking, categorias, tendencia } = await getDashboardData()

  const maxMedia = Math.max(...ranking.map(r => r.media), 1)
  const maxCatMedia = Math.max(...categorias.map(c => c.media), 1)
  const maxTendTotal = Math.max(...tendencia.map(t => t.total), 1)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral das homologações</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total de laudos" value={total} />
        <StatCard label="Aprovados" value={aprovados} accent="emerald" sub={total ? `${Math.round(aprovados / total * 100)}% do total` : undefined} />
        <StatCard label="Ajustes necessários" value={ajustes} accent="amber" sub={total ? `${Math.round(ajustes / total * 100)}% do total` : undefined} />
        <StatCard label="Reprovados" value={reprovados} accent="red" sub={total ? `${Math.round(reprovados / total * 100)}% do total` : undefined} />
      </div>

      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* Ranking */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Placar de qualidade</h2>
            </div>
            <div className="space-y-3">
              {ranking.map((r, i) => (
                <div key={r.nome}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground/50 w-4 shrink-0">{i + 1}.</span>
                      <span className="text-sm text-foreground truncate">{r.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground/60">{r.total}×</span>
                      <span className="text-sm font-semibold text-foreground w-8 text-right">{r.media}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40">
                    <div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${(r.media / maxMedia) * 100}%` }} />
                  </div>
                </div>
              ))}
              {ranking.length === 0 && <p className="text-sm text-muted-foreground/60">Sem dados.</p>}
            </div>
          </div>

          {/* Score por tipo */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Score por tipo</h2>
            </div>
            <div className="space-y-3">
              {categorias.map(c => (
                <div key={c.tipo}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{c.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground/60">{c.total}×</span>
                      <span className={`text-sm font-semibold w-8 text-right ${c.media >= 80 ? 'text-emerald-400' : c.media >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{c.media}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40">
                    <div
                      className={`h-1.5 rounded-full ${c.media >= 80 ? 'bg-emerald-500/70' : c.media >= 60 ? 'bg-amber-500/70' : 'bg-red-500/70'}`}
                      style={{ width: `${(c.media / maxCatMedia) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {categorias.length === 0 && <p className="text-sm text-muted-foreground/60">Sem dados.</p>}
            </div>
          </div>

          {/* Tendência semanal */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Tendência semanal</h2>
            </div>
            <div className="flex items-end gap-1.5 h-20 mb-2">
              {tendencia.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '80px' }}>
                  {t.total > 0 && <span className="text-[9px] text-muted-foreground/60 leading-none">{t.media}</span>}
                  <div
                    className={`w-full rounded-t-sm ${t.media !== null && t.media >= 80 ? 'bg-emerald-500/70' : t.media !== null && t.media >= 60 ? 'bg-amber-500/70' : 'bg-red-500/70'} ${t.total === 0 ? 'opacity-20 bg-muted' : ''}`}
                    style={{ height: `${t.total > 0 ? Math.max(6, (t.total / maxTendTotal) * 60) : 4}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              {tendencia.map((t, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[9px] text-muted-foreground/40 leading-none">{t.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/30 mt-3">Altura = volume · cor = score médio</p>
          </div>

        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Últimos laudos</h2>

        {laudos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border border-dashed border-border">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum laudo ainda</p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Acesse <span className="font-medium text-primary">Auditar</span> para homologar seu primeiro artefato
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
                  artifactId={artifact.id}
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
