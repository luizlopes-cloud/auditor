export type UrlType = 'github-repo' | 'github-file' | 'github-pr' | 'lovable' | 'vercel' | 'external'

// Retorna mensagem de erro se for URL de editor (não deployada), null se for válida
export function detectEditorUrl(url: string): string | null {
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }

  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase()


  // Lovable editor: aceita qualquer lovable.dev URL (tratado no analyze como 422 se sem GitHub)
  if (host === 'lovable.dev' || host === 'www.lovable.dev') {
    return null
  }

  // V0 editor: v0.dev
  if (host === 'v0.dev' || host === 'www.v0.dev') {
    return 'Este é o link do editor V0. Para analisar, faça o deploy da aplicação e cole o link deployado.'
  }

  // Bolt editor: bolt.new
  if (host === 'bolt.new' || host === 'www.bolt.new') {
    return 'Este é o link do editor Bolt. Para analisar, faça o deploy da aplicação e cole o link deployado.'
  }

  // GitHub editor web (github.dev)
  if (host === 'github.dev' || host.endsWith('.github.dev')) {
    return 'Este é o editor web do GitHub. Use o link do repositório (github.com/org/repo) ou da aplicação deployada.'
  }

  // Figma
  if (host === 'figma.com' || host === 'www.figma.com') {
    return 'Links do Figma são arquivos de design, não aplicações. Submeta o link da aplicação deployada ou cole o código.'
  }

  return null
}

export interface FetchedUrl {
  type: UrlType
  content: string
  title: string
  detectedGithubUrl?: string
  previewUrl?: string
}

export function detectUrlType(url: string): UrlType {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    const path = u.pathname

    if (host === 'github.com') {
      // github.com/owner/repo/blob/branch/file.ext
      const parts = path.replace(/^\//, '').split('/')
      if (parts.length >= 4 && (parts[2] === 'pull' || parts[2] === 'pulls')) return 'github-pr'
      if (parts.length >= 5 && parts[2] === 'blob') return 'github-file'
      return 'github-repo'
    }
    if (host.endsWith('.lovable.app') || host.endsWith('.lovable.dev') || host === 'lovable.app' || host === 'lovable.dev' || host === 'www.lovable.dev') return 'lovable'
    if (host.endsWith('.vercel.app')) return 'vercel'
    return 'external'
  } catch {
    return 'external'
  }
}

export async function fetchUrlContent(url: string): Promise<FetchedUrl> {
  const type = detectUrlType(url)

  if (type === 'lovable' || type === 'vercel' || type === 'external') {
    return fetchDeployedPage(url, type)
  }

  // GitHub é tratado em github.ts — não deve chegar aqui
  throw new Error(`Use lib/github.ts para URLs do GitHub`)
}

