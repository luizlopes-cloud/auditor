import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText, Output } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const AcoesSchema = z.object({
  acoes: z.array(z.object({
    tipo: z.enum(['urgente', 'sugerida', 'oportunidade']),
    titulo: z.string(),
    descricao: z.string(),
  })),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: laudo } = await supabase
      .from('laudos')
      .select('resultado, score, resumo, checks, artifacts(name, type, description)')
      .eq('id', id)
      .maybeSingle()

    if (!laudo) return NextResponse.json({ acoes: [] })

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    const checks = (laudo.checks as any[]) ?? []
    const erros = checks.filter(c => c.status === 'erro').map(c => `- ${c.item}: ${c.detalhe}`)
    const avisos = checks.filter(c => c.status === 'aviso').map(c => `- ${c.item}: ${c.detalhe}`)

    const prompt = `Você é um consultor de qualidade de automações e integrações da Seazone.

LAUDO:
Artefato: ${artifact?.name} (${artifact?.type})
Objetivo: ${artifact?.description ?? '—'}
Resultado: ${laudo.resultado} (score ${laudo.score}/100)
Resumo: ${laudo.resumo}
${erros.length ? `\nErros encontrados:\n${erros.join('\n')}` : ''}
${avisos.length ? `\nAvisos encontrados:\n${avisos.join('\n')}` : ''}

Gere de 3 a 5 ações complementares recomendadas para este artefato.
Cada ação deve ter:
- tipo: "urgente" (deve ser feito antes de usar em produção), "sugerida" (melhoria importante), ou "oportunidade" (melhoria futura ou expansão de valor)
- titulo: ação curta e direta (máx 8 palavras)
- descricao: explicação objetiva do que fazer e por quê (1-2 frases)

Seja específico e prático. Não repita os checks já listados — foque em ações de processo, integração, monitoramento, documentação ou expansão.
Responda em português brasileiro.`

    const result = await generateText({
      model: openrouter(process.env.OPENROUTER_MODEL ?? 'google/gemini-flash-2.0'),
      experimental_output: Output.object({ schema: AcoesSchema }),
      prompt,
      temperature: 0,
    })

    return NextResponse.json(result.experimental_output ?? { acoes: [] })
  } catch (err) {
    console.error('[actions] error:', err)
    return NextResponse.json({ acoes: [] })
  }
}
