import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, equipe } = body

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()

    const update: Record<string, string | null> = {}
    if (name !== undefined) update.name = name.trim()
    if (equipe !== undefined) update.equipe = equipe?.trim() || null

    const { error } = await supabase
      .from('artifacts')
      .update(update as any)
      .eq('id', id)

    if (error) {
      console.error('[artifacts PATCH] error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar artefato' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[artifacts PATCH] unhandled:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
