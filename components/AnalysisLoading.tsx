'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Recebendo artefato...', duration: 800 },
  { label: 'Analisando segurança, lógica e robustez...', duration: 99999 },
  { label: 'Gerando laudo...', duration: 99999 },
]

interface AnalysisLoadingProps {
  step?: number
}

export function AnalysisLoading({ step = 0 }: AnalysisLoadingProps) {
  const [autoStep, setAutoStep] = useState(0)
  const currentStep = step > 0 ? step : autoStep

  useEffect(() => {
    if (autoStep >= STEPS.length - 1) return
    const t = setTimeout(() => setAutoStep(s => s + 1), STEPS[autoStep].duration)
    return () => clearTimeout(t)
  }, [autoStep])

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-border/40" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>

      <div className="space-y-2 w-full max-w-xs">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 text-sm transition-all duration-300',
              i < currentStep && 'text-emerald-400',
              i === currentStep && 'text-foreground font-medium',
              i > currentStep && 'text-muted-foreground/50',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
              background: i < currentStep ? '#34d399' : i === currentStep ? 'var(--color-primary)' : 'var(--color-border)'
            }} />
            {s.label}
          </div>
        ))}
      </div>

      <div className="h-1.5 w-full max-w-xs rounded-full bg-border/40 overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[progress_2s_ease-in-out_infinite]" />
      </div>
    </div>
  )
}
