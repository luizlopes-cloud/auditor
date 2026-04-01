import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const qs = new URL(req.url).searchParams
    const resultado = qs.get('resultado')
    const tipo = qs.get('tipo')
    const limit = Math.min(parseInt(qs.get('limit') ?? '50'), 100)

    const supabase = await createClient()

    let query = supabase
      .from('laudos')
      .select(`
        id,
        resultado,
        score,
        resumo,
        created_at,
        model_used,
        artifacts (
          id,
          name,
          type,
          submitted_by,
          source,
          source_url,
          github_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (resultado) query = query.eq('resultado', resultado as 'aprovado' | 'ajustes_necessarios' | 'reprovado')
    if (tipo) query = query.eq('artifacts.type', tipo as 'script' | 'planilha' | 'flow' | 'dashboard' | 'query' | 'outro')

    const { data, error } = await query

    if (error) {
      console.error('[laudos] query error:', error)
      return NextResponse.json({ error: 'Erro ao buscar laudos' }, { status: 500 })
    }

    return NextResponse.json({ laudos: data ?? [] })
  } catch (err) {
    console.error('[laudos] unhandled error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
