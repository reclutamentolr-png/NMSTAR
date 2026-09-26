'use client'

import { Printer } from 'lucide-react'

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  )
}
