const SUPABASE_API = 'https://api.supabase.com/v1'

/**
 * Extrai o project ref de uma URL do Supabase
 * Ex: https://fxjpnamoafzomqlncdyn.supabase.co → fxjpnamoafzomqlncdyn
 */
export function extractProjectRef(content: string): string | null {
  // Match URL: https://{ref}.supabase.co
  const urlMatch = content.match(/https?:\/\/([a-z]{20,})\.supabase\.co/i)
  if (urlMatch) return urlMatch[1]

  // Match createClient('https://{ref}.supabase.co', ...)
  const clientMatch = content.match(/supabase\.co/)
  if (!clientMatch) return null

  // Broader search
  const refMatch = content.match(/([a-z]{20,})\.supabase\.co/)
  return refMatch?.[1] ?? null
}

interface TableInfo {
  name: string
  columns: { name: string; type: string; nullable: boolean }[]
  rowCount?: number
}

/**
 * Busca schema (tabelas + colunas) de um projeto Supabase
 */
export async function fetchSupabaseSchema(projectRef: string): Promise<TableInfo[]> {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return []

  try {
    // Lista tabelas e colunas
    const res = await fetch(`${SUPABASE_API}/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          SELECT
            t.tablename as table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            (SELECT count(*) FROM information_schema.columns ic WHERE ic.table_schema = 'public' AND ic.table_name = t.tablename) as col_count
          FROM pg_tables t
          JOIN information_schema.columns c ON c.table_schema = 'public' AND c.table_name = t.tablename
          WHERE t.schemaname = 'public'
          ORDER BY t.tablename, c.ordinal_position
        `,
      }),
    })

    if (!res.ok) return []
    const rows = await res.json()

    // Agrupa por tabela
    const tables = new Map<string, TableInfo>()
    for (const row of rows as any[]) {
      const name = row.table_name
      if (!tables.has(name)) {
        tables.set(name, { name, columns: [] })
      }
      tables.get(name)!.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
      })
    }

    // Busca contagem de rows (aproximada)
    try {
      const countRes = await fetch(`${SUPABASE_API}/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            SELECT relname as table_name, n_live_tup as row_count
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
          `,
        }),
      })
      if (countRes.ok) {
        const counts = await countRes.json()
        for (const c of counts as any[]) {
          const t = tables.get(c.table_name)
          if (t) t.rowCount = c.row_count
        }
      }
    } catch {}

    return [...tables.values()]
  } catch (err) {
    console.error('[supabase-schema] error:', err)
    return []
  }
}

/**
 * Formata schema para contexto do LLM
 */
export function formatSchemaForLLM(tables: TableInfo[]): string {
  if (tables.length === 0) return ''

  let output = `\n\n=== SCHEMA DO BANCO DE DADOS (Supabase) ===\n`
  output += `${tables.length} tabelas encontradas:\n\n`

  for (const t of tables) {
    output += `**${t.name}** (${t.rowCount ?? '?'} registros)\n`
    for (const c of t.columns) {
      output += `  - ${c.name}: ${c.type}${c.nullable ? ' (nullable)' : ''}\n`
    }
    output += `\n`
  }

  return output
}
