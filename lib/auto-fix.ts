import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getFileSha } from './github'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

// ── Types ────────────────────────────────────────────────────────────────

export interface FixableProblem {
  source: 'review_code' | 'review_ui' | 'checks' | 'funcionalidades'
  categoria: string
  item: string
  status: 'erro' | 'aviso'
  detalhe: string
  sugestao: string
  arquivo?: string
}

export interface FileFixGroup {
  filePath: string
  problems: FixableProblem[]
  currentContent: string
  currentSha: string
}

export interface GeneratedFix {
  filePath: string
  newContent: string
  commitMessage: string
  fixedProblems: string[]
}

export interface FixResult {
  success: boolean
  pr_url?: string
  branch?: string
  fixes_applied: { file: string; problems: string[] }[]
  fixes_skipped: { file: string; reason: string }[]
  fixes_failed: { file: string; reason: string }[]
  total_problems: number
  total_fixed: number
  total_skipped: number
  total_failed: number
  error?: string
}

// ── Gather Problems ──────────────────────────────────────────────────────

export function gatherProblems(laudo: any): FixableProblem[] {
  const problems: FixableProblem[] = []

  // review_code: tem campo "arquivo" (melhor fonte)
  for (const cat of (laudo as any).review_code?.categorias ?? []) {
    for (const item of cat.itens ?? []) {
      if ((item.status === 'erro' || item.status === 'aviso') && item.sugestao) {
        problems.push({
          source: 'review_code', categoria: cat.nome, item: item.item,
          status: item.status, detalhe: item.detalhe, sugestao: item.sugestao,
          arquivo: item.arquivo || undefined,
        })
      }
    }
  }

  // checks do laudo
  for (const check of (laudo.checks ?? []) as any[]) {
    if ((check.status === 'erro' || check.status === 'aviso') && check.sugestao) {
      problems.push({
        source: 'checks', categoria: check.categoria, item: check.item,
        status: check.status, detalhe: check.detalhe, sugestao: check.sugestao,
      })
    }
  }

  // review_ui: sem arquivo
  for (const cat of (laudo as any).review_ui?.categorias ?? []) {
    for (const item of cat.itens ?? []) {
      if ((item.status === 'erro' || item.status === 'aviso') && item.sugestao) {
        problems.push({
          source: 'review_ui', categoria: cat.nome, item: item.item,
          status: item.status, detalhe: item.detalhe, sugestao: item.sugestao,
        })
      }
    }
  }

  return problems
}

// ── Group By File ────────────────────────────────────────────────────────

export async function groupByFile(
  problems: FixableProblem[],
  owner: string,
  repo: string,
  tree: string[],
  branch: string,
): Promise<FileFixGroup[]> {
  const fileMap = new Map<string, FixableProblem[]>()

  // Problemas com arquivo explícito
  for (const p of problems) {
    if (p.arquivo) {
      // Normaliza path (remove ./ prefix)
      const path = p.arquivo.replace(/^\.\//, '')
      // Verifica se existe na tree
      const match = tree.find(f => f === path || f.endsWith(`/${path}`) || f.includes(path))
      if (match) {
        const list = fileMap.get(match) ?? []
        list.push(p)
        fileMap.set(match, list)
      }
    }
  }

  // Problemas sem arquivo → tenta match heurístico
  const unmatched = problems.filter(p => !p.arquivo)
  if (unmatched.length > 0) {
    // Busca o arquivo principal (App.tsx, main.ts, index.tsx, etc.)
    const mainFile = tree.find(f =>
      /app\.(tsx?|jsx?)$/i.test(f) ||
      /main\.(tsx?|jsx?|py|ts)$/i.test(f) ||
      /index\.(tsx?|jsx?)$/i.test(f)
    )
    if (mainFile) {
      const list = fileMap.get(mainFile) ?? []
      // Só adiciona problemas que parecem code-level
      for (const p of unmatched) {
        if (p.source === 'review_code' || p.source === 'checks') {
          list.push(p)
        }
      }
      if (list.length > 0) fileMap.set(mainFile, list)
    }
  }

  // Limita a 15 arquivos
  const entries = [...fileMap.entries()].slice(0, 15)

  // Busca conteúdo e SHA de cada arquivo
  const groups: FileFixGroup[] = []
  for (const [filePath, probs] of entries) {
    try {
      const { sha, content } = await getFileSha(owner, repo, filePath, branch)
      if (content.length > 100000) continue // Skip arquivos muito grandes
      groups.push({ filePath, problems: probs, currentContent: content, currentSha: sha })
    } catch {
      // Arquivo não encontrado na branch, skip
    }
  }

  return groups
}

// ── Generate Fix ─────────────────────────────────────────────────────────

const FIX_PROMPT = `Você é um engenheiro sênior. Corrija os problemas listados abaixo no arquivo.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o arquivo completo corrigido
2. NÃO use markdown (sem \`\`\`), retorne código puro
3. NÃO remova funcionalidade existente
4. NÃO mude formatação/estilo geral
5. Faça APENAS as correções solicitadas, nada mais
6. Se NÃO consegue corrigir com segurança, retorne EXATAMENTE "SKIP"
7. Preserve imports, exports e estrutura do arquivo
8. Mantenha a mesma linguagem (TypeScript, JavaScript, etc.)`

export async function generateFix(group: FileFixGroup): Promise<GeneratedFix | null> {
  const problemsList = group.problems
    .map((p, i) => `${i + 1}. [${p.status.toUpperCase()}] ${p.item}\n   Detalhe: ${p.detalhe}\n   Correção: ${p.sugestao}`)
    .join('\n\n')

  const prompt = `${FIX_PROMPT}

ARQUIVO: ${group.filePath}

PROBLEMAS A CORRIGIR:
${problemsList}

CÓDIGO ATUAL:
${group.currentContent}

Retorne o arquivo COMPLETO corrigido:`

  const result = await generateText({
    model: openrouter('google/gemini-2.0-flash-001'),
    prompt,
    temperature: 0,
  })

  const text = result.text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()

  if (text === 'SKIP' || text.length < 10) return null
  if (text === group.currentContent) return null // Nenhuma mudança

  const fixedNames = group.problems.map(p => p.item)
  const categoria = group.problems[0]?.categoria ?? 'geral'
  const commitMessage = `fix(${categoria}): ${fixedNames.slice(0, 3).join(', ')}${fixedNames.length > 3 ? ` +${fixedNames.length - 3}` : ''}\n\nCorreção automática via Auditor Seazone`

  return {
    filePath: group.filePath,
    newContent: text,
    commitMessage,
    fixedProblems: fixedNames,
  }
}
