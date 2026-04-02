import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: laudos } = await supabase
      .from('laudos')
      .select('id, resultado, score, created_at, spec, artifacts(name, type)')
      .not('spec', 'is', null)
      .order('created_at', { ascending: false })

    const specs = (laudos ?? []).map((l: any) => {
      const art = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
      const spec = l.spec as any
      return {
        laudo_id: l.id,
        artifact_name: art?.name ?? 'Sem nome',
        artifact_type: art?.type ?? 'outro',
        resultado: l.resultado,
        score: l.score,
        spec_nome: spec?.nome ?? art?.name ?? 'Sem nome',
        spec_descricao: spec?.descricao ?? '',
        spec_stack: spec?.stack ?? [],
        func_count: spec?.funcionalidades?.length ?? 0,
        created_at: l.created_at,
      }
    })

    return NextResponse.json({ specs })
  } catch (err) {
    console.error('[specs] error:', err)
    return NextResponse.json({ specs: [] })
  }
}
