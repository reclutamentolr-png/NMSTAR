'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export default function SpendlyModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--paper)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[var(--gold)]/20">
          <h3 className="text-xl font-bold text-[var(--ink)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors" type="button" aria-label="Chiudi">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
