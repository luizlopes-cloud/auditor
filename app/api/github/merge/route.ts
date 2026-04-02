import { NextRequest, NextResponse } from 'next/server'

const GITHUB_API = 'https://api.github.com'

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, pull_number } = await req.json()
    if (!owner || !repo || !pull_number) {
      return NextResponse.json({ error: 'owner, repo e pull_number são obrigatórios' }, { status: 400 })
    }

    const token = process.env.GITHUB_TOKEN
    if (!token) return NextResponse.json({ error: 'Token GitHub não configurado' }, { status: 500 })

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${pull_number}/merge`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merge_method: 'squash',
        commit_title: `fix: correções automáticas do Auditor Seazone (#${pull_number})`,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.message ?? `Erro HTTP ${res.status}` }, { status: res.status })
    }

    return NextResponse.json({ merged: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
