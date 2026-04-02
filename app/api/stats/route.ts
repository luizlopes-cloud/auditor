import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: laudos } = await supabase
      .from('laudos')
      .select('resultado, score, created_at, artifacts(submitted_by, type)')
      .order('created_at', { ascending: true })

    if (!laudos?.length) {
      return NextResponse.json({ ranking: [], categorias: [], tendencia: [] })
    }

    // ── Ranking por submitter ──────────────────────────────────────────────
    const submitterMap = new Map<string, { total: number; soma: number; aprovados: number }>()
    for (const l of laudos) {
      const a = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
      if (!a?.submitted_by) continue
      const cur = submitterMap.get(a.submitted_by) ?? { total: 0, soma: 0, aprovados: 0 }
      cur.total++
      cur.soma += l.score ?? 0
      if (l.resultado === 'aprovado') cur.aprovados++
      submitterMap.set(a.submitted_by, cur)
    }
    const ranking = [...submitterMap.entries()]
      .map(([nome, { total, soma, aprovados }]) => ({
        nome,
        total,
        media: Math.round(soma / total),
        aprovados,
      }))
      .sort((a, b) => b.media - a.media || b.total - a.total)
      .slice(0, 8)

    // ── Breakdown por tipo ─────────────────────────────────────────────────
    const tipoMap = new Map<string, { total: number; soma: number }>()
    for (const l of laudos) {
      const a = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
      if (!a?.type) continue
      const cur = tipoMap.get(a.type) ?? { total: 0, soma: 0 }
      cur.total++
      cur.soma += l.score ?? 0
      tipoMap.set(a.type, cur)
    }
    const tipoLabel: Record<string, string> = {
      script: 'Script', planilha: 'Planilha', flow: 'Flow',
      dashboard: 'Dashboard', query: 'Query', outro: 'Outro',
    }
    const categorias = [...tipoMap.entries()]
      .map(([tipo, { total, soma }]) => ({
        tipo,
        label: tipoLabel[tipo] ?? tipo,
        total,
        media: Math.round(soma / total),
      }))
      .sort((a, b) => b.total - a.total)

    // ── Tendência semanal (últimas 6 semanas) ──────────────────────────────
    const now = new Date()
    const weekKeys: string[] = []
    const weekData = new Map<string, { total: number; soma: number }>()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = getWeekStart(d)
      if (!weekData.has(key)) {
        weekKeys.push(key)
        weekData.set(key, { total: 0, soma: 0 })
      }
    }

    for (const l of laudos) {
      const key = getWeekStart(new Date(l.created_at ?? ''))
      if (weekData.has(key)) {
        const cur = weekData.get(key)!
        cur.total++
        cur.soma += l.score ?? 0
      }
    }

    const tendencia = weekKeys.map(key => {
      const { total, soma } = weekData.get(key)!
      const d = new Date(key + 'T12:00:00')
      return {
        semana: key,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        total,
        media: total > 0 ? Math.round(soma / total) : null,
      }
    })

    return NextResponse.json({ ranking, categorias, tendencia })
  } catch (err) {
    console.error('[stats] error:', err)
    return NextResponse.json({ ranking: [], categorias: [], tendencia: [] })
  }
}
