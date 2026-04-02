import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText, Output } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const SimilarSchema = z.object({
  similares: z.array(z.object({
    id: z.string(),
    motivo: z.string(),
    recomendacao: z.string(),
  })),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Busca o laudo atual
    const { data: current } = await supabase
      .from('laudos')
      .select('id, resumo, artifacts(id, name, type, description)')
      .eq('id', id)
      .maybeSingle()

    if (!current) return NextResponse.json({ similares: [] })

    const currentArtifact = Array.isArray(current.artifacts) ? current.artifacts[0] : current.artifacts

    // Busca outros laudos (excluindo o atual e reprovados)
    const { data: outros } = await supabase
      .from('laudos')
      .select('id, resumo, resultado, artifacts(id, name, type, description)')
      .neq('id', id)
      .neq('resultado', 'reprovado')
      .order('created_at', { ascending: false })
      .limit(40)

    if (!outros?.length) return NextResponse.json({ similares: [] })

    const lista = outros
      .map(l => {
        const a = Array.isArray(l.artifacts) ? l.artifacts[0] : l.artifacts
        if (!a) return null
        return `ID: ${l.id}\nNome: ${a.name}\nTipo: ${a.type}\nDescrição: ${a.description ?? '—'}\nResumo: ${l.resumo}`
      })
      .filter(Boolean)
      .join('\n\n---\n\n')

    const prompt = `Você é um analista de artefatos de automação e integração da Seazone.

ARTEFATO ATUAL:
Nome: ${currentArtifact?.name}
Tipo: ${currentArtifact?.type}
Descrição: ${currentArtifact?.description ?? '—'}
Resumo da análise: ${current.resumo}

OUTROS ARTEFATOS NO CATÁLOGO:
${lista}

Identifique quais artefatos do catálogo têm funcionalidades sobrepostas, duplicadas ou que poderiam ser unificadas com o artefato atual.
Seja criterioso — só liste se houver sobreposição real de funcionalidade ou objetivo.
Para cada similar encontrado, explique brevemente o motivo e dê uma recomendação de unificação.
Se não houver nenhum similar relevante, retorne lista vazia.
Responda em português brasileiro.`

    const result = await generateText({
      model: openrouter(process.env.OPENROUTER_MODEL ?? 'google/gemini-flash-2.0'),
      experimental_output: Output.object({ schema: SimilarSchema }),
      prompt,
      temperature: 0,
    })

    return NextResponse.json(result.experimental_output ?? { similares: [] })
  } catch (err) {
    console.error('[similar] error:', err)
    return NextResponse.json({ similares: [] })
  }
}
