'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Recebendo artefato...', duration: 800 },
  { label: 'Analisando segurança, lógica e robustez...', duration: 99999 },
  { label: 'Gerando laudo...', duration: 99999 },
]

interface AnalysisLoadingProps {
  step?: number // 0, 1, 2 — controlled externally
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
      {/* Spinner */}
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>

      {/* Steps */}
      <div className="space-y-2 w-full max-w-xs">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 text-sm transition-all duration-300',
              i < currentStep && 'text-emerald-600',
              i === currentStep && 'text-slate-900 font-medium',
              i > currentStep && 'text-slate-400',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
              background: i < currentStep ? '#10b981' : i === currentStep ? '#2563eb' : '#cbd5e1'
            }} />
            {s.label}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
      </div>
    </div>
  )
}
