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
  filePath?: string // presente quando URL aponta para arquivo específico
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  try {
    const u = new URL(url)
    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/')
    if (parts.length < 2) return null
    const owner = parts[0]
    const repo = parts[1]
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

const IMPORTANT_PATTERNS = [
  /^main\.(py|ts|js|go)$/,
  /^app\.(py|ts|js)$/,
  /^index\.(py|ts|js)$/,
  /^server\.(py|ts|js)$/,
  /^workflow\.json$/,
  /^flow\.json$/,
  /requirements\.txt$/,
  /\.sql$/,
  /\.env\.example$/,
]

function scoreFile(path: string): number {
  const file = path.split('/').pop() ?? ''
  for (let i = 0; i < IMPORTANT_PATTERNS.length; i++) {
    if (IMPORTANT_PATTERNS[i].test(file)) return IMPORTANT_PATTERNS.length - i
  }
  return 0
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
  const filesToFetch = tree
    .filter(f => !f.startsWith('node_modules/') && !f.startsWith('.git/'))
    .map(f => ({ path: f, score: scoreFile(f) }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(f => f.path)

  const fileContents = await Promise.all(
    filesToFetch.map(async (filePath) => {
      if (filePath === 'package.json' || filePath === 'requirements.txt') return null
      const content = await fetchFileContent(owner, repo, filePath)
      if (!content) return null
      return { path: filePath, content: content.slice(0, 3000) }
    })
  )

  const mainFiles = fileContents.filter((f): f is { path: string; content: string } => f !== null)

  return {
    readme: readme.slice(0, 5000),
    packageJson: packageJson ?? requirements,
    mainFiles,
    language: repoData.language,
    description: repoData.description,
  }
}
