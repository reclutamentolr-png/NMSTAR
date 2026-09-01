'use client'

import { Share2 } from 'lucide-react'

type ShareButtonProps = {
  url: string
}

export default function ShareButton({ url }: ShareButtonProps) {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copiato negli appunti!')
    } catch (err) {
      console.error('Errore copia:', err)
      alert('Impossibile copiare il link')
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium transition-all"
    >
      <Share2 className="w-4 h-4" />
      Condividi profilo
    </button>
  )
}