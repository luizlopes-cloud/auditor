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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const funcionalidades = body.funcionalidades ?? []

    const supabase = await createClient()

    const { data: current } = await supabase
      .from('laudos')
      .select('id, resumo, artifacts(id, name, type, description)')
      .eq('id', id)
      .maybeSingle()

    if (!current) return NextResponse.json({ similares: [] })

    const currentArtifact = Array.isArray(current.artifacts) ? current.artifacts[0] : current.artifacts

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

    const funcList = funcionalidades.length > 0
      ? funcionalidades.map((f: any) => `- [${f.tipo}] ${f.nome}: ${f.descricao}`).join('\n')
      : 'Não mapeadas'

    const prompt = `Você é um analista de artefatos da Seazone. Identifique artefatos que DUPLICAM funcionalidades do artefato atual.

ARTEFATO ATUAL:
Nome: ${currentArtifact?.name}
Tipo: ${currentArtifact?.type}
Descrição: ${currentArtifact?.description ?? '—'}
Resumo: ${current.resumo}

FUNCIONALIDADES MAPEADAS DO ARTEFATO ATUAL:
${funcList}

OUTROS ARTEFATOS NO CATÁLOGO:
${lista}

Compare as FUNCIONALIDADES CONCRETAS do artefato atual (telas, filtros, tabelas, formulários, integrações) com o que os outros artefatos fazem baseado em seu resumo e descrição.

Identifique SOMENTE os que têm sobreposição REAL de funcionalidade — não basta serem do mesmo tipo ou área.
Exemplos de sobreposição real:
- Ambos mostram dados de reservas do mesmo imóvel
- Ambos têm formulário de cadastro de investidor
- Ambos consultam a mesma API/tabela para o mesmo propósito

Para cada similar, explique qual funcionalidade específica se sobrepõe e recomende unificar ou diferenciar.
Se não houver sobreposição real, retorne lista vazia.
Responda em português brasileiro.`

    const result = await generateText({
      model: openrouter('google/gemini-2.0-flash-001'),
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
