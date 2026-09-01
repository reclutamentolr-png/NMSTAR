'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

type CopyButtonProps = {
  text: string
}

export default function CopyButton({ text }: CopyButtonProps) {
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

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-lg transition-all ${
        copied 
          ? 'bg-green-500 text-white' 
          : 'bg-white/20 hover:bg-white/30 text-white'
      }`}
      title={copied ? 'Copiato!' : 'Copia'}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}