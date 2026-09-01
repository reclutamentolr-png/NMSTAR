import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatrixTree from '@/components/MatrixTree'
import CopyButton from '@/components/CopyButton'
import ProfileCompleter from '@/components/ProfileCompleter'
import Leaderboard from '@/components/Leaderboard'
import Link from 'next/link'
import { logout } from '@/app/actions/logout'

// ✅ AGGIUNGI QUESTE RIGHE PER DISABILITARE LA CACHE
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. Verifica autenticazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Recupera dati profilo
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 3. Recupera i discendenti (downline)
  const { data: downlineData, error: downlineError } = await supabase
    .rpc('get_user_downline', { 
      p_user_id: user.id, 
      p_max_depth: 3 
    })

  // 4. Recupera il nodo matrice dell'utente corrente
  const { data: userNode } = await supabase
    .from('matrix_nodes')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // 5. Costruisci il rootNode (usando i dati del profilo + nodo matrice se esiste)
  const rootNode = userNode ? {
    ...userNode,
    username: profile?.username,
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    referral_code: profile?.referral_code,
    country_code: profile?.country_code
  } : {
    // Costruisci il rootNode direttamente dal profilo (fallback)
    id: `root-${user.id}`,
    user_id: user.id,
    parent_id: null,
    path: 'root',
    level: 1,
    position: 1,
    depth: 0,
    created_at: new Date().toISOString(),
    username: profile?.username,
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    referral_code: profile?.referral_code,
    country_code: profile?.country_code
  }

  // 6. Statistiche rapide
  const totalDownline = downlineData?.length || 0
  const level1Count = downlineData?.filter((d: any) => d.depth === 1).length || 0

  // 🔍 LOG DI DEBUG - AGGIUNTI QUI
  console.log(' DEBUG DOWNLINE:')
  console.log('UserID corrente:', user.id)
  console.log('Dati downline grezzi:', JSON.stringify(downlineData, null, 2))
  console.log('Errore downline:', downlineError)
  console.log('Numero affiliati diretti (depth=1):', level1Count)
  console.log('Total downline:', totalDownline)
  console.log('rootNode:', JSON.stringify(rootNode, null, 2))
  console.log('downlineData.length:', downlineData?.length || 0)

  // URL di condivisione
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/ref/${profile?.referral_code}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Network Marketing Program</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Ciao, {profile?.first_name}</span>
            
            {/* ✅ MODIFICATO: Pulsante di Logout reale */}
            <form action={logout} className="inline">
              <button 
                type="submit" 
                className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
                </svg>
                Esci
              </button>
            </form>
            
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* SEZIONE 0: Completa Profilo */}
        {profile?.date_of_birth === '2000-01-01' && (
          <ProfileCompleter initialData={profile} />
        )}

        {/* SEZIONE 1: CODICE REFERRAL E CONDIVISIONE */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">🚀 Il tuo Strumento di Crescita</h2>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <p className="text-indigo-100 text-sm mb-1">Il tuo Codice Referral Unico</p>
              <p className="text-4xl font-mono font-bold tracking-wider">{profile?.referral_code}</p>
            </div>
            <div className="flex-1 w-full md:w-auto">
              <p className="text-indigo-100 text-sm mb-1">Link di Condivisione</p>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={shareUrl} 
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-200 focus:outline-none"
                />
                <CopyButton text={shareUrl} />
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 2: STATISTICHE RAPIDE + MARKETPLACE (4 CARD) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARD 1: Affiliati Diretti */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Affiliati Diretti (Livello 1)</p>
            <p className="text-3xl font-bold text-gray-900">{level1Count} <span className="text-lg text-gray-400 font-normal">/ 5</span></p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${(level1Count / 5) * 100}%` }}></div>
            </div>
          </div>

          {/* CARD 2: Downline Totale */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Downline Totale (visibile)</p>
            <p className="text-3xl font-bold text-gray-900">{totalDownline}</p>
            <p className="text-xs text-gray-400 mt-1">Ultimi 3 livelli</p>
          </div>

          {/* CARD 3: Stato Abbonamento */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
  <p className="text-sm text-gray-500 mb-1">Stato Abbonamento</p>
  <p className={`text-3xl font-bold capitalize mb-2 ${
    profile?.subscription_status === 'active' ? 'text-green-600' : 'text-orange-500'
  }`}>
    {profile?.subscription_status || 'free'}
  </p>
  <p className="text-xs text-gray-400 mt-1">Piano attuale</p>
  
  {/* Mostra pulsante solo se è FREE */}
  {profile?.subscription_status !== 'active' && (
    <Link 
      href="/billing"
      className="mt-3 inline-flex items-center justify-center w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Abbonati Ora - 1€/mese
    </Link>
  )}
            </div>

          {/* CARD 4: MARKETPLACE */}
          <Link 
            href="/marketplace" 
            className="group bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-indigo-500 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">🛠️</span>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                  GRATIS
                </span>
              </div>
              <p className="text-white font-bold text-lg mb-1">Marketplace</p>
              <p className="text-indigo-100 text-sm mb-3">Strumenti digitali per far crescere la tua rete</p>
              <div className="flex items-center text-white font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Scopri i servizi
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

        </div>

        {/* SEZIONE 3: VISUALIZZAZIONE MATRICE 5xN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900"> La tua Matrice 5xN</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Profondità visualizzata: 3 livelli
            </span>
          </div>
          

          {downlineError ? (
            <p className="text-red-500 text-center py-8">Errore nel caricamento della matrice: {downlineError.message}</p>
          ) : (
            <MatrixTree 
              rootNode={rootNode} 
              descendants={downlineData || []} 
            />
          )}
        </div>

        {/* SEZIONE 4: LEADERBOARD & GAMIFICATION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Leaderboard currentUserId={user.id} />
          
          {/* Card Prossimi Premi */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4"> Prossimi Obiettivi</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl"></span>
                  <span className="text-xs font-semibold text-green-800 bg-green-200 px-2 py-1 rounded">
                    Facile
                  </span>
                </div>
                <p className="font-semibold text-gray-900 mb-1">Rising Star</p>
                <p className="text-sm text-gray-600 mb-2">
                  Raggiungi 6 affiliati diretti per sbloccare il badge Rising Star
                </p>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((level1Count / 6) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {level1Count}/6 affiliati
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-75">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">💎</span>
                  <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded">
                    Medio
                  </span>
                </div>
                <p className="font-semibold text-gray-900 mb-1">Diamond</p>
                <p className="text-sm text-gray-600 mb-2">
                  Raggiungi 21 affiliati diretti per il badge Diamond
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gray-400 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {level1Count}/21 affiliati
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}