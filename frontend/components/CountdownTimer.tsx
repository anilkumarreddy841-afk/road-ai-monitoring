import { useEffect, useState } from 'react'
import { getDaysRemaining, getUrgencyLevel, formatDate } from '../lib/workflow-types'

interface CountdownTimerProps {
  deadline: string | null | undefined
  label?: string
  showDays?: boolean
}

export default function CountdownTimer({ deadline, label = 'Repair Deadline', showDays = true }: CountdownTimerProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setDaysRemaining(getDaysRemaining(deadline))
    update()
    const interval = setInterval(update, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [deadline])

  const urgency = getUrgencyLevel(daysRemaining)

  const urgencyConfig: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    safe: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', ring: 'ring-emerald-400/20' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', ring: 'ring-amber-400/20' },
    critical: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30', ring: 'ring-rose-400/20' },
  }

  const config = urgencyConfig[urgency]

  if (!deadline) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-slate-400">Not set</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-5 shadow-xl ring-1 ${config.ring}`}>
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{formatDate(deadline)}</p>
      {showDays && daysRemaining !== null && (
        <>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-slate-500">Days Remaining</p>
          <p className={`mt-2 text-4xl font-bold ${config.text}`}>
            {daysRemaining < 0 ? 'EXPIRED' : daysRemaining}
          </p>
          {daysRemaining < 0 && (
            <p className="mt-2 text-sm text-rose-400">Deadline has passed. Case escalated for review.</p>
          )}
        </>
      )}
    </div>
  )
}