function extractBundleInsights(js: string): string {
  const insights: string[] = []

  // Rotas / paths (React Router, Next.js, etc.)
  const routes = new Set<string>()
  const routeRegex = /["'](\/[a-z][a-z0-9/_-]{1,60})["']/gi
  let rm
  while ((rm = routeRegex.exec(js)) !== null) {
    const r = rm[1]
    if (!r.includes('.') && !r.startsWith('/api/') && !r.startsWith('/_')) routes.add(r)
  }
  if (routes.size) insights.push(`**Rotas/páginas detectadas:** ${[...routes].join(', ')}`)

  // Strings de UI (botões, labels, placeholders — português e inglês)
  const uiStrings = new Set<string>()
  const strRegex = /["']([A-ZÀ-Ú][a-záàâãéêíóôõúüç ]{3,50}(?:\.{3})?|[A-Z][a-z]+ [a-z]+ [a-z]+[^"']{0,30})["']/g
  let sm
  while ((sm = strRegex.exec(js)) !== null) {
    const s = sm[1].trim()
    if (s.length > 4 && s.length < 60 && !/^(http|ftp|data:|blob:)/i.test(s)) uiStrings.add(s)
  }
  if (uiStrings.size) {
    const sorted = [...uiStrings].slice(0, 60)
    insights.push(`**Textos de UI encontrados (${sorted.length}):** ${sorted.join(' | ')}`)
  }

  // Endpoints de API
  const apis = new Set<string>()
  const apiRegex = /["'](\/api\/[a-z][a-z0-9/_-]{1,80})["']/gi
  let am
  while ((am = apiRegex.exec(js)) !== null) apis.add(am[1])
  // URLs de fetch externas
  const fetchRegex = /fetch\(["'](https?:\/\/[^"']+)["']/gi
  while ((am = fetchRegex.exec(js)) !== null) apis.add(am[1])
  if (apis.size) insights.push(`**Endpoints de API:** ${[...apis].join(', ')}`)

  // Tabelas/colunas Supabase
  const tables = new Set<string>()
  const tableRegex = /\.from\(["']([a-z_]+)["']\)/gi
  while ((am = tableRegex.exec(js)) !== null) tables.add(am[1])
  if (tables.size) insights.push(`**Tabelas Supabase:** ${[...tables].join(', ')}`)

  // Componentes (JSX function/const names)
  const components = new Set<string>()
  const compRegex = /(?:function|const)\s+([A-Z][A-Za-z]{2,30})\s*[\(=]/g
  while ((am = compRegex.exec(js)) !== null) components.add(am[1])
  if (components.size > 2) {
    insights.push(`**Componentes detectados (${components.size}):** ${[...components].slice(0, 40).join(', ')}`)
  }

  // Hooks de estado (useState com nome)
  const stateVars = new Set<string>()
  const stateRegex = /\[(\w+),\s*set[A-Z]\w+\]\s*=\s*useState/g
  while ((am = stateRegex.exec(js)) !== null) stateVars.add(am[1])
  if (stateVars.size) insights.push(`**Estados de UI (useState):** ${[...stateVars].slice(0, 30).join(', ')}`)

  return insights.join('\n')
}

async function fetchExternalScripts(baseUrl: string, html: string): Promise<string[]> {
  const srcRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi
  const srcs: string[] = []
  let m
  while ((m = srcRegex.exec(html)) !== null) {
    const src = m[1]
    if (src.endsWith('.js') || src.includes('/assets/')) srcs.push(src)
  }

  const results: string[] = []
  const base = new URL(baseUrl)

  await Promise.all(srcs.slice(0, 5).map(async src => {
    try {
      const fullUrl = src.startsWith('http') ? src : new URL(src, base).toString()
      const res = await fetch(fullUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (auditor-seazone)' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return
      const text = await res.text()

      // Extrai insights estruturados do bundle
      const insights = extractBundleInsights(text)
      if (insights) results.push(`// Bundle: ${src}\n${insights}`)

      // Também inclui um trecho do código para contexto
      const excerpt = text.slice(0, 6000) + (text.length > 6000 ? '\n...[truncado]...\n' + text.slice(-2000) : '')
      results.push(`// Código fonte: ${src}\n${excerpt}`)
    } catch {}
  }))

  return results
}

async function fetchDeployedPage(url: string, type: UrlType): Promise<FetchedUrl> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (auditor-seazone)' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Não foi possível acessar ${url} (HTTP ${res.status})`)
  }

  const html = await res.text()

  // Detecta barreira de login
  const looksLikeAuthWall = (() => {
    const lower = html.toLowerCase()
    const hasPasswordInput = /<input[^>]+type=["']?password/i.test(html)
    const hasLoginText =
      (lower.includes('sign in') && lower.includes('email')) ||
      (lower.includes('log in') && lower.includes('password')) ||
      (lower.includes('entrar') && lower.includes('senha')) ||
      (lower.includes('login') && lower.includes('password'))
    return hasPasswordInput || hasLoginText
  })()

  if (looksLikeAuthWall) {
    throw new Error(
      'Esta aplicação exige login para ser acessada. Para analisar, forneça o link do GitHub do projeto no campo "GitHub do projeto" abaixo — assim analisamos o código-fonte diretamente, sem precisar de acesso ao app.'
    )
  }

  // Extrai título (og:title > h1 > title, filtra genéricos)
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const rawTitle = (ogTitleMatch?.[1] ?? h1Match?.[1] ?? titleMatch?.[1] ?? '').trim()
  // Filtra títulos genéricos (UUIDs, "Vite App", "React App", IDs hex, "Id Preview ...")
  const stripped = rawTitle.replace(/\s+/g, '')
  const isGenericTitle = !rawTitle
    || /^[a-f0-9-]{20,}$/i.test(stripped)
    || /[a-f0-9]{8}[- ]?[a-f0-9]{4}[- ]?[a-f0-9]{4}[- ]?[a-f0-9]{4}[- ]?[a-f0-9]{12}/i.test(rawTitle)
    || /^(Vite|React|Next)\s*(App|[\+])/i.test(rawTitle)
    || /^id\s*preview/i.test(rawTitle)
    || rawTitle.length < 3
  const title = isGenericTitle ? '' : rawTitle

  // Tenta detectar link GitHub no HTML
  const githubMatch = html.match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+/g)
  const detectedGithubUrl = githubMatch?.[0]

  // Extrai og:image para preview visual
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  let previewUrl = ogImageMatch?.[1]
  if (previewUrl && !previewUrl.startsWith('http')) {
    try { previewUrl = new URL(previewUrl, url).toString() } catch {}
  }

  // Extrai scripts inline
  const inlineScripts: string[] = []
  const scriptRegex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    const s = match[1].trim()
    if (s.length > 50) inlineScripts.push(s.slice(0, 3000))
  }

  // Busca bundles JS externos (Lovable/Vercel são SPAs — o código real está nos bundles)
  const externalBundles = type === 'lovable' || type === 'vercel'
    ? await fetchExternalScripts(url, html)
    : []

  // Extrai meta tags relevantes
  const metaTags: string[] = []
  const metaRegex = /<meta[^>]+(name|property|content)="[^"]*"[^>]*>/gi
  const metaMatches = html.match(metaRegex) ?? []
  metaTags.push(...metaMatches.slice(0, 10))

  // Monta conteúdo para análise
  const parts: string[] = [
    `## Página: ${title}`,
    `URL: ${url}`,
    `Tipo: ${type}`,
  ]

  if (!detectedGithubUrl && type === 'lovable') {
    parts.push(`\n> ⚠️ Sem acesso ao código-fonte (GitHub não vinculado). Análise baseada em HTML + JS compilado — pode ser menos precisa. Recomendação: publique o projeto no GitHub e forneça o link para análise completa.`)
  }

  if (metaTags.length) parts.push(`\n### Meta tags\n${metaTags.join('\n')}`)

  if (inlineScripts.length) {
    parts.push(`\n### Scripts inline (${inlineScripts.length} encontrados)`)
    inlineScripts.forEach((s, i) => parts.push(`\`\`\`\n// Script inline ${i + 1}\n${s}\n\`\`\``))
  }

  if (externalBundles.length) {
    parts.push(`\n### Código dos bundles JS (${externalBundles.length} arquivo(s))`)
    externalBundles.forEach(b => parts.push(`\`\`\`javascript\n${b}\n\`\`\``))
  }

  // HTML resumido
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .slice(0, 3000)

  parts.push(`\n### Estrutura HTML (resumida)\n\`\`\`html\n${cleanHtml}\n\`\`\``)

  return {
    type,
    content: parts.join('\n'),
    title,
    detectedGithubUrl,
    previewUrl,
  }
}
