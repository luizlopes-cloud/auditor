'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, ArrowRight, CheckCircle2, Clock, FileCode2, FileSpreadsheet, GitBranch, LayoutDashboard, Database, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FloatingAssistant } from '@/components/FloatingAssistant'

type ArtifactType = 'script' | 'planilha' | 'flow' | 'dashboard' | 'query' | 'outro'

interface CatalogItem {
  id: string
  score: number
  resultado: string
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
    gradient: 'from-blue-600 to-blue-900',
    badge: 'bg-blue-500/80 text-white',
    badgeText: 'Script',
  },
  planilha: {
    label: 'Planilha',
    icon: FileSpreadsheet,
    gradient: 'from-emerald-600 to-emerald-900',
    badge: 'bg-emerald-500/80 text-white',
    badgeText: 'Planilha',
  },
  flow: {
    label: 'Flow',
    icon: GitBranch,
    gradient: 'from-purple-600 to-purple-900',
    badge: 'bg-purple-500/80 text-white',
    badgeText: 'Flow',
  },
  dashboard: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    gradient: 'from-amber-500 to-amber-800',
    badge: 'bg-amber-500/80 text-white',
    badgeText: 'Dashboard',
  },
  query: {
    label: 'Query',
    icon: Database,
    gradient: 'from-orange-600 to-orange-900',
    badge: 'bg-orange-500/80 text-white',
    badgeText: 'Query SQL',
  },
  outro: {
    label: 'Outro',
    icon: Globe,
    gradient: 'from-slate-500 to-slate-800',
    badge: 'bg-slate-500/80 text-white',
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
    <Link href={`/catalog/${item.id}`} className="group block">
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 border border-border hover:border-primary/30">
        <div className={cn('relative h-36 bg-gradient-to-br flex items-center justify-center', cfg.gradient)}>
          <span className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-sm', cfg.badge)}>
            {cfg.badgeText}
          </span>
          {item.resultado === 'aprovado' ? (
            <span className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-500/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">
              <CheckCircle2 className="h-3 w-3" />
              Aprovado
            </span>
          ) : (
            <span className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">
              <Clock className="h-3 w-3" />
              Em revisão
            </span>
          )}
          <Icon className="h-12 w-12 text-white/20" />
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-foreground text-sm leading-snug truncate group-hover:text-primary transition-colors">
            {art.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            {art.submitted_by}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {art.description ?? item.resumo}
          </p>
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground/60">
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
    fetch('/api/laudos?limit=100')
      .then(r => r.json())
      .then(d => setItems(d.laudos ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(item => {
    if (item.resultado === 'reprovado') return false
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/seazone-logo.svg" alt="Seazone" width={90} height={15} className="brightness-0 invert opacity-90" />
            <span className="text-border">|</span>
            <span className="text-sm font-semibold text-primary">Auditor</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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

      <section className="px-6 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Integrações e automações<br />
            <span className="text-primary">prontas para uso</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Artefatos homologados e aprovados pela equipe de tecnologia da Seazone.
          </p>

          <div className="relative mt-8 max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, tipo ou descrição..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 shadow-sm transition-all"
            />
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'shrink-0 px-5 py-4 text-sm font-medium transition-all border-b-2',
                filter === f.value
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-card animate-pulse h-72 border border-border" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                {search ? `Nenhum resultado para "${search}"` : 'Nenhum artefato aprovado ainda.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground/60 mb-6">
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
      <FloatingAssistant initialMessage="Posso te ajudar a encontrar artefatos aprovados no catálogo." />
    </div>
  )
}
