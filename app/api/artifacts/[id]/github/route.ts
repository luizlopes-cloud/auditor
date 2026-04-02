import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GITHUB_API = 'https://api.github.com'
const TARGET_ORG = 'businessoperations-seazone'

function githubHeaders() {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'auditor-seazone',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action } = await req.json()
    const supabase = await createClient()

    const { data: artifact } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })

    // ── ACTION: transfer — transfere repo de conta pessoal para org ──
    if (action === 'transfer') {
      const githubUrl = (artifact as any).github_url
      if (!githubUrl) return NextResponse.json({ error: 'Artefato não tem GitHub URL' }, { status: 400 })

      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) return NextResponse.json({ error: 'URL do GitHub inválida' }, { status: 400 })

      const [, owner, repo] = match
      const repoName = repo.replace(/\.git$/, '')

      if (owner.toLowerCase() === TARGET_ORG.toLowerCase()) {
        return NextResponse.json({ error: 'Repositório já está na organização correta' }, { status: 400 })
      }

      // Transfer via GitHub API
      const res = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/transfer`, {
        method: 'POST',
        headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner: TARGET_ORG }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return NextResponse.json({
          error: `Erro ao transferir: ${err.message ?? res.statusText}. Verifique se o token tem permissão de admin no repo.`,
        }, { status: res.status })
      }

      const newRepo = await res.json()
      const newUrl = newRepo.html_url

      // Atualiza URL no artifact
      await supabase.from('artifacts').update({ github_url: newUrl } as any).eq('id', id)

      return NextResponse.json({ success: true, new_url: newUrl, message: `Transferido para ${TARGET_ORG}/${repoName}` })
    }

    // ── ACTION: create — cria repo na org e faz push do conteúdo ──
    if (action === 'create') {
      const content = (artifact as any).content ?? ''
      const name = ((artifact as any).name ?? 'artefato').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')

      if (!content || content.length < 20) {
        return NextResponse.json({ error: 'Conteúdo insuficiente para criar repositório' }, { status: 400 })
      }

      // Cria repo na org
      const createRes = await fetch(`${GITHUB_API}/orgs/${TARGET_ORG}/repos`, {
        method: 'POST',
        headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: (artifact as any).description ?? `Artefato homologado via Auditor Seazone`,
          private: true,
          auto_init: true,
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        return NextResponse.json({ error: `Erro ao criar repo: ${err.message ?? createRes.statusText}` }, { status: createRes.status })
      }

      const repo = await createRes.json()

      // Push do conteúdo como um único arquivo (ou múltiplos se tiver separação)
      const fileName = ((artifact as any).name ?? 'main').replace(/[^a-zA-Z0-9._-]/g, '_')
      const ext = detectExtension((artifact as any).type)
      const filePath = `src/${fileName}${ext}`

      // Cria arquivo via Contents API
      const pushRes = await fetch(`${GITHUB_API}/repos/${TARGET_ORG}/${name}/contents/${filePath}`, {
        method: 'PUT',
        headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat: código do artefato homologado via Auditor',
          content: Buffer.from(content.slice(0, 50000)).toString('base64'),
        }),
      })

      if (!pushRes.ok) {
        const err = await pushRes.json().catch(() => ({}))
        return NextResponse.json({ error: `Repo criado mas erro no push: ${err.message ?? pushRes.statusText}` }, { status: 500 })
      }

      const newUrl = repo.html_url

      // Atualiza artifact
      await supabase.from('artifacts').update({ github_url: newUrl } as any).eq('id', id)

      return NextResponse.json({ success: true, new_url: newUrl, message: `Repositório criado: ${TARGET_ORG}/${name}` })
    }

    // ── ACTION: lovable_link — retorna link para settings do Lovable ──
    if (action === 'lovable_link') {
      const sourceUrl = (artifact as any).source_url ?? ''
      // Tenta extrair project ID do Lovable a partir da URL
      // URLs lovable: xxx.lovable.app → project pode ser extraído do HTML ou da URL
      const lovableSettingsUrl = sourceUrl
        ? `Abra o projeto no Lovable → Settings → GitHub → Publish to GitHub`
        : null

      return NextResponse.json({
        success: true,
        message: 'Siga as instruções para conectar o GitHub no Lovable',
        steps: [
          'Abra o projeto no editor do Lovable (lovable.dev)',
          'Clique no ícone do GitHub (🔗) na barra superior',
          'Conecte sua conta GitHub se ainda não conectou',
          'Selecione a organização "businessoperations-seazone"',
          'Clique em "Publish to GitHub"',
          'Volte aqui e re-submeta o artefato com o link do GitHub',
        ],
        lovable_url: sourceUrl,
      })
    }

    return NextResponse.json({ error: 'Ação inválida. Use: transfer, create, lovable_link' }, { status: 400 })
  } catch (err) {
    console.error('[github action] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function detectExtension(type: string): string {
  switch (type) {
    case 'script': return '.ts'
    case 'query': return '.sql'
    case 'planilha': return '.csv'
    case 'flow': return '.json'
    default: return '.txt'
  }
}
