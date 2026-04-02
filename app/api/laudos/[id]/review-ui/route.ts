import { llm, LLM_MODEL } from '@/lib/llm'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { fetchUrlContent } from '@/lib/url-fetcher'

export const maxDuration = 300

function extractUIEvidence(html: string): string {
  const evidence: string[] = []

  // CSS Variables
  const cssVars = [...html.matchAll(/--([a-z-]+)\s*:\s*([^;}{]+)/gi)].map(m => `${m[1]}: ${m[2].trim()}`)
  if (cssVars.length) evidence.push(`**CSS Variables (${cssVars.length}):**\n${cssVars.slice(0, 30).join('\n')}`)

  // Logo
  const logos = [...html.matchAll(/<img[^>]+(?:logo|brand)[^>]*>/gi)]
  evidence.push(logos.length ? `**Logo:** ${logos.length} imagem(ns) com "logo" encontrada(s)` : '**Logo:** Nenhuma imagem com "logo" no src/alt')

  // Viewport
  const hasViewport = /meta[^>]+viewport/i.test(html)
  evidence.push(`**Viewport:** ${hasViewport ? 'meta viewport presente' : 'AUSENTE — sem meta viewport'}`)

  // Dark mode
  const darkClasses = (html.match(/dark:/g) || []).length
  const prefersScheme = /prefers-color-scheme/i.test(html)
  evidence.push(`**Dark mode:** ${darkClasses} classes dark: | prefers-color-scheme: ${prefersScheme ? 'sim' : 'não'}`)

  // Responsive classes (Tailwind)
  const smClasses = (html.match(/\bsm:/g) || []).length
  const mdClasses = (html.match(/\bmd:/g) || []).length
  const lgClasses = (html.match(/\blg:/g) || []).length
  const xlClasses = (html.match(/\bxl:/g) || []).length
  evidence.push(`**Responsive classes:** sm:${smClasses} md:${mdClasses} lg:${lgClasses} xl:${xlClasses}`)

  // Font sizes
  const fontSizes = new Set<string>()
  for (const m of html.matchAll(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|\[\d+px\])/g)) fontSizes.add(m[1])
  evidence.push(`**Font sizes usados:** ${fontSizes.size > 0 ? [...fontSizes].join(', ') : 'nenhum detectado'}`)

  // Font weights
  const fontWeights = new Set<string>()
  for (const m of html.matchAll(/font-(thin|light|normal|medium|semibold|bold|extrabold|black)/g)) fontWeights.add(m[1])
  evidence.push(`**Font weights usados:** ${fontWeights.size > 0 ? [...fontWeights].join(', ') : 'nenhum detectado'}`)

  // Font family
  const fontFamily = html.match(/font-family:\s*["']?([^;"']+)/i)
  const fontClass = html.match(/font-(sans|serif|mono)/i)
  evidence.push(`**Font family:** ${fontFamily?.[1] || fontClass?.[1] || 'não detectada'}`)

  // Aria attributes
  const ariaLabels = (html.match(/aria-label/g) || []).length
  const ariaDesc = (html.match(/aria-describedby/g) || []).length
  const roles = (html.match(/role="/g) || []).length
  const altTexts = (html.match(/alt="[^"]+"/g) || []).length
  evidence.push(`**Acessibilidade:** aria-label:${ariaLabels} aria-describedby:${ariaDesc} role:${roles} alt:${altTexts}`)

  // Focus styles
  const focusClasses = (html.match(/focus:/g) || []).length
  const focusVisible = (html.match(/focus-visible/g) || []).length
  evidence.push(`**Focus styles:** focus:${focusClasses} focus-visible:${focusVisible}`)

  // Buttons
  const buttons = [...html.matchAll(/<button[^>]*class="([^"]+)"/gi)].map(m => m[1])
  const uniqueButtonStyles = new Set(buttons.map(b => b.split(' ').sort().join(' ')))
  evidence.push(`**Botões:** ${buttons.length} total, ${uniqueButtonStyles.size} estilos diferentes`)
  if (buttons.length > 0) evidence.push(`  Exemplo: ${buttons[0].slice(0, 120)}`)

  // Inputs
  const inputs = [...html.matchAll(/<input[^>]*class="([^"]+)"/gi)].map(m => m[1])
  const uniqueInputStyles = new Set(inputs.map(i => i.split(' ').sort().join(' ')))
  evidence.push(`**Inputs:** ${inputs.length} total, ${uniqueInputStyles.size} estilos diferentes`)

  // Colors used (Tailwind)
  const bgColors = new Set<string>()
  for (const m of html.matchAll(/\b(?:bg|text|border)-([a-z]+-\d{2,3}(?:\/\d+)?)/g)) bgColors.add(m[1])
  evidence.push(`**Paleta de cores (${bgColors.size}):** ${[...bgColors].slice(0, 20).join(', ')}`)

  // Spacing
  const spacings = new Set<string>()
  for (const m of html.matchAll(/\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(\d+(?:\.\d+)?|\[\d+px\])/g)) spacings.add(m[0])
  evidence.push(`**Spacing values (${spacings.size}):** ${[...spacings].slice(0, 20).join(', ')}`)

  // Grid/Flex
  const flexCount = (html.match(/\bflex\b/g) || []).length
  const gridCount = (html.match(/\bgrid\b/g) || []).length
  evidence.push(`**Layout:** flex:${flexCount} grid:${gridCount}`)

  // Navigation
  const navLinks = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>/gi)].map(m => m[1])
  const internalLinks = navLinks.filter(l => l.startsWith('/'))
  evidence.push(`**Navegação:** ${navLinks.length} links total, ${internalLinks.length} internos: ${internalLinks.slice(0, 8).join(', ')}`)

  // Loading/spinner patterns
  const hasLoading = /loading|spinner|animate-spin|skeleton|pulse/i.test(html)
  evidence.push(`**Loading states:** ${hasLoading ? 'padrões detectados (animate-spin, skeleton, pulse)' : 'nenhum padrão detectado'}`)

  return evidence.join('\n')
}

const PROMPT = `Você é um revisor de UI/UX sênior. Analise a interface desta aplicação web usando as EVIDÊNCIAS CONCRETAS extraídas do HTML abaixo.

NÃO diga "precisa ser verificado" ou "não há indicação". Use os dados fornecidos para dar respostas DEFINITIVAS.

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "score_ui": number (0-100),
  "resumo": "resumo geral da qualidade visual",
  "categorias": [
    {
      "nome": "nome da categoria",
      "score": number (0-100),
      "itens": [
        { "item": "nome do item", "status": "ok" | "aviso" | "erro", "detalhe": "descrição COM DADOS CONCRETOS", "sugestao": "como melhorar" }
      ]
    }
  ]
}

Categorias obrigatórias e O QUE AVALIAR com base nas evidências:

1. **Identidade Visual**
   - Cores: quantas cores distintas? paleta coerente ou caótica? usa CSS variables?
   - Tipografia: quantos font-sizes e weights? hierarquia clara?
   - Logo: imagem com "logo" encontrada ou não?
   - Dark mode: tem classes dark: e prefers-color-scheme?

2. **Responsividade**
   - Viewport: meta tag presente?
   - Classes responsivas: quantas sm:/md:/lg:/xl:? proporção vs total de classes?
   - Se tem 0 classes responsivas = ERRO (não é responsivo)

3. **Espaçamento e Layout**
   - Spacing: quantos valores diferentes? consistentes ou aleatórios?
   - Layout: usa flex/grid? quantas instâncias?
   - Alinhamento: classes de alinhamento presentes?

4. **UX e Usabilidade**
   - Navegação: quantos links internos? sidebar/menu presente?
   - Loading: padrões de loading detectados?
   - Feedback: classes hover:/active:/transition presentes?

5. **Acessibilidade**
   - Aria: quantos aria-label, aria-describedby, role?
   - Alt texts: quantos?
   - Focus: quantas classes focus: e focus-visible?
   - Se aria-label < 5 e focus < 3 = ERRO

6. **Componentes**
   - Botões: quantos? quantos estilos diferentes? consistentes?
   - Inputs: quantos? padronizados?
   - Se >3 estilos diferentes de botão = AVISO (inconsistente)

CITE OS NÚMEROS das evidências. Ex: "12 aria-labels encontrados" não "precisa verificar".
Responda em português brasileiro.`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('laudos').select('*').eq('id', id).maybeSingle()
  return NextResponse.json({ review: (data as any)?.review_ui ?? null })
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

    if ((laudo as any).review_ui) {
      return NextResponse.json({ review: (laudo as any).review_ui })
    }

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    const url = artifact.source_url || artifact.github_url
    if (!url) return NextResponse.json({ error: 'Artefato não tem URL para revisar UI' }, { status: 400 })

    // Fetch page HTML and extract UI evidence
    let evidence = ''
    let htmlSnippet = ''
    try {
      const fetched = await fetchUrlContent(url)
      const rawHtml = fetched.content
      evidence = extractUIEvidence(rawHtml)
      htmlSnippet = rawHtml.slice(0, 4000)
    } catch {}

    const result = await generateText({
      model: llm(LLM_MODEL),
      prompt: `${PROMPT}\n\nURL: ${url}\n\n=== EVIDÊNCIAS EXTRAÍDAS DO HTML ===\n${evidence}\n\n=== TRECHO DO HTML ===\n${htmlSnippet}`,
      temperature: 0,
    })

    let review: any = null
    try {
      const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      review = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Erro ao parsear revisão de UI' }, { status: 500 })
    }

    // Recalcula score do review_ui a partir dos checks
    const uiItems = (review.categorias ?? []).flatMap((c: any) => c.itens ?? [])
    const uiErros = uiItems.filter((i: any) => i.status === 'erro').length
    const uiAvisos = uiItems.filter((i: any) => i.status === 'aviso').length
    review.score_ui = Math.max(0, Math.min(100, 100 - (uiErros * 10) - (uiAvisos * 3)))

    await supabase.from('laudos').update({ review_ui: review } as any).eq('id', id)

    // Recalcula score final se ambas revisões existem
    const { data: updated } = await supabase.from('laudos').select('*, artifacts(*)').eq('id', id).maybeSingle()
    if (updated && (updated as any).review_ui && (updated as any).review_code) {
      const checks = ((updated as any).checks ?? []) as any[]
      const uiItems = ((updated as any).review_ui?.categorias ?? []).flatMap((c: any) => c.itens ?? [])
      const codeItems = ((updated as any).review_code?.categorias ?? []).flatMap((c: any) => c.itens ?? [])
      const allItems = [...checks, ...uiItems, ...codeItems]
      const erros = allItems.filter((i: any) => i.status === 'erro').length
      const avisos = allItems.filter((i: any) => i.status === 'aviso').length
      const score = Math.max(0, Math.min(100, 100 - (erros * 10) - (avisos * 3)))
      const resultado = score >= 75 ? 'aprovado' : score >= 40 ? 'ajustes_necessarios' : 'reprovado'
      await supabase.from('laudos').update({ score, resultado } as any).eq('id', id)
    }

    return NextResponse.json({ review })
  } catch (err) {
    console.error('[review-ui] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
