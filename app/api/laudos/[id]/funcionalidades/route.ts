import { llm, LLM_MODEL } from '@/lib/llm'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { fetchRepoContent } from '@/lib/github'
import { fetchUrlContent } from '@/lib/url-fetcher'
import { buildAnalysisContext } from '@/lib/parser'
import { extractProjectRef, fetchSupabaseSchema, formatSchemaForLLM } from '@/lib/supabase-schema'

export const maxDuration = 300

const PROMPT = `Você é um analista de produto sênior. Seu trabalho é mapear TODAS as funcionalidades de uma aplicação/artefato.

Para CADA funcionalidade, retorne um objeto JSON com:
- "nome": nome curto da funcionalidade (ex: "Filtro por data de check-in")
- "tipo": um de ["tela", "filtro", "formulario", "tabela", "grafico", "botao", "modal", "navegacao", "integracao", "auth"]
- "descricao": o que faz, quais campos/colunas/dados mostra, quais ações o usuário pode tomar
- "status": "completa" | "parcial" | "placeholder" | "nao_verificavel"
- "detalhes_tecnicos": componentes, rotas, tabelas de banco envolvidas (se visíveis no código)

Regras:
- Mapeie TUDO: cada tela, cada filtro, cada botão de ação, cada formulário, cada tabela, cada gráfico
- NÃO inclua meta tags, scripts inline, ou elementos HTML genéricos — apenas funcionalidades de USUÁRIO
- Se a aplicação tem login, mapeie o fluxo de auth como funcionalidade
- Se tem sidebar/menu, mapeie as opções de navegação
- Mínimo 5 funcionalidades, sem limite máximo
- Responda em português brasileiro
- Retorne APENAS um JSON array válido, sem markdown

Exemplo:
[
  {"nome":"Dashboard de vendas","tipo":"tela","descricao":"Tela principal com 4 cards de métricas (receita, ocupação, ticket médio, reservas) e gráfico de evolução mensal","status":"completa","detalhes_tecnicos":"Rota /dashboard, componente DashboardPage, tabela reservas"},
  {"nome":"Filtro por período","tipo":"filtro","descricao":"Date picker que filtra todos os dados do dashboard por range de datas. Padrão: últimos 30 dias","status":"completa","detalhes_tecnicos":"useState dateRange, componente DatePicker"},
  {"nome":"Tabela de reservas","tipo":"tabela","descricao":"Lista paginada com colunas: hóspede, imóvel, check-in, check-out, valor, status. Ordenável por qualquer coluna","status":"parcial","detalhes_tecnicos":"Componente ReservationsTable, tabela supabase: reservas. Paginação não implementada"}
]`

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

    // Retorna cache se existir
    if ((laudo as any).funcionalidades) {
      return NextResponse.json({ funcionalidades: (laudo as any).funcionalidades })
    }

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    // Re-fetch content for the most up-to-date analysis
    let content = artifact.content ?? ''
    if (artifact.github_url) {
      try {
        const repo = await fetchRepoContent(artifact.github_url)
        content = repo.mainFiles.map((f: any) => `// ${f.path}\n${f.content}`).join('\n\n')
        if (repo.readme) content = `## README\n${repo.readme}\n\n${content}`
        if (repo.packageJson) content += `\n\n## package.json\n${repo.packageJson}`
      } catch {}
    } else if (artifact.source_url) {
      try {
        const fetched = await fetchUrlContent(artifact.source_url)
        content = fetched.content
      } catch {}
    }

    let context = buildAnalysisContext(artifact.name, content, artifact.description ?? '')

    // Tenta buscar schema do Supabase a partir do conteúdo
    const projectRef = extractProjectRef(content)
    if (projectRef) {
      try {
        const schema = await fetchSupabaseSchema(projectRef)
        if (schema.length > 0) {
          context += formatSchemaForLLM(schema)
        }
      } catch {}
    }

    const result = await generateText({
      model: llm(LLM_MODEL),
      prompt: `${PROMPT}\n\nAnalise este artefato e mapeie todas as funcionalidades:\n\n${context}`,
      temperature: 0,
    })

    // Parse JSON response
    let funcionalidades: any[] = []
    try {
      const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      funcionalidades = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear funcionalidades' }, { status: 500 })
    }

    // Salva no banco
    await supabase.from('laudos').update({ funcionalidades } as any).eq('id', id)

    return NextResponse.json({ funcionalidades })
  } catch (err) {
    console.error('[funcionalidades] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
