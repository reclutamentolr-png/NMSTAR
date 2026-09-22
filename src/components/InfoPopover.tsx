'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'

// Small clickable caption that reveals a short explanation on click —
// e.g. "How do points work?" next to a stat. Generic/reusable rather than
// one-off, since this pattern (a stat with a one-line rationale behind it)
// shows up in more than one place on the dashboard.
export default function InfoPopover({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--gold)] underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--ink)]"
      >
        <Info className="h-3 w-3" />
        {label}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-lg border border-[var(--gold)]/30 bg-white p-3 text-xs leading-5 text-[var(--muted)] shadow-lg">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi"
            className="absolute right-2 top-2 text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="pr-4">{children}</div>
        </div>
      )}
    </div>
  )
}
