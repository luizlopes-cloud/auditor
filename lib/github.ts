const GITHUB_API = 'https://api.github.com'

export interface RepoContent {
  readme: string
  packageJson: string | null
  mainFiles: { path: string; content: string }[]
  language: string | null
  description: string | null
}

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'auditor-seazone',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

interface ParsedGitHubUrl {
  owner: string
  repo: string
  filePath?: string
  pullNumber?: number
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  try {
    const u = new URL(url)
    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/')
    if (parts.length < 2) return null
    const owner = parts[0]
    const repo = parts[1]
    // github.com/owner/repo/pull/123
    if (parts.length >= 4 && (parts[2] === 'pull' || parts[2] === 'pulls')) {
      const pullNumber = parseInt(parts[3], 10)
      if (!isNaN(pullNumber)) return { owner, repo, pullNumber }
    }
    // github.com/owner/repo/blob/branch/path/to/file.ext
    if (parts.length >= 5 && parts[2] === 'blob') {
      const filePath = parts.slice(4).join('/')
      return { owner, repo, filePath }
    }
    return { owner, repo }
  } catch {
    return null
  }
}

export async function fetchPRContent(url: string): Promise<RepoContent & { prTitle: string; prDescription: string }> {
  const parsed = parseGitHubUrl(url)
  if (!parsed?.pullNumber) throw new Error('URL de PR inválida')

  const { owner, repo, pullNumber } = parsed

  // Busca info do PR
  const prRes = await fetchGitHub(`/repos/${owner}/${repo}/pulls/${pullNumber}`)
  if (!prRes.ok) {
    if (prRes.status === 404) throw new Error(`PR #${pullNumber} não encontrado em ${owner}/${repo}`)
    throw new Error(`Erro ao acessar PR: HTTP ${prRes.status}`)
  }
  const pr = await prRes.json()

  // Busca arquivos alterados no PR
  const filesRes = await fetchGitHub(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`)
  if (!filesRes.ok) throw new Error('Erro ao buscar arquivos do PR')
  const files = await filesRes.json()

  // Busca conteúdo dos arquivos alterados (patch + conteúdo completo dos mais relevantes)
  const mainFiles: { path: string; content: string }[] = []

  // Adiciona resumo do PR
  mainFiles.push({
    path: '__PR_INFO__.md',
    content: `# PR #${pullNumber}: ${pr.title}\n\n${pr.body ?? 'Sem descrição'}\n\n**Branch:** ${pr.head?.ref} → ${pr.base?.ref}\n**Autor:** ${pr.user?.login}\n**Status:** ${pr.state}\n**Arquivos alterados:** ${files.length}`,
  })

  // Adiciona diff/patch de cada arquivo (limitado para não estourar contexto)
  for (const file of files.slice(0, 10)) {
    const patch = file.patch ?? ''
    let content = `// ${file.filename} (${file.status}: +${file.additions} -${file.deletions})\n`
    if (patch) {
      content += patch.slice(0, 2000)
    }
    mainFiles.push({ path: file.filename, content })
  }

  // Lista arquivos restantes sem patch
  if (files.length > 10) {
    const rest = files.slice(10).map((f: any) => `- ${f.filename} (${f.status}: +${f.additions} -${f.deletions})`).join('\n')
    mainFiles.push({ path: '__MORE_FILES__.md', content: `Mais ${files.length - 10} arquivos alterados:\n${rest}` })
  }

  return {
    readme: '',
    packageJson: null,
    mainFiles,
    language: pr.head?.repo?.language ?? null,
    description: pr.title,
    prTitle: pr.title,
    prDescription: pr.body ?? '',
  }
}

async function fetchGitHub(path: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(),
    next: { revalidate: 0 },
  })
}

async function fetchFileContent(owner: string, repo: string, filePath: string): Promise<string | null> {
  try {
    const res = await fetchGitHub(`/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.encoding === 'base64') {
      return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
    }
    return null
  } catch {
    return null
  }
}

async function fetchRepoTree(owner: string, repo: string): Promise<string[]> {
  try {
    const res = await fetchGitHub(`/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.tree || [])
      .filter((f: { type: string }) => f.type === 'blob')
      .map((f: { path: string }) => f.path)
  } catch {
    return []
  }
}

