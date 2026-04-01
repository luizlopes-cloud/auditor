export interface ParsedArtifact {
  text: string
  type: 'planilha' | 'script' | 'dashboard' | 'flow' | 'query' | 'outro'
  warnings: string[]
}

const TEXT_EXTENSIONS = ['.py', '.ts', '.js', '.sql', '.json', '.yaml', '.yml', '.txt', '.md', '.csv', '.sh']

export function detectArtifactType(fileName: string, content: string): ParsedArtifact['type'] {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''

  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return 'planilha'
  if (['py', 'ts', 'js', 'sh', 'bash'].includes(ext)) return 'script'
  if (['sql'].includes(ext)) return 'query'
  if (['json', 'yaml', 'yml'].includes(ext)) {
    if (content.includes('nodes') && content.includes('connections')) return 'flow' // n8n
    if (content.includes('dashboard') || content.includes('panels')) return 'dashboard' // Grafana/Metabase
    return 'outro'
  }
  return 'outro'
}

export function parseFileContent(fileName: string, rawContent: string): ParsedArtifact {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  const warnings: string[] = []

  if (!TEXT_EXTENSIONS.some(e => fileName.toLowerCase().endsWith(e))) {
    warnings.push(`Formato .${ext} — análise parcial (conteúdo binário não pode ser inspecionado)`)
  }

  const text = rawContent.slice(0, 20000) // limite para a IA
  const type = detectArtifactType(fileName, text)

  return { text, type, warnings }
}

export function buildAnalysisContext(
  fileName: string,
  content: string,
  description: string,
  fromGitHub?: { url: string; language?: string | null; readme?: string }
): string {
  const parts: string[] = []

  parts.push(`## Artefato: ${fileName}`)
  if (description) parts.push(`**Objetivo declarado:** ${description}`)
  if (fromGitHub) {
    parts.push(`**Fonte:** GitHub — ${fromGitHub.url}`)
    if (fromGitHub.language) parts.push(`**Linguagem principal:** ${fromGitHub.language}`)
    if (fromGitHub.readme) parts.push(`\n### README\n${fromGitHub.readme.slice(0, 2000)}`)
  }
  parts.push(`\n### Conteúdo\n\`\`\`\n${content.slice(0, 15000)}\n\`\`\``)

  return parts.join('\n')
}
