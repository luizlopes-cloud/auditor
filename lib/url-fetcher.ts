export type UrlType = 'github-repo' | 'github-file' | 'lovable' | 'vercel' | 'external'

// Retorna mensagem de erro se for URL de editor (não deployada), null se for válida
export function detectEditorUrl(url: string): string | null {
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }

  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase()

  // Lovable editor: lovable.dev/projects/... ou lovable.dev sem subdomínio
  if (host === 'lovable.dev' || host === 'www.lovable.dev') {
    if (path.startsWith('/projects')) {
      return 'Este é o link do editor Lovable, não da aplicação publicada. Abra o projeto no Lovable, clique em "Share" e cole o link da app (ex: meu-projeto.lovable.app).'
    }
    return 'URL inválida para análise. Cole o link da aplicação publicada (ex: meu-projeto.lovable.app), não do editor.'
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
  detectedGithubUrl?: string // se Lovable tiver repo vinculado
}

export function detectUrlType(url: string): UrlType {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    const path = u.pathname

    if (host === 'github.com') {
      // github.com/owner/repo/blob/branch/file.ext
      const parts = path.replace(/^\//, '').split('/')
      if (parts.length >= 5 && parts[2] === 'blob') return 'github-file'
      return 'github-repo'
    }
    if (host.endsWith('.lovable.app') || host.endsWith('.lovable.dev') || host === 'lovable.app') return 'lovable'
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

async function fetchDeployedPage(url: string, type: UrlType): Promise<FetchedUrl> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (auditor-seazone)' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Não foi possível acessar ${url} (HTTP ${res.status})`)
  }

  const html = await res.text()

  // Extrai título
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : url

  // Tenta detectar link GitHub no HTML (Lovable às vezes inclui)
  const githubMatch = html.match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+/g)
  const detectedGithubUrl = githubMatch?.[0]

  // Extrai scripts inline
  const inlineScripts: string[] = []
  const scriptRegex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    const s = match[1].trim()
    if (s.length > 50) inlineScripts.push(s.slice(0, 3000))
  }

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

  if (metaTags.length) parts.push(`\n### Meta tags\n${metaTags.join('\n')}`)
  if (inlineScripts.length) {
    parts.push(`\n### Scripts inline (${inlineScripts.length} encontrados)\n`)
    inlineScripts.forEach((s, i) => parts.push(`\`\`\`\n// Script ${i + 1}\n${s}\n\`\`\``))
  }

  // HTML resumido (sem scripts/styles para análise de estrutura)
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .slice(0, 5000)

  parts.push(`\n### Estrutura HTML (resumida)\n\`\`\`html\n${cleanHtml}\n\`\`\``)

  return {
    type,
    content: parts.join('\n'),
    title,
    detectedGithubUrl,
  }
}
