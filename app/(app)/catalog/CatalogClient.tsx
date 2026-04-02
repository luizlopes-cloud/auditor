'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ScoreBadge } from '@/components/ScoreBadge'
import { Search, FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion, MessageCircleQuestion } from 'lucide-react'

const typeIcon: Record<string, React.ElementType> = {
  script: FileCode2, planilha: FileSpreadsheet, flow: GitBranch,
  dashboard: LayoutDashboard, query: Database, outro: FileQuestion,
}
const typeLabel: Record<string, string> = {
  script: 'Script', planilha: 'Planilha', flow: 'Flow',
  dashboard: 'Dashboard', query: 'Query', outro: 'Outro',
}
const TYPES = ['todos', 'script', 'planilha', 'flow', 'dashboard', 'query', 'outro']

export function CatalogClient({ artifacts }: { artifacts: any[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const filtered = useMemo(() => {
    return artifacts.filter(a => {
      const matchType = typeFilter === 'todos' || a.type === typeFilter
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.equipe ?? '').toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [artifacts, search, typeFilter])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Catálogo de aprovados</h1>
        <p className="text-muted-foreground mt-1">Artefatos homologados e prontos para referência</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou equipe..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {t === 'todos' ? 'Todos' : typeLabel[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-muted-foreground">
            {artifacts.length === 0
              ? 'Nenhum artefato aprovado ainda.'
              : 'Nenhum resultado para esses filtros.'}
          </p>
          <button
            onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Assistente"]')?.click()}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <MessageCircleQuestion className="h-4 w-4" />
            Não achou o que procurava? Pergunte ao assistente
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filtered.map(a => {
              const Icon = typeIcon[a.type] ?? FileQuestion
              return (
                <Link
                  key={a.id}
                  href={`/laudos/${a.laudo.id}`}
                  className="bg-card rounded-xl border border-border shadow-sm p-4 hover:border-primary/40 hover:shadow-md transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{a.name}</p>
                    </div>
                    <ScoreBadge
                      resultado={a.laudo.resultado}
                      score={a.laudo.score}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="bg-accent px-2 py-0.5 rounded-md">{typeLabel[a.type] ?? a.type}</span>
                    {a.equipe && <span>{a.equipe}</span>}
                    <span className="ml-auto">{new Date(a.laudo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* CTA assistente */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Assistente"]')?.click()}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircleQuestion className="h-4 w-4" />
              Não achou o que procurava? Pergunte ao assistente
            </button>
          </div>
        </>
      )}
    </div>
  )
}
