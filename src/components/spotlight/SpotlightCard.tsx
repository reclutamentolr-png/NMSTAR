import { Star } from 'lucide-react'

export default function SpotlightCard({
  displayName,
  city,
  country,
  profession,
  story,
  favoriteTools,
  badgeLabel,
  compact = false,
}: {
  displayName: string
  city: string | null
  country: string | null
  profession: string | null
  story: string
  favoriteTools?: string[]
  badgeLabel?: string
  compact?: boolean
}) {
  const location = [city, country].filter(Boolean).join(', ')

  return (
    <div className={`rounded-2xl border border-[var(--gold)]/25 bg-[var(--paper)] shadow-sm ${compact ? 'p-4' : 'p-6 sm:p-8'}`}>
      {badgeLabel && (
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-3 py-1 text-xs font-bold text-[var(--ink)]">
          <Star className="h-3.5 w-3.5" fill="currentColor" /> {badgeLabel}
        </span>
      )}
      <h3 className={`font-bold text-[var(--ink)] ${compact ? 'text-base' : 'text-2xl'}`}>{displayName}</h3>
      <p className="mt-0.5 text-sm text-[var(--muted)]">{[profession, location].filter(Boolean).join(' · ')}</p>
      <p className={`mt-3 leading-6 text-[var(--ink)] ${compact ? 'text-sm line-clamp-3' : 'text-base'}`}>{story}</p>
      {!compact && favoriteTools && favoriteTools.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {favoriteTools.map((tool) => (
            <span key={tool} className="rounded-full border border-[var(--gold)]/30 bg-[var(--background)] px-2.5 py-1 text-xs font-medium text-[var(--ink)]">
              {tool}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
