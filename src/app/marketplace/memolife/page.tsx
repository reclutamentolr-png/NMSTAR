import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MemoLifeDashboard from '@/components/MemoLifeDashboard'
import { 
  Brain, 
  ArrowLeft, 
  Sparkles,
  Calendar,
  CheckSquare,
  Receipt,
  Users
} from 'lucide-react'

export default async function MemoLifePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link 
            href="/marketplace" 
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna al Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">MemoLife</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-medium mb-3">
                <Sparkles className="w-3 h-3" />
                Il tuo assistente personale
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Organizza la tua vita quotidiana
              </h2>
              <p className="text-white/90 text-sm max-w-2xl">
                Gestisci appuntamenti, bollette, task e note in un unico posto. Semplice, veloce, sempre sotto controllo.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Appuntamenti</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <CheckSquare className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Task</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <Receipt className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Bollette</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">Contatti</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <MemoLifeDashboard 
          userId={user.id}
          userName={`${profile.first_name} ${profile.last_name}`}
        />
      </main>
    </div>
  )
}