function scoreFile(path: string): number {
  const lower = path.toLowerCase()
  const file = path.split('/').pop() ?? ''

  // Ignorar assets, configs, locks
  if (/\.(png|jpg|svg|ico|woff|ttf|lock|map)$/i.test(file)) return 0
  if (lower.startsWith('node_modules/') || lower.startsWith('.git/') || lower.startsWith('.next/')) return 0
  if (file === 'package-lock.json' || file === 'yarn.lock' || file === 'pnpm-lock.yaml') return 0

  let score = 0

  // Páginas e rotas (Next.js, React) — alta prioridade
  if (/\/page\.(tsx?|jsx?)$/.test(lower)) score += 10
  if (/\/route\.(tsx?|js)$/.test(lower)) score += 8
  if (/\/layout\.(tsx?|jsx?)$/.test(lower)) score += 7
  if (lower.includes('/pages/') && /\.(tsx?|jsx?)$/.test(lower)) score += 9

  // Componentes
  if (lower.includes('/components/') && /\.(tsx?|jsx?)$/.test(lower)) score += 6

  // Hooks, lib, utils, services
  if (lower.includes('/hooks/') || lower.includes('/lib/') || lower.includes('/utils/')) score += 5
  if (lower.includes('/services/') || lower.includes('/api/')) score += 5

  // Arquivos raiz importantes
  if (/^(main|app|index|server)\.(py|ts|js|go)$/.test(file)) score += 10
  if (file === 'schema.prisma' || file === 'schema.sql') score += 8
  if (/\.sql$/.test(file)) score += 4
  if (file === '.env.example') score += 3
  if (file === 'workflow.json' || file === 'flow.json') score += 7

  // Tipos e configuração
  if (lower.includes('/types') && /\.(ts|d\.ts)$/.test(lower)) score += 4
  if (file === 'supabase.ts' || file === 'database.ts') score += 6

  // Código fonte em geral
  if (/\.(tsx?|jsx?|py|go|rb|sql)$/.test(file) && score === 0) score += 1

  return score
}

export async function fetchRepoContent(url: string): Promise<RepoContent> {
  const parsed = parseGitHubUrl(url)
  if (!parsed) throw new Error('URL do GitHub inválida')

  const { owner, repo, filePath } = parsed

  // Se URL aponta pra arquivo específico, busca direto
  if (filePath) {
    const content = await fetchFileContent(owner, repo, filePath)
    if (!content) throw new Error(`Arquivo não encontrado: ${filePath}`)
    return {
      readme: '',
      packageJson: null,
      mainFiles: [{ path: filePath, content: content.slice(0, 15000) }],
      language: filePath.split('.').pop() ?? null,
      description: null,
    }
  }

  // Busca info do repo, README e árvore em paralelo
  const [repoRes, readmeRes, tree] = await Promise.all([
    fetchGitHub(`/repos/${owner}/${repo}`),
    fetchGitHub(`/repos/${owner}/${repo}/readme`),
    fetchRepoTree(owner, repo),
  ])

  if (!repoRes.ok) {
    const status = repoRes.status
    if (status === 404) throw new Error(`Repositório não encontrado: ${owner}/${repo}. Verifique se é público ou se o link está correto.`)
    if (status === 403) throw new Error(`Acesso negado ao repositório ${owner}/${repo}. O repo pode ser privado.`)
    throw new Error(`Erro ao acessar GitHub: HTTP ${status}`)
  }

  const repoData = await repoRes.json()

  // README
  let readme = ''
  if (readmeRes.ok) {
    const readmeData = await readmeRes.json()
    if (readmeData.encoding === 'base64') {
      readme = Buffer.from(readmeData.content.replace(/\n/g, ''), 'base64').toString('utf-8')
    }
  }

  // package.json ou requirements.txt
  const [packageJson, requirements] = await Promise.all([
    fetchFileContent(owner, repo, 'package.json'),
    fetchFileContent(owner, repo, 'requirements.txt'),
  ])

  // Seleciona arquivos mais relevantes e busca em paralelo
  const scoredFiles = tree
    .filter(f => !f.startsWith('node_modules/') && !f.startsWith('.git/') && !f.startsWith('.next/'))
    .map(f => ({ path: f, score: scoreFile(f) }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)

  const filesToFetch = scoredFiles
    .slice(0, 12)
    .map(f => f.path)

  const fileContents = await Promise.all(
    filesToFetch.map(async (filePath) => {
      if (filePath === 'package.json' || filePath === 'requirements.txt') return null
      const content = await fetchFileContent(owner, repo, filePath)
      if (!content) return null
      return { path: filePath, content: content.slice(0, 5000) }
    })
  )

  const mainFiles = fileContents.filter((f): f is { path: string; content: string } => f !== null)

  // Inclui árvore de arquivos como contexto (ajuda a IA mapear a estrutura)
  const sourceFiles = tree.filter(f =>
    !f.startsWith('node_modules/') && !f.startsWith('.git/') && !f.startsWith('.next/') &&
    !/\.(png|jpg|svg|ico|woff|ttf|lock|map)$/i.test(f) &&
    f !== 'package-lock.json' && f !== 'yarn.lock' && f !== 'pnpm-lock.yaml'
  )
  if (sourceFiles.length > 0) {
    mainFiles.unshift({
      path: '__TREE__.txt',
      content: `Estrutura de arquivos do repositório (${sourceFiles.length} arquivos):\n${sourceFiles.join('\n')}`,
    })
  }

  return {
    readme: readme.slice(0, 5000),
    packageJson: packageJson ?? requirements,
    mainFiles,
    language: repoData.language,
    description: repoData.description,
  }
}
