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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { aprovacao_manual, nota_aprovacao } = await req.json()

    const supabase = await createClient()
    const update: Record<string, unknown> = {}
    if (aprovacao_manual !== undefined) update.aprovacao_manual = aprovacao_manual
    if (nota_aprovacao !== undefined) update.nota_aprovacao = nota_aprovacao

    const { error } = await supabase
      .from('laudos')
      .update(update as any)
      .eq('id', id)

    if (error) {
      console.error('[laudos PATCH] error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar laudo' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[laudos PATCH] unhandled:', err)
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
