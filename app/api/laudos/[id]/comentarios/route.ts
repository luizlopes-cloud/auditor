import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comentarios' as any)
      .select('*')
      .eq('laudo_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[comentarios GET] error:', error)
      return NextResponse.json({ comentarios: [] })
    }

    return NextResponse.json({ comentarios: data ?? [] })
  } catch (err) {
    console.error('[comentarios GET] unhandled:', err)
    return NextResponse.json({ comentarios: [] })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { autor, texto } = await req.json()

    if (!autor?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!texto?.trim()) return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comentarios' as any)
      .insert({ laudo_id: id, autor: autor.trim(), texto: texto.trim() })
      .select()
      .single()

    if (error) {
      console.error('[comentarios POST] error:', error)
      return NextResponse.json({ error: 'Erro ao salvar comentário' }, { status: 500 })
    }

    return NextResponse.json({ comentario: data })
  } catch (err) {
    console.error('[comentarios POST] unhandled:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
