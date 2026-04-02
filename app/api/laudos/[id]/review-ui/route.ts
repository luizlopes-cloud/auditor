import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { fetchUrlContent } from '@/lib/url-fetcher'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const PROMPT = `Você é um revisor de UI/UX sênior. Analise a interface desta aplicação web e gere um relatório detalhado.

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "score_ui": number (0-100),
  "resumo": "resumo geral da qualidade visual",
  "categorias": [
    {
      "nome": "nome da categoria",
      "score": number (0-100),
      "itens": [
        { "item": "nome do item", "status": "ok" | "aviso" | "erro", "detalhe": "descrição", "sugestao": "como melhorar" }
      ]
    }
  ]
}

Categorias obrigatórias:
1. **Identidade Visual** — cores consistentes? tipografia coerente? logo presente? tema claro/escuro?
2. **Responsividade** — funciona em mobile? tablet? breakpoints corretos? elementos não quebram?
3. **Espaçamento e Layout** — padding/margin consistentes? alinhamento? grid system? hierarquia visual?
4. **UX e Usabilidade** — navegação intuitiva? feedback visual (loading, hover, focus)? empty states? error states?
5. **Acessibilidade** — contraste adequado? aria labels? tamanho de fonte legível? foco visível no teclado?
6. **Componentes** — botões consistentes? inputs padronizados? cards uniformes? ícones coerentes?

Para cada item, seja ESPECÍFICO: diga o que viu, onde, e por que é problema ou está correto.
Responda em português brasileiro.`

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: laudo } = await supabase
      .from('laudos')
      .select('*, artifacts(*)')
      .eq('id', id)
      .maybeSingle()

    if (!laudo) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    if ((laudo as any).review_ui) {
      return NextResponse.json({ review: (laudo as any).review_ui })
    }

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    const url = artifact.source_url || artifact.github_url
    if (!url) return NextResponse.json({ error: 'Artefato não tem URL para revisar UI' }, { status: 400 })

    // Fetch page HTML for UI context
    let htmlContext = ''
    try {
      const fetched = await fetchUrlContent(url)
      htmlContext = fetched.content.slice(0, 8000)
    } catch {}

    const result = await generateText({
      model: openrouter('google/gemini-2.0-flash-001'),
      prompt: `${PROMPT}\n\nURL do artefato: ${url}\n\nConteúdo da página:\n${htmlContext}`,
      temperature: 0,
    })

    let review: any = null
    try {
      const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      review = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear revisão de UI' }, { status: 500 })
    }

    await supabase.from('laudos').update({ review_ui: review } as any).eq('id', id)
    return NextResponse.json({ review })
  } catch (err) {
    console.error('[review-ui] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
