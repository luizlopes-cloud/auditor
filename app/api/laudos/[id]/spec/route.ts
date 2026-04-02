import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const PROMPT = `Você é um analista de produto. Gere uma documentação Spec básica deste artefato baseado nas funcionalidades mapeadas e na análise.

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "nome": "nome do projeto",
  "descricao": "descrição em 2-3 frases do que o projeto faz",
  "publico_alvo": "quem usa",
  "stack": ["tecnologia1", "tecnologia2"],
  "funcionalidades": [
    { "nome": "feature", "descricao": "o que faz", "prioridade": "essencial" | "importante" | "desejável" }
  ],
  "integrações": ["sistema1", "sistema2"],
  "dados": {
    "tabelas": ["tabela1", "tabela2"],
    "apis_externas": ["api1"]
  },
  "requisitos_nao_funcionais": ["requisito1", "requisito2"],
  "riscos": ["risco1", "risco2"],
  "proximos_passos": ["passo1", "passo2"]
}

Baseie-se nas funcionalidades identificadas, no código analisado e no contexto fornecido.
Seja objetivo e prático. Responda em português brasileiro.`

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const funcionalidades = body.funcionalidades ?? []
    const reviewUi = body.reviewUi ?? null
    const reviewCode = body.reviewCode ?? null
    const similares = body.similares ?? []

    const supabase = await createClient()

    const { data: laudo } = await supabase
      .from('laudos')
      .select('*, artifacts(*)')
      .eq('id', id)
      .maybeSingle()

    if (!laudo) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    const checks = (laudo.checks as any[]) ?? []
    const checksResumo = checks.map((c: any) => `- [${c.status}] ${c.categoria}/${c.item}: ${c.detalhe}`).join('\n')

    const funcList = funcionalidades.length > 0
      ? funcionalidades.map((f: any) => `- [${f.tipo}] ${f.nome}: ${f.descricao} (${f.status})`).join('\n')
      : 'Não mapeadas'

    const uiResumo = reviewUi && typeof reviewUi === 'object'
      ? `Score UI: ${reviewUi.score_ui}/100\n${reviewUi.resumo}\n${(reviewUi.categorias ?? []).map((c: any) => `${c.nome}: ${c.itens?.map((i: any) => `[${i.status}] ${i.item}`).join(', ')}`).join('\n')}`
      : 'Não executada'

    const codeResumo = reviewCode && typeof reviewCode === 'object'
      ? `Score Código: ${reviewCode.score_code}/100\n${reviewCode.resumo}\n${(reviewCode.categorias ?? []).map((c: any) => `${c.nome}: ${c.itens?.map((i: any) => `[${i.status}] ${i.item}`).join(', ')}`).join('\n')}`
      : 'Não executada'

    const similaresResumo = similares.length > 0
      ? similares.map((s: any) => `- ${s.motivo}: ${s.recomendacao}`).join('\n')
      : 'Nenhum similar encontrado'

    const context = `Artefato: ${artifact.name}
Tipo: ${artifact.type}
Descrição: ${artifact.description ?? 'Não informada'}
GitHub: ${artifact.github_url ?? 'N/A'}
URL: ${artifact.source_url ?? 'N/A'}

=== ANÁLISE GERAL (Score ${laudo.score}/100 — ${laudo.resultado}) ===
${laudo.resumo}

Checks:
${checksResumo}

=== FUNCIONALIDADES MAPEADAS ===
${funcList}

=== REVISÃO DE UI ===
${uiResumo}

=== REVISÃO DE CÓDIGO ===
${codeResumo}

=== ARTEFATOS SIMILARES ===
${similaresResumo}`

    const result = await generateText({
      model: openrouter('google/gemini-2.0-flash-001'),
      prompt: `${PROMPT}\n\n${context}`,
      temperature: 0,
    })

    let spec: any = null
    try {
      const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      spec = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Erro ao gerar spec' }, { status: 500 })
    }

    // Salva spec no laudo
    await supabase.from('laudos').update({ spec } as any).eq('id', id)

    return NextResponse.json({ spec })
  } catch (err) {
    console.error('[spec] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
