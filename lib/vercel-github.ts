/**
 * Dado uma URL Vercel (*.vercel.app), descobre o GitHub repo vinculado
 * via Vercel API → deployment meta (githubOrg + githubRepo)
 */
export async function detectGithubFromVercel(vercelUrl: string): Promise<string | null> {
  const token = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN
  if (!token) return null

  try {
    // Extrai project name do subdomínio
    const url = new URL(vercelUrl)
    const host = url.hostname
    if (!host.endsWith('.vercel.app')) return null

    // Remove sufixos: project-hash-team.vercel.app → tenta com o nome completo
    const subdomain = host.replace('.vercel.app', '')

    // Tenta encontrar o projeto em cada team
    const teams = await fetchTeams(token)

    for (const team of teams) {
      const projectId = await findProject(token, subdomain, team.id)
      if (!projectId) continue

      // Busca último deployment e pega githubOrg + githubRepo do meta
      const github = await getGithubFromDeployment(token, projectId, team.id)
      if (github) return github
    }

    return null
  } catch (err) {
    console.error('[vercel-github] error:', err)
    return null
  }
}

async function fetchTeams(token: string): Promise<{ id: string; slug: string }[]> {
  const res = await fetch('https://api.vercel.com/v2/teams', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.teams ?? []).map((t: any) => ({ id: t.id, slug: t.slug }))
}

async function findProject(token: string, name: string, teamId: string): Promise<string | null> {
  // Tenta nome exato
  const res = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(name)}?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) {
    const data = await res.json()
    return data.id
  }

  // Tenta sem sufixo de hash (ex: auditor-ashy → auditor)
  const baseName = name.replace(/-[a-z]{3,6}$/, '')
  if (baseName !== name) {
    const res2 = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(baseName)}?teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res2.ok) {
      const data = await res2.json()
      return data.id
    }
  }

  return null
}

async function getGithubFromDeployment(token: string, projectId: string, teamId: string): Promise<string | null> {
  const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  const dep = data.deployments?.[0]
  if (!dep) return null

  const meta = dep.meta ?? {}
  const org = meta.githubOrg
  const repo = meta.githubRepo
  if (org && repo) return `https://github.com/${org}/${repo}`

  return null
}
