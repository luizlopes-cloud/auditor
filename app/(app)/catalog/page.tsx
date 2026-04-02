import { createClient } from '@/lib/supabase/server'
import { CatalogClient } from './CatalogClient'

export default async function CatalogPage() {
  const supabase = await createClient()

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('id, name, type, equipe, source, created_at, laudos(id, score, resultado, created_at)')
    .order('created_at', { ascending: false })

  const approved = (artifacts ?? []).filter((a: any) => {
    const laudo = Array.isArray(a.laudos) ? a.laudos[0] : a.laudos
    return laudo?.resultado === 'aprovado'
  }).map((a: any) => {
    const laudo = Array.isArray(a.laudos) ? a.laudos[0] : a.laudos
    return { ...a, laudo }
  })

  return <CatalogClient artifacts={approved} />
}
