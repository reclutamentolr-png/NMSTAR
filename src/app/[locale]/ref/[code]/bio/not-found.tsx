import Link from 'next/link' // ✅ Corretto
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center p-4">
      <div className="text-center bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-white mb-2">Profilo non trovato</h1>
        <p className="text-white/80 mb-6">
          Questa landing page non esiste o è stata rimossa.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center gap-2 bg-white text-pink-600 px-6 py-3 rounded-full font-bold hover:bg-white/90 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla home
        </Link>
      </div>
    </div>
  )
}