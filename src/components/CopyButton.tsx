'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

type CopyButtonProps = {
  text: string
  // 'dark' (default) is for use on the ink-colored hero card; 'light' for
  // use on a plain paper/white card, where the dark variant's white-on-white
  // styling would be nearly invisible.
  variant?: 'dark' | 'light'
}

export default function CopyButton({ text, variant = 'dark' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Errore copia:', err)
    }
  }

  const idleClass =
    variant === 'light'
      ? 'bg-[var(--gold-pale)] hover:bg-[var(--gold)]/25 text-[var(--ink)]'
      : 'bg-white/20 hover:bg-white/30 text-white'

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-lg transition-all shrink-0 ${copied ? 'bg-green-500 text-white' : idleClass}`}
      title={copied ? 'Copiato!' : 'Copia'}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}