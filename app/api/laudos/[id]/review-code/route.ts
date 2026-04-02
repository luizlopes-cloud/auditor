import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { fetchRepoContent } from '@/lib/github'
import { buildAnalysisContext } from '@/lib/parser'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const PROMPT = `Você é um code reviewer sênior. Faça uma revisão profunda do código deste artefato.

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "score_code": number (0 a 100),
  "resumo": "resumo geral da qualidade do código",
  "categorias": [
    {
      "nome": "nome da categoria",
      "itens": [
        { "item": "nome", "status": "ok" | "aviso" | "erro", "arquivo": "path/do/arquivo", "detalhe": "o que encontrou", "sugestao": "como melhorar" }
      ]
    }
  ]
}

Categorias obrigatórias:
1. **Arquitetura** — separação de responsabilidades? pastas organizadas? padrão consistente (MVC, clean arch, etc)?
2. **Segurança** — SQL injection? XSS? credenciais expostas? validação de inputs? CORS? rate limiting?
3. **Performance** — queries N+1? re-renders desnecessários? lazy loading? cache? bundle size?
4. **Tratamento de erros** — try/catch? error boundaries? fallbacks? logs úteis? erros silenciosos?
5. **Tipagem** — TypeScript strict? any excessivo? interfaces definidas? null safety?
6. **Testes** — tem testes? cobertura? testes de integração? mocks adequados?
7. **Dependências** — versões atualizadas? pacotes desnecessários? vulnerabilidades conhecidas?
8. **Boas práticas** — DRY? SOLID? nomes descritivos? código morto? comentários úteis?

Para cada item, cite o ARQUIVO e TRECHO específico. Seja técnico e direto.
Responda em português brasileiro.`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('laudos').select('*').eq('id', id).maybeSingle()
  return NextResponse.json({ review: (data as any)?.review_code ?? null })
}

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

    if ((laudo as any).review_code) {
      return NextResponse.json({ review: (laudo as any).review_code })
    }

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    let content = artifact.content ?? ''
    if (artifact.github_url) {
      try {
        const repo = await fetchRepoContent(artifact.github_url)
        content = repo.mainFiles.map((f: any) => `// ${f.path}\n${f.content}`).join('\n\n')
        if (repo.packageJson) content += `\n\n// package.json\n${repo.packageJson}`
      } catch {}
    }

    if (!content || content.length < 50) {
      return NextResponse.json({ error: 'Código-fonte insuficiente para revisão. Forneça o GitHub do projeto.' }, { status: 400 })
    }

    const context = buildAnalysisContext(artifact.name, content, artifact.description ?? '')

    const result = await generateText({
      model: openrouter('google/gemini-2.0-flash-001'),
      prompt: `${PROMPT}\n\nCódigo para revisar:\n\n${context}`,
      temperature: 0,
    })

    let review: any = null
    try {
      const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      review = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear revisão de código' }, { status: 500 })
    }

    await supabase.from('laudos').update({ review_code: review } as any).eq('id', id)
    return NextResponse.json({ review })
  } catch (err) {
    console.error('[review-code] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
