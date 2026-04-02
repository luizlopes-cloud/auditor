import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'Mensagens obrigatórias' }, { status: 400 })
    }

    let systemPrompt = `Você é o Assistente do Auditor, a intranet de homologação de artefatos da Seazone.

Você ajuda as pessoas a:
- Entender por que um artefato foi aprovado, reprovado ou precisa de ajustes
- Encontrar artefatos aprovados no catálogo
- Submeter artefatos corretamente
- Interpretar os checks do laudo e saber como corrigi-los

Seja conciso, direto, em português brasileiro. Não use markdown excessivo — prefira respostas curtas e objetivas.`

    // Contexto: catálogo — inclui lista de artefatos aprovados
    if (context?.page === 'catalog') {
      const supabase = await createClient()
      const { data: artifacts } = await supabase
        .from('artifacts')
        .select('id, name, type, equipe, laudos(score, resultado)')
        .limit(50)

      const approved = (artifacts ?? []).filter((a: any) => {
        const laudo = Array.isArray(a.laudos) ? a.laudos[0] : a.laudos
        return laudo?.resultado === 'aprovado'
      })

      if (approved.length) {
        systemPrompt += `\n\nArtefatos aprovados no catálogo (${approved.length} total):\n`
        systemPrompt += approved.map((a: any) => {
          const laudo = Array.isArray(a.laudos) ? a.laudos[0] : a.laudos
          return `- "${a.name}" | tipo: ${a.type}${a.equipe ? ` | equipe: ${a.equipe}` : ''} | score: ${laudo?.score ?? '?'}`
        }).join('\n')
        systemPrompt += `\n\nQuando o usuário buscar algo, sugira os mais relevantes pelo nome e tipo.`
      } else {
        systemPrompt += `\n\nO catálogo ainda não tem artefatos aprovados.`
      }
    }

    // Contexto: laudo específico
    if (context?.laudo) {
      const l = context.laudo
      systemPrompt += `\n\nLaudo em foco:
- Artefato: ${l.name}
- Resultado: ${l.resultado} (score ${l.score})
- Resumo: ${l.resumo}
- Checks:\n${(l.checks ?? []).map((c: any) => `  • [${c.status.toUpperCase()}] ${c.categoria} / ${c.item}: ${c.detalhe}${c.sugestao ? ` → Sugestão: ${c.sugestao}` : ''}`).join('\n')}`
    }

    const result = await generateText({
      model: openrouter('google/gemini-2.5-flash'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: 600,
    })

    return NextResponse.json({ text: result.text })
  } catch (err) {
    console.error('[assistant] error:', err)
    return NextResponse.json({ error: 'Assistente indisponível. Tente novamente.' }, { status: 500 })
  }
}
