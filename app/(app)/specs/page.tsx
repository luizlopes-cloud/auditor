'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react'

interface SpecItem {
  laudo_id: string
  artifact_name: string
  artifact_type: string
  resultado: string
  score: number
  spec_nome: string
  spec_descricao: string
  spec_stack: string[]
  func_count: number
  created_at: string
}

const statusConfig = {
  aprovado: { label: 'Aprovado', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-800/40' },
  ajustes_necessarios: { label: 'Ajustes necessários', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-800/40' },
  reprovado: { label: 'Reprovado', icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/30 border-red-800/40' },
}

export default function SpecsPage() {
  const [specs, setSpecs] = useState<SpecItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('todos')

  useEffect(() => {
    fetch('/api/specs')
      .then(r => r.json())
      .then(d => setSpecs(d.specs ?? []))
      .catch(() => setSpecs([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'todos' ? specs : specs.filter(s => s.resultado === filter)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Specs geradas</h1>
        <p className="text-muted-foreground mt-1 text-sm">Documentação dos artefatos homologados</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {['todos', 'aprovado', 'ajustes_necessarios', 'reprovado'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'aprovado' ? 'Aprovados' : f === 'ajustes_necessarios' ? 'Com ajustes' : 'Reprovados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <div className="h-4 w-4 rounded-full border-2 border-border/40 border-t-primary animate-spin" />
          Carregando specs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma spec gerada ainda.</p>
          <p className="text-xs mt-1">Gere specs nos laudos após rodar todas as análises.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const cfg = statusConfig[s.resultado as keyof typeof statusConfig] ?? statusConfig.ajustes_necessarios
            const Icon = cfg.icon
            return (
              <Link
                key={s.laudo_id}
                href={`/laudos/${s.laudo_id}`}
                className={`block rounded-xl border p-5 transition-all hover:shadow-md ${cfg.bg}`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{s.spec_nome}</h3>
                      <span className="text-xs text-muted-foreground/60">({s.artifact_type})</span>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cfg.color} bg-black/20`}>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        Score {s.score} · {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.spec_descricao}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                      {s.spec_stack?.length > 0 && <span>Stack: {s.spec_stack.slice(0, 4).join(', ')}</span>}
                      {s.func_count > 0 && <span>{s.func_count} funcionalidades</span>}
                      <span className="ml-auto flex items-center gap-1 text-primary font-medium">
                        Ver laudo <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
