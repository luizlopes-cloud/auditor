import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeArtifact } from '@/lib/analyzer'
import { buildAnalysisContext } from '@/lib/parser'
import { fetchRepoContent } from '@/lib/github'
import { fetchUrlContent } from '@/lib/url-fetcher'

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

    const artifact = Array.isArray(laudo.artifacts) ? laudo.artifacts[0] : laudo.artifacts
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    const start = Date.now()

    // Re-fetch content if possible to capture latest changes
    let content = artifact.content ?? ''
    if (artifact.github_url) {
      try {
        const repo = await fetchRepoContent(artifact.github_url)
        content = repo.mainFiles.map((f: any) => `// ${f.path}\n${f.content}`).join('\n\n')
      } catch {}
    } else if (artifact.source_url) {
      try {
        const fetched = await fetchUrlContent(artifact.source_url)
        content = fetched.content
      } catch {}
    }

    const analysisContext = buildAnalysisContext(artifact.name, content, artifact.description ?? '')

    // Determine next version
    const { data: versions } = await supabase
      .from('laudos')
      .select('version')
      .eq('artifact_id', artifact.id)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = ((versions?.[0] as any)?.version ?? 1) + 1

    const laudoResult = await analyzeArtifact(analysisContext)
    const tempo_analise_ms = Date.now() - start

    const { data: newLaudo, error } = await supabase
      .from('laudos')
      .insert({
        artifact_id: artifact.id,
        resultado: laudoResult.resultado,
        score: laudoResult.score,
        resumo: laudoResult.resumo,
        checks: laudoResult.checks as unknown as import('@/types/database').Json,
        model_used: laudoResult.model_used,
        tempo_analise_ms,
        version: nextVersion,
      } as any)
      .select()
      .single()

    if (error || !newLaudo) {
      console.error('[reanalyze] insert error:', error)
      return NextResponse.json({ error: 'Erro ao salvar re-análise' }, { status: 500 })
    }

    return NextResponse.json({ laudo_id: newLaudo.id, version: nextVersion, resultado: laudoResult.resultado, score: laudoResult.score })
  } catch (err) {
    console.error('[reanalyze] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
