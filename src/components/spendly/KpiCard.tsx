import type { LucideIcon } from 'lucide-react'

export default function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'default' | 'negative' | 'positive'
  hint?: string
}) {
  const valueColor =
    tone === 'negative' ? 'text-red-600' : tone === 'positive' ? 'text-[var(--gold)]' : 'text-[var(--ink)]'

  return (
    <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--paper)] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink)]">
          <Icon className="h-4 w-4 text-[var(--gold-bright)]" strokeWidth={1.8} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-1">{hint}</div>}
    </div>
  )
}
