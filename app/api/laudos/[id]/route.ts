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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Busca artifact_id antes de deletar
    const { data: laudo } = await supabase
      .from('laudos')
      .select('artifact_id')
      .eq('id', id)
      .maybeSingle()

    if (!laudo) {
      return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })
    }

    // Deleta laudo (artifact fica órfão temporariamente, FK cascade cuida)
    const { error: laudoErr } = await supabase
      .from('laudos')
      .delete()
      .eq('id', id)

    if (laudoErr) {
      return NextResponse.json({ error: 'Erro ao deletar laudo' }, { status: 500 })
    }

    // Deleta artifact associado
    await supabase.from('artifacts').delete().eq('id', laudo.artifact_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[laudos/id DELETE] unhandled error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
