import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseGitHubUrl, fetchRepoTree, getDefaultBranch, getLatestCommitSha, createBranch, updateFile, createPullRequest } from '@/lib/github'
import { gatherProblems, groupByFile, generateFix, type FixResult } from '@/lib/auto-fix'

export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Busca laudo com revisões e artifact
    const { data: laudo } = await supabase
      .from('laudos')
      .select('*, artifacts(*)')
      .eq('id', id)
      .maybeSingle()

    if (!laudo) return NextResponse.json({ error: 'Laudo não encontrado' }, { status: 404 })

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact?.github_url) {
      return NextResponse.json({ error: 'Este artefato não tem GitHub vinculado. Conecte o GitHub primeiro.' }, { status: 400 })
    }

    // 2. Coleta problemas de todas as revisões
    const problems = gatherProblems(laudo)
    if (problems.length === 0) {
      return NextResponse.json({ success: true, total_problems: 0, total_fixed: 0, total_skipped: 0, total_failed: 0, fixes_applied: [], fixes_skipped: [], fixes_failed: [], message: 'Nenhum problema encontrado para corrigir.' } as FixResult)
    }

    // 3. Parse GitHub URL
    const parsed = parseGitHubUrl(artifact.github_url)
    if (!parsed) return NextResponse.json({ error: 'URL do GitHub inválida' }, { status: 400 })
    const { owner, repo } = parsed

    // 4. Busca árvore do repo
    const tree = await fetchRepoTree(owner, repo)
    if (tree.length === 0) return NextResponse.json({ error: 'Repositório vazio ou inacessível' }, { status: 400 })

    // 5. Cria branch
    const defaultBranch = await getDefaultBranch(owner, repo)
    const sha = await getLatestCommitSha(owner, repo, defaultBranch)
    const branchName = `auditor/fixes-${Date.now()}`
    await createBranch(owner, repo, branchName, sha)

    // 6. Agrupa problemas por arquivo (lê conteúdo da branch nova)
    const groups = await groupByFile(problems, owner, repo, tree, branchName)
    if (groups.length === 0) {
      return NextResponse.json({
        success: true, branch: branchName,
        total_problems: problems.length, total_fixed: 0, total_skipped: problems.length, total_failed: 0,
        fixes_applied: [], fixes_skipped: [{ file: '*', reason: 'Nenhum problema pôde ser mapeado a um arquivo do repositório' }], fixes_failed: [],
      } as FixResult)
    }

    // 7. Para cada arquivo: gera fix via LLM e commita
    const applied: { file: string; problems: string[] }[] = []
    const skipped: { file: string; reason: string }[] = []
    const failed: { file: string; reason: string }[] = []

    for (const group of groups) {
      try {
        const fix = await generateFix(group)
        if (!fix) {
          skipped.push({ file: group.filePath, reason: 'IA não conseguiu gerar correção segura' })
          continue
        }
        await updateFile(owner, repo, group.filePath, fix.newContent, fix.commitMessage, branchName, group.currentSha)
        applied.push({ file: group.filePath, problems: fix.fixedProblems })
      } catch (err) {
        failed.push({ file: group.filePath, reason: String(err) })
      }
    }

    // 8. Cria PR (só se pelo menos 1 fix foi aplicado)
    let prUrl: string | undefined
    if (applied.length > 0) {
      const prTitle = `fix: ${applied.length} correções automáticas — Auditor Seazone`
      const prBody = buildPRBody(id, laudo.score ?? 0, laudo.resultado, problems.length, applied, skipped, failed)
      try {
        const pr = await createPullRequest(owner, repo, prTitle, prBody, branchName, defaultBranch)
        prUrl = pr.html_url
      } catch (err) {
        // PR falhou mas commits estão na branch
        console.error('[auto-fix] PR creation failed:', err)
      }
    }

    const result: FixResult = {
      success: true,
      pr_url: prUrl,
      branch: branchName,
      fixes_applied: applied,
      fixes_skipped: skipped,
      fixes_failed: failed,
      total_problems: problems.length,
      total_fixed: applied.length,
      total_skipped: skipped.length,
      total_failed: failed.length,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[auto-fix] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function buildPRBody(
  laudoId: string, score: number, resultado: string,
  totalProblems: number,
  applied: { file: string; problems: string[] }[],
  skipped: { file: string; reason: string }[],
  failed: { file: string; reason: string }[],
): string {
  let body = `## Correções Automáticas — Auditor Seazone\n\n`
  body += `**Laudo:** ${laudoId}\n`
  body += `**Score:** ${score}/100 (${resultado})\n`
  body += `**Problemas detectados:** ${totalProblems}\n`
  body += `**Correções aplicadas:** ${applied.length}\n\n`

  if (applied.length > 0) {
    body += `### Arquivos Modificados\n\n`
    body += `| Arquivo | Correções |\n|---------|----------|\n`
    for (const a of applied) {
      body += `| \`${a.file}\` | ${a.problems.join(', ')} |\n`
    }
    body += `\n`
  }

  if (skipped.length > 0) {
    body += `### Problemas Não Corrigidos\n\n`
    for (const s of skipped) {
      body += `- **${s.file}**: ${s.reason}\n`
    }
    body += `\n`
  }

  if (failed.length > 0) {
    body += `### Falhas\n\n`
    for (const f of failed) {
      body += `- **${f.file}**: ${f.reason}\n`
    }
    body += `\n`
  }

  body += `---\n*Correção automática gerada pelo Auditor Seazone. Revise as mudanças antes de fazer merge.*\n`
  return body
}
