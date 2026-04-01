import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: laudo, error } = await supabase
      .from('laudos')
      .select(`
        *,
        artifacts (*)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[laudos/id] query error:', error)
      return NextResponse.json({ error: 'Erro ao buscar laudo' }, { status: 500 })
    }

    if (!laudo) {
      return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ laudo })
  } catch (err) {
    console.error('[laudos/id] unhandled error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
