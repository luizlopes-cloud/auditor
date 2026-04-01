'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowRight, CheckCircle2, FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

type ArtifactType = 'script' | 'planilha' | 'flow' | 'dashboard' | 'query' | 'outro'

interface CatalogItem {
  id: string
  score: number
  resumo: string
  created_at: string
  artifacts: {
    id: string
    name: string
    type: ArtifactType
    description: string | null
    submitted_by: string
    github_url: string | null
    source_url: string | null
  }
}

const TYPE_CONFIG: Record<ArtifactType, {
  label: string
  icon: React.ElementType
  gradient: string
  badge: string
  badgeText: string
}> = {
  script: {
    label: 'Script',
    icon: FileCode2,
    gradient: 'from-blue-500 to-blue-700',
    badge: 'bg-blue-600/90 text-white',
    badgeText: 'Script',
  },
  planilha: {
    label: 'Planilha',
    icon: FileSpreadsheet,
    gradient: 'from-emerald-500 to-emerald-700',
    badge: 'bg-emerald-600/90 text-white',
    badgeText: 'Planilha',
  },
  flow: {
    label: 'Flow',
    icon: GitBranch,
    gradient: 'from-purple-500 to-purple-700',
    badge: 'bg-purple-600/90 text-white',
    badgeText: 'Flow',
  },
  dashboard: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    gradient: 'from-amber-400 to-amber-600',
    badge: 'bg-amber-500/90 text-white',
    badgeText: 'Dashboard',
  },
  query: {
    label: 'Query',
    icon: Database,
    gradient: 'from-orange-500 to-orange-700',
    badge: 'bg-orange-600/90 text-white',
    badgeText: 'Query SQL',
  },
  outro: {
    label: 'Outro',
    icon: FileQuestion,
    gradient: 'from-slate-400 to-slate-600',
    badge: 'bg-slate-600/90 text-white',
    badgeText: 'Outro',
  },
}

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'script', label: 'Scripts' },
  { value: 'planilha', label: 'Planilhas' },
  { value: 'flow', label: 'Flows' },
  { value: 'dashboard', label: 'Dashboards' },
  { value: 'query', label: 'Queries' },
]

function ArtifactCard({ item }: { item: CatalogItem }) {
  const art = item.artifacts
  const cfg = TYPE_CONFIG[art.type] ?? TYPE_CONFIG.outro
  const Icon = cfg.icon

  return (
    <Link href={`/laudos/${item.id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 hover:border-slate-200">
        {/* Card header — colored area (como as fotos da Renata) */}
        <div className={cn('relative h-36 bg-gradient-to-br flex items-center justify-center', cfg.gradient)}>
          {/* Badge — top-left, igual posição da Renata */}
          <span className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-sm', cfg.badge)}>
            {cfg.badgeText}
          </span>
          {/* Aprovado badge — top-right */}
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </span>
          <Icon className="h-12 w-12 text-white/30" />
        </div>

        {/* Card body */}
        <div className="p-5">
          <h3 className="font-semibold text-foreground text-sm leading-snug truncate group-hover:text-primary transition-colors">
            {art.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            {art.submitted_by}
          </p>
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {art.description ?? item.resumo}
          </p>
        </div>

        {/* Card footer — "Conhecer" igual à Renata */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
              Ver detalhes
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/laudos?resultado=aprovado&limit=100')
      .then(r => r.json())
      .then(d => setItems(d.laudos ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(item => {
    const art = item.artifacts
    if (filter && art.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        art.name.toLowerCase().includes(q) ||
        art.description?.toLowerCase().includes(q) ||
        art.submitted_by.toLowerCase().includes(q) ||
        item.resumo.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Header — igual ao da Renata */}
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Auditor</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500">Seazone</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link
              href="/submit"
              className="text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
            >
              Submeter artefato
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — mesmo padrão da Renata */}
      <section className="px-6 py-14 text-center bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Integrações e automações<br />
            <span className="text-primary">prontas para uso</span>
          </h1>
          <p className="text-slate-500 mt-4 text-lg">
            Artefatos homologados e aprovados pela equipe de tecnologia da Seazone.
          </p>

          {/* Search bar — proeminente como na Renata */}
          <div className="relative mt-8 max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, tipo ou descrição..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm transition-all"
            />
          </div>
        </div>
      </section>

      {/* Filtros — tabs com underline azul, igual à Renata */}
      <section className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'shrink-0 px-5 py-4 text-sm font-medium transition-all border-b-2',
                filter === f.value
                  ? 'text-primary border-primary'
                  : 'text-slate-500 border-transparent hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-72" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-lg">
                {search ? `Nenhum resultado para "${search}"` : 'Nenhum artefato aprovado ainda.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-6">
                {filtered.length} artefato{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(item => (
                  <ArtifactCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
