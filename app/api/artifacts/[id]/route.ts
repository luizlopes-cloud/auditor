import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('artifacts')
      .update({ name: name.trim() })
      .eq('id', id)

    if (error) {
      console.error('[artifacts PATCH] error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar nome' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[artifacts PATCH] unhandled:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
