import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeArtifact } from '@/lib/analyzer'
import { buildAnalysisContext, detectArtifactType, parseFileContent } from '@/lib/parser'
import { fetchRepoContent, parseGitHubUrl } from '@/lib/github'
import { detectUrlType, fetchUrlContent, detectEditorUrl } from '@/lib/url-fetcher'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, url, github_url, code, file_name, file_content, name, description, submitted_by, force } = body

    if (!submitted_by?.trim()) {
      return NextResponse.json({ error: 'Campo "submitted_by" é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const start = Date.now()

    const ORGS_APROVADAS = ['seazone-socios', 'businessoperations-seazone', 'seazone']

    let analysisContext = ''
    let artifactName = name?.trim() || 'Sem nome'
    let artifactType: 'planilha' | 'script' | 'dashboard' | 'flow' | 'query' | 'outro' = 'outro'
    let artifactSource: 'upload' | 'github' | 'url' = 'upload'
    let artifactContent = ''
    let artifactGithubUrl: string | null = null
    let artifactSourceUrl: string | null = null
    let semGithub = false
    let orgExterna = false
    let previewUrl: string | null = null
    let lovableProjectId: string | null = null

    // ── MODE: URL ───────────────────────────────────────────────────────────
    if (mode === 'url') {
      if (!url?.trim()) return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })

      // Bloqueia URLs de editores — não são apps deployadas
      const editorError = detectEditorUrl(url)
      if (editorError) return NextResponse.json({ error: editorError }, { status: 400 })

      // URL original (com tokens) para fetch, limpa para armazenar
      const fetchUrl = url.trim()
      const cleanUrl = (() => {
        try {
          const u = new URL(fetchUrl)
          u.searchParams.delete('__lovable_token')
          u.searchParams.delete('magic_link')
          u.searchParams.delete('token')
          u.searchParams.delete('access_token')
          return u.toString()
        } catch { return fetchUrl }
      })()
      const isPreview = fetchUrl.includes('__lovable_token') || new URL(fetchUrl).hostname.startsWith('preview--')

      // Extrai project_id do Lovable (JWT ou path /projects/{id})
      try {
        const parsedUrl = new URL(fetchUrl)
        const tokenParam = parsedUrl.searchParams.get('__lovable_token')
        if (tokenParam) {
          const payload = JSON.parse(Buffer.from(tokenParam.split('.')[1], 'base64').toString())
          lovableProjectId = payload.project_id ?? null
        }
        // lovable.dev/projects/{uuid}
        const pathMatch = parsedUrl.pathname.match(/\/projects\/([a-f0-9-]{36})/)
        if (pathMatch && !lovableProjectId) {
          lovableProjectId = pathMatch[1]
        }
      } catch {}

      const urlType = detectUrlType(cleanUrl)

      if (urlType === 'github-repo' || urlType === 'github-file') {
        // Verifica se o repo está na org certa
        const parsed = parseGitHubUrl(cleanUrl)
        if (parsed && !ORGS_APROVADAS.includes(parsed.owner.toLowerCase())) {
          orgExterna = true
        }
        if (parsed) previewUrl = `https://opengraph.githubassets.com/1/${parsed.owner}/${parsed.repo}`
        const repoContent = await fetchRepoContent(cleanUrl)
        artifactName = name?.trim() || parseGitHubUrl(cleanUrl)?.repo || 'Repositório GitHub'
        artifactType = 'script'
        artifactSource = 'github'
        artifactGithubUrl = cleanUrl
        artifactContent = repoContent.mainFiles.map(f => `// ${f.path}\n${f.content}`).join('\n\n')

        analysisContext = buildAnalysisContext(
          artifactName,
          artifactContent,
          description ?? '',
          { url: cleanUrl, language: repoContent.language, readme: repoContent.readme }
        )
        if (repoContent.packageJson) {
          analysisContext += `\n### Dependências\n\`\`\`\n${repoContent.packageJson.slice(0, 2000)}\n\`\`\``
        }
      } else if (cleanUrl.includes('lovable.dev/')) {
        // Lovable editor URL — registra artefato e pula análise se não tem GitHub
        artifactSourceUrl = cleanUrl
        artifactSource = 'url'
        artifactName = name?.trim() || 'Projeto Lovable'
        artifactType = 'outro'

        if (github_url?.trim()) {
          // Tem GitHub — busca código e faz análise normal
          const parsedGh = parseGitHubUrl(github_url.trim())
          if (parsedGh && !ORGS_APROVADAS.includes(parsedGh.owner.toLowerCase())) orgExterna = true
          try {
            const repoContent = await fetchRepoContent(github_url.trim())
            artifactGithubUrl = github_url.trim()
            artifactContent = repoContent.mainFiles.map((f: any) => `// ${f.path}\n${f.content}`).join('\n\n')
            if (repoContent.readme) artifactContent = `## README\n${repoContent.readme}\n\n${artifactContent}`
            if (repoContent.packageJson) artifactContent += `\n\n// package.json\n${repoContent.packageJson}`
            artifactName = name?.trim() || parsedGh?.repo || 'Projeto Lovable'
          } catch {}
          analysisContext = buildAnalysisContext(artifactName, artifactContent, description ?? '', { url: cleanUrl })
        } else {
          // Sem GitHub — não cria nada, retorna erro com instruções
          return NextResponse.json({
            error: 'link_editor',
            message: 'Este é o link do editor. Para analisar, use o link de preview ou conecte o GitHub.',
            lovable_project_id: lovableProjectId,
          }, { status: 422 })
        }
      } else {
        // Lovable app / Vercel / externo
        const fetched = await fetchUrlContent(fetchUrl)
        artifactSourceUrl = cleanUrl
        artifactSource = 'url'
        if (fetched.previewUrl) previewUrl = fetched.previewUrl

        const effectiveGithubUrl = github_url?.trim() || fetched.detectedGithubUrl
        if (effectiveGithubUrl) {
          const parsedGh = parseGitHubUrl(effectiveGithubUrl)
          if (parsedGh && !ORGS_APROVADAS.includes(parsedGh.owner.toLowerCase())) orgExterna = true
          try {
            const repoContent = await fetchRepoContent(effectiveGithubUrl)
            artifactGithubUrl = effectiveGithubUrl
            artifactContent = repoContent.mainFiles.map(f => `// ${f.path}\n${f.content}`).join('\n\n')
            artifactName = name?.trim() || fetched.title || parseGitHubUrl(effectiveGithubUrl)?.repo || 'Aplicação'
            artifactType = 'script'
            artifactSource = 'github'

            analysisContext = buildAnalysisContext(
              artifactName,
              artifactContent,
              description ?? '',
              { url: effectiveGithubUrl, language: repoContent.language, readme: repoContent.readme }
            )
            analysisContext += `\n\n**URL do artefato deployado:** ${cleanUrl}`
            if (repoContent.packageJson) {
              analysisContext += `\n### Dependências\n\`\`\`\n${repoContent.packageJson.slice(0, 2000)}\n\`\`\``
            }
          } catch {
            artifactContent = fetched.content
            artifactName = name?.trim() || fetched.title || 'Aplicação'
            analysisContext = `## Artefato: ${artifactName}\n**URL:** ${cleanUrl}\n**Tipo detectado:** ${urlType}\n${fetched.content}`
          }
        } else {
          artifactContent = fetched.content
          // Extrai nome do subdomínio Lovable (preview--nome.lovable.app → nome)
          const lovableNameMatch = cleanUrl.match(/(?:preview--)?([a-z0-9-]+)\.lovable\.app/)
          const lovableName = lovableNameMatch?.[1]?.replace(/-/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase())
          artifactName = name?.trim() || (lovableName && lovableName !== 'Preview') ? lovableName! : fetched.title || 'Aplicação'
          analysisContext = `## Artefato: ${artifactName}\n**URL:** ${cleanUrl}\n**Tipo detectado:** ${urlType}\n\n${fetched.content}`
          if (description) analysisContext = `**Objetivo declarado:** ${description}\n\n` + analysisContext
          if (urlType === 'lovable' || urlType === 'vercel') semGithub = true
        }
      }

    // ── MODE: CODE ─────────────────────────────────────────────────────────
    } else if (mode === 'code') {
      if (!code?.trim()) return NextResponse.json({ error: 'Conteúdo do código é obrigatório' }, { status: 400 })
      if (code.trim().length < 10) return NextResponse.json({ error: 'Conteúdo muito curto para analisar' }, { status: 400 })

      const fn = file_name?.trim() || 'codigo.txt'
      const parsed = parseFileContent(fn, code)
      artifactName = name?.trim() || fn
      artifactType = parsed.type
      artifactContent = parsed.text
      artifactSource = 'upload'

      analysisContext = buildAnalysisContext(artifactName, artifactContent, description ?? '')

    // ── MODE: FILE ─────────────────────────────────────────────────────────
    } else if (mode === 'file') {
      if (!file_content?.trim()) return NextResponse.json({ error: 'Conteúdo do arquivo é obrigatório' }, { status: 400 })
      if (!file_name?.trim()) return NextResponse.json({ error: 'Nome do arquivo é obrigatório' }, { status: 400 })

      const parsed = parseFileContent(file_name, file_content)
      artifactName = name?.trim() || file_name
      artifactType = parsed.type
      artifactContent = parsed.text
      artifactSource = 'upload'

      analysisContext = buildAnalysisContext(artifactName, artifactContent, description ?? '')

    } else {
      return NextResponse.json({ error: 'Modo inválido. Use: url, code ou file' }, { status: 400 })
    }

    // ── Verificar duplicata ──────────────────────────────────────────────
    let existingArtifactId: string | null = null
    let existingLaudoId: string | null = null
    let contentChanged = false
    if (artifactSourceUrl || artifactGithubUrl) {
      const orConditions: string[] = []
      if (artifactSourceUrl) orConditions.push(`source_url.eq.${artifactSourceUrl}`)
      if (artifactGithubUrl) orConditions.push(`github_url.eq.${artifactGithubUrl}`)

      const { data: existing } = await (supabase
        .from('artifacts')
        .select('id, content, github_url, laudos(id)') as any)
        .or(orConditions.join(','))
        .limit(1)
        .maybeSingle()

      if (existing) {
        const laudos = existing.laudos as { id: string }[] | { id: string } | null
        existingLaudoId = Array.isArray(laudos) ? laudos[0]?.id : (laudos as any)?.id
        if (!force) {
          // Salva lovable_project_id se extraído agora mas ausente no artifact
          if (lovableProjectId && !(existing as any).lovable_project_id) {
            await supabase.from('artifacts').update({ lovable_project_id: lovableProjectId } as any).eq('id', existing.id)
          }
          return NextResponse.json({
            error: 'Este artefato já foi analisado anteriormente.',
            existing_laudo_id: existingLaudoId ?? null,
            existing_artifact_id: existing.id,
            has_github: !!(existing as any).github_url,
            lovable_project_id: (existing as any).lovable_project_id ?? lovableProjectId,
          }, { status: 409 })
        }
        existingArtifactId = existing.id
        // Re-análise com force: sempre substitui o laudo existente (não cria versão)
        contentChanged = false
      }
    }

    // ── Persistir artefato (reusar existente se nova versão) ──────────────
    let artifact: { id: string } | null = null
    let artifactError: unknown = null

    if (existingArtifactId) {
      artifact = { id: existingArtifactId }
    } else {
      const insertData: Record<string, unknown> = {
          name: artifactName,
          type: artifactType,
          source: artifactSource,
          source_url: artifactSourceUrl,
          github_url: artifactGithubUrl,
          content: artifactContent.slice(0, 20000),
          description: description ?? null,
          submitted_by: submitted_by.trim(),
          status: 'analyzing',
        }
      if (previewUrl) insertData.preview_url = previewUrl
      if (lovableProjectId) insertData.lovable_project_id = lovableProjectId
      const result = await supabase
        .from('artifacts')
        .insert(insertData as any)
        .select()
        .single()
      artifact = result.data
      artifactError = result.error
    }

    if (artifactError || !artifact) {
      console.error('[analyze] artifact insert error:', artifactError)
      return NextResponse.json({ error: 'Erro ao salvar artefato' }, { status: 500 })
    }

    // ── Rodar análise IA ───────────────────────────────────────────────────
    let laudoResult
    try {
      laudoResult = await analyzeArtifact(analysisContext)
    } catch (aiError) {
      if (!existingArtifactId) await supabase.from('artifacts').delete().eq('id', artifact.id)
      return NextResponse.json({ error: String(aiError) }, { status: 500 })
    }

    const tempo_analise_ms = Date.now() - start

    // ── Persistir laudo ────────────────────────────────────────────────────
    let laudo: { id: string } | null = null
    let laudoError: unknown = null
    let version = 1

    if (existingArtifactId && !contentChanged && existingLaudoId) {
      // Conteúdo igual → substitui o laudo existente (mesmo artefato)
      const { data, error } = await supabase
        .from('laudos')
        .update({
          resultado: laudoResult.resultado,
          score: laudoResult.score,
          resumo: laudoResult.resumo,
          checks: laudoResult.checks as unknown as import('@/types/database').Json,
          model_used: laudoResult.model_used,
          tempo_analise_ms,
        } as any)
        .eq('id', existingLaudoId)
        .select()
        .single()
      laudo = data
      laudoError = error
      // Atualiza conteúdo do artefato se mudou algo menor
      await supabase.from('artifacts').update({ content: artifactContent.slice(0, 20000) } as any).eq('id', existingArtifactId)
    } else {
      // Conteúdo mudou ou artefato novo → cria novo laudo (nova versão)
      if (existingArtifactId && contentChanged) {
        const { data: versionRows } = await supabase
          .from('laudos')
          .select('version')
          .eq('artifact_id', artifact!.id)
          .order('version', { ascending: false })
          .limit(1)
        version = ((versionRows?.[0] as any)?.version ?? 1) + 1
        // Atualiza conteúdo do artefato
        await supabase.from('artifacts').update({ content: artifactContent.slice(0, 20000) } as any).eq('id', existingArtifactId)
      }

      const laudoInsert: Record<string, unknown> = {
        artifact_id: artifact!.id,
        resultado: laudoResult.resultado,
        score: laudoResult.score,
        resumo: laudoResult.resumo,
        checks: laudoResult.checks as unknown as import('@/types/database').Json,
        model_used: laudoResult.model_used,
        tempo_analise_ms,
      }
      if (version > 1) laudoInsert.version = version

      const { data, error } = await supabase
        .from('laudos')
        .insert(laudoInsert as any)
        .select()
        .single()
      laudo = data
      laudoError = error
    }

    if (laudoError || !laudo) {
      console.error('[analyze] laudo insert/update error:', laudoError)
      return NextResponse.json({ error: 'Erro ao salvar laudo' }, { status: 500 })
    }

    if (!existingArtifactId) await supabase.from('artifacts').update({ status: 'done' }).eq('id', artifact.id)

    const replaced = existingArtifactId && !contentChanged && !!existingLaudoId
    return NextResponse.json({ laudo_id: laudo.id, artifact_id: artifact!.id, resultado: laudoResult.resultado, score: laudoResult.score, version, sem_github: semGithub, org_externa: orgExterna, replaced, content_changed: contentChanged, lovable_project_id: lovableProjectId })
  } catch (err) {
    console.error('[analyze] unhandled error:', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
