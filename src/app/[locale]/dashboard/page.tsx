
import MatrixViewer from '@/components/MatrixViewer'
import MatrixTree from '@/components/MatrixTree'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation' // ✅ CORRETTO per i Server Component
import CopyButton from '@/components/CopyButton'
import ProfileCompleter from '@/components/ProfileCompleter'
import Leaderboard from '@/components/Leaderboard'
import Link from '@/components/LocalizedLink' // ✅ Sostituisci 'next/link'
import { isAdmin } from '@/lib/admin-auth'
import DashboardHeaderActions from '@/components/DashboardHeaderActions' // ✅ NUOVO IMPORT
import ActivityTracker from '@/components/ActivityTracker'
import { 
  Rocket, 
  Wrench, 
  TreePine, 
  Trophy, 
  Star, 
  Gem, 
  Zap, 
  Share2
} from 'lucide-react'

// ✅ DISABILITA LA CACHE PER AVERE SEMPRE DATI FRESCHI
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  // ✅ Ottieni la lingua direttamente dai parametri dell'URL (es. 'it', 'en')
  const { locale } = await params;
  const supabase = await createClient()
  
  // 1. Verifica autenticazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // ✅ Verifica se l'utente è amministratore
  const userIsAdmin = await isAdmin()

  // 2. Recupera dati profilo
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

    // 3. Recupera prima il nodo matrice dell'utente corrente (serve per il filtro)
  const { data: userNode } = await supabase
    .from('matrix_nodes')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // 4. Recupera tutti i nodi della matrice con i dati del profilo
  const { data: allMatrixNodes, error: matrixError } = await supabase
    .from('matrix_nodes')
    .select(`
      id,
      user_id,
      parent_id,
      path,
      level,
      position,
      depth,
      created_at,
      profiles:user_id (
        first_name,
        last_name,
        referral_code,
        country_code,
        username
      )
    `)
    .order('level', { ascending: true })

  // 5. Filtra i discendenti dell'utente corrente usando il path
  const downlineData = allMatrixNodes
    ?.filter((node: any) => {
      // Escludi il nodo root stesso
      if (node.id === userNode?.id) return false
      
      // Verifica se il path del nodo contiene il path del root
      const rootPath = userNode?.path
      if (!rootPath) return false
      
      // Includi solo i nodi il cui path inizia con il path del root + "."
      return node.path.startsWith(rootPath + '.')
    })
    .map((node: any) => ({
      id: node.id,
      user_id: node.user_id,
      parent_id: node.parent_id,
      path: node.path,
      level: node.level,
      position: node.position,
      depth: node.depth,
      created_at: node.created_at,
      first_name: node.profiles?.first_name,
      last_name: node.profiles?.last_name,
      referral_code: node.profiles?.referral_code,
      country_code: node.profiles?.country_code,
      username: node.profiles?.username
    }))

  const downlineError = matrixError

  // 5. Costruisci il rootNode in modo ROBUSTO
  const correctRootId = userNode?.id || (downlineData && downlineData.length > 0 ? downlineData[0].parent_id : `root-${user.id}`)

  const rootNode = {
    id: correctRootId,
    user_id: user.id,
    parent_id: userNode?.parent_id || null,
    path: userNode?.path || 'root',
    level: userNode?.level || 1,
    position: userNode?.position || 1,
    depth: userNode?.depth || 0,
    created_at: userNode?.created_at || new Date().toISOString(),
    username: profile?.username,
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    referral_code: profile?.referral_code,
    country_code: profile?.country_code
  }

    // 6. Statistiche rapide
  const totalDownline = downlineData?.length || 0

  // ✅ FIX: Conta i figli diretti usando parent_id invece di level/depth
  const userNodeId = userNode?.id
  const level1Count = downlineData?.filter((d: any) => d.parent_id === userNodeId).length || 0
  
  // ✅ RECUPERA LO SPONSOR
  const { data: sponsorData } = await supabase
    .from('profiles')
    .select('first_name, last_name, referral_code')
    .eq('id', profile?.sponsor_id)
    .single()
  
  
// URL di condivisione con la lingua corretta (es. /it/ref/CODICE)
const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/ref/${profile?.referral_code}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 hidden sm:block">Network Marketing Program</h1>
          <h1 className="text-xl font-bold text-gray-900 sm:hidden">NMP</h1>
          
          {/* ✅ NUOVO COMPONENTE HEADER CON ICONA PROFILO, ADMIN E LOGOUT */}
          <DashboardHeaderActions 
            user={user} 
            profile={profile} 
            isAdmin={userIsAdmin} 
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <ActivityTracker userId={user.id} />
        {/* SEZIONE 0: Completa Profilo */}
        {profile?.date_of_birth === '2000-01-01' && (
          <ProfileCompleter initialData={profile} />
        )}

        {/* SEZIONE 1: CODICE REFERRAL E CONDIVISIONE */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Rocket className="w-6 h-6" />
            Il tuo Strumento di Crescita
          </h2>
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
          
          {/* CARD 1 UNIFICATA: Affiliati Diretti + Sponsor */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="space-y-4">
              {/* Sezione Affiliati Diretti */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Affiliati Diretti (Livello 1)</p>
                <p className="text-3xl font-bold text-gray-900">{level1Count} <span className="text-lg text-gray-400 font-normal">/ 5</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${(level1Count / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Divisore */}
              <div className="border-t border-gray-200 pt-4">
                {/* Sezione Sponsor */}
                <p className="text-sm text-gray-500 mb-2">Il tuo Sponsor</p>
                {sponsorData ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {sponsorData.first_name?.[0]}{sponsorData.last_name?.[0] || ''}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {sponsorData.first_name} {sponsorData.last_name}
                      </p>
                      {sponsorData.referral_code && (
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {sponsorData.referral_code}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">-</span>
                    </div>
                    <p className="text-sm">Nessuno</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 2: Downline Totale (mantenuta ma spostata) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Downline Totale (visibile)</p>
            <p className="text-3xl font-bold text-gray-900">{totalDownline}</p>
            <p className="text-xs text-gray-400 mt-1">Ultimi 5 livelli</p>
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
            
            {profile?.subscription_status !== 'active' && (
              <Link 
                href="/billing"
                className="mt-3 inline-flex items-center justify-center w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Zap className="w-4 h-4 mr-2" />
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
                <Wrench className="w-10 h-10 text-white" />
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                  GRATIS
                </span>
              </div>
              <p className="text-white font-bold text-lg mb-1">Marketplace</p>
              <p className="text-indigo-100 text-sm mb-3">Strumenti digitali per far crescere la tua rete</p>
              <div className="flex items-center text-white font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Scopri i servizi
                <Share2 className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>

        </div>

        {/* SEZIONE 3: VISUALIZZAZIONE MATRICE 5xN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TreePine className="w-6 h-6" />
              La tua Matrice 5xN
            </h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              Profondità visualizzata: 5 livelli (clicca per espandere)
            </span>
          </div>
          
          {downlineError ? (
  <p className="text-red-500 text-center py-8">Errore nel caricamento della matrice: {downlineError.message}</p>
) : (
  <MatrixViewer>
    <MatrixTree 
      rootNode={rootNode} 
      descendants={downlineData || []} 
    />
  </MatrixViewer>
)}
        </div>

        {/* SEZIONE 4: LEADERBOARD & GAMIFICATION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Leaderboard currentUserId={user.id} />
          
          {/* Card Prossimi Premi */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Prossimi Obiettivi
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-yellow-500" />
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
                  <Gem className="w-8 h-8 text-blue-500" />
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