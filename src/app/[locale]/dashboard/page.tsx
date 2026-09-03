import MatrixViewer from '@/components/MatrixViewer'
import MatrixTree from '@/components/MatrixTree'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CopyButton from '@/components/CopyButton'
import ProfileCompleter from '@/components/ProfileCompleter'
import Leaderboard from '@/components/Leaderboard'
import Link from '@/components/LocalizedLink'
import { isAdmin } from '@/lib/admin-auth'
import DashboardHeaderActions from '@/components/DashboardHeaderActions'
import ActivityTracker from '@/components/ActivityTracker'
import ChatModalWrapper from '@/components/ChatModalWrapper'
import ContactListingButton from '@/components/ContactListingButton'
import { getActiveListings, getUnreadMessagesCount } from '@/lib/listings-server'
import UnreadMessagesBadge from '@/components/UnreadMessagesBadge'
import ImpersonationBanner from '@/components/ImpersonationBanner'
import { 
  Rocket, 
  Wrench, 
  TreePine, 
  Trophy, 
  Star, 
  Gem, 
  Zap, 
  Share2,
  Users,
  ArrowRight,
  Tag,
  Plus
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient()
  
  // 1. Verifica autenticazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Verifica se l'utente è amministratore
  const userIsAdmin = await isAdmin()

  // 3. Recupera dati profilo
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 4. Recupera il nodo matrice dell'utente corrente
  const { data: userNode } = await supabase
    .from('matrix_nodes')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // 5. Recupera tutti i nodi della matrice
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

  // 6. Filtra i discendenti
  const downlineData = allMatrixNodes
    ?.filter((node: any) => {
      if (node.id === userNode?.id) return false
      const rootPath = userNode?.path
      if (!rootPath) return false
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

  // 7. Costruisci il rootNode
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

  // 8. Statistiche rapide
  const totalDownline = downlineData?.length || 0
  const userNodeId = userNode?.id
  const level1Count = downlineData?.filter((d: any) => d.parent_id === userNodeId).length || 0
  
  // 9. RECUPERA LO SPONSOR
  const { data: sponsorData } = await supabase
    .from('profiles')
    .select('first_name, last_name, referral_code')
    .eq('id', profile?.sponsor_id)
    .single()
  
  // 10. URL di condivisione
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/ref/${profile?.referral_code}`

  // 11. CARICA GLI ANNUNCI PER L'ANTEPRIMA
  const recentListings = await getActiveListings({ limit: 3 })
  
  // 12. CARICA CONTATORE MESSAGGI NON LETTI
  const unreadMessagesCount = await getUnreadMessagesCount(user.id)

  return (
  <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
    {/* ✅ BANNER IMPERSONIFICAZIONE */}
    <ImpersonationBanner />
          
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 hidden sm:block">Network Marketing Program</h1>
          <h1 className="text-xl font-bold text-gray-900 sm:hidden">NMP</h1>
          
          <DashboardHeaderActions 
            user={user} 
            profile={profile} 
            isAdmin={userIsAdmin} 
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ActivityTracker userId={user.id} />
        
        {/* Completa Profilo */}
        {profile?.date_of_birth === '2000-01-01' && (
          <ProfileCompleter initialData={profile} />
        )}

        {/* SEZIONE 1: HEADER VIOLA CON CODICE REFERRAL E SPONSOR */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Rocket className="w-6 h-6 text-yellow-300" />
                  Il tuo Strumento di Crescita
                </h2>
                <p className="text-indigo-100 text-sm mb-2">Il tuo Codice Referral Unico</p>
                <p className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-white drop-shadow-lg">
                  {profile?.referral_code}
                </p>
              </div>
              
              <div className="flex-1 w-full lg:w-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
                  <p className="text-indigo-100 text-xs mb-2">Il tuo Sponsor</p>
                  {sponsorData ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {sponsorData.first_name?.[0]}{sponsorData.last_name?.[0] || ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">
                          {sponsorData.first_name} {sponsorData.last_name}
                        </p>
                        {sponsorData.referral_code && (
                          <p className="text-xs text-indigo-200 font-mono">
                            {sponsorData.referral_code}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-indigo-200">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white text-lg">-</span>
                      </div>
                      <p className="text-sm">Nessuno sponsor</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-indigo-100 text-xs mb-2">Link di Condivisione</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={shareUrl} 
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <CopyButton text={shareUrl} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 2: GRIGLIA 4 CARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CARD 1: Affiliati Diretti + Downline */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Affiliati Diretti (Livello 1)</p>
                <p className="text-3xl font-bold text-gray-900">{level1Count} <span className="text-lg text-gray-400 font-normal">/ 5</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((level1Count / 5) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 mb-1">Downline Totale</p>
                <p className="text-2xl font-bold text-gray-900">{totalDownline}</p>
                <p className="text-xs text-gray-400 mt-1">Ultimi 5 livelli</p>
              </div>
            </div>
          </div>

          {/* CARD 2: I tuoi punti */}
          <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 p-6 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                I tuoi punti
              </h3>
              <span className="text-3xl font-bold text-yellow-600">{profile?.daily_points || 0}</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>Progresso verso il prossimo annuncio</span>
                <span className="font-semibold">{profile?.daily_points || 0}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((profile?.daily_points || 0) / 10 * 100, 100)}%` }}></div>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              {10 - (profile?.daily_points || 0) > 0 
                ? `🎯 Ti mancano ancora ${10 - (profile?.daily_points || 0)} accessi giornalieri!`
                : '✅ Hai abbastanza punti per pubblicare un annuncio!'}
            </p>
            
            <UnreadMessagesBadge initialCount={unreadMessagesCount || 0} />
            
            <Link href="/marketplace/listings" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-700 hover:text-yellow-800 transition-colors">
              Gestisci Annunci e Messaggi
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 3: Stato Abbonamento */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500 mb-2">Stato Abbonamento</p>
            <p className={`text-3xl font-bold capitalize mb-2 ${profile?.subscription_status === 'active' ? 'text-green-600' : 'text-orange-500'}`}>
              {profile?.subscription_status === 'active' ? 'Active' : 'Free'}
            </p>
            <p className="text-xs text-gray-400 mb-3">Piano attuale</p>
            {profile?.subscription_status !== 'active' ? (
              <Link href="/billing" className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg">
                <Zap className="w-4 h-4 mr-2" />
                Abbonati Ora - 1€/mese
              </Link>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <Star className="w-4 h-4" />
                Piano attivo
              </div>
            )}
          </div>

          {/* CARD 4: MARKETPLACE */}
          <Link href="/marketplace" className="group bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-indigo-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <Wrench className="w-10 h-10 text-white" />
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/30">GRATIS</span>
              </div>
              <p className="text-white font-bold text-lg mb-1">Marketplace</p>
              <p className="text-indigo-100 text-sm mb-3">Strumenti digitali per far crescere la tua rete</p>
              <div className="flex items-center text-white font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Scopri i servizi
                <Share2 className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* SEZIONE: ANTEPRIMA BACHECA ANNUNCI */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-6 h-6 text-yellow-600" />
              Annunci della Community
            </h2>
            <div className="flex gap-3">
              <Link href="/marketplace/listings?showForm=true" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Pubblica Annuncio
              </Link>
              <Link href="/marketplace/listings" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Vedi tutti
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          {recentListings.length === 0 ? (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-dashed border-yellow-300 rounded-xl p-8 text-center">
              <Tag className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun annuncio ancora</h3>
              <p className="text-gray-600 text-sm mb-4">Sii il primo a pubblicare un annuncio nella community! Accumula <strong>10 punti</strong> (10 accessi giornalieri) per iniziare.</p>
              <Link href="/marketplace/listings?showForm=true" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" />
                Pubblica il Primo Annuncio
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentListings.map((listing: any) => (
                <div key={listing.id} className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                      {listing.category === 'servizi' ? '💼' : listing.category === 'prodotti' ? '🛍️' : listing.category === 'collaborazioni' ? '🤝' : '🎉'} 
                      {' '}{listing.category}
                    </span>
                    {listing.price && <span className="text-sm font-bold text-green-600">€{listing.price}</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{listing.title}</h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2 flex-1">{listing.description}</p>
                  <p className="text-xs text-gray-500 mb-3">di {listing.profiles?.first_name} {listing.profiles?.last_name}</p>
                  
                  {listing.user_id === user.id ? (
                    <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      Il tuo annuncio
                    </div>
                  ) : (
                    <ContactListingButton 
                      listingId={listing.id}
                      listingTitle={listing.title}
                      listingCategory={listing.category}
                      listingPrice={listing.price}
                      listingDescription={listing.description}
                      receiverId={listing.user_id}
                      authorName={`${listing.profiles?.first_name} ${listing.profiles?.last_name}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEZIONE 3: MATRICE 5xN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TreePine className="w-6 h-6 text-indigo-600" />
              La tua Matrice 5xN
            </h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium border border-indigo-100">
              Profondità: 5 livelli (clicca per espandere)
            </span>
          </div>
          {downlineError ? (
            <p className="text-red-500 text-center py-8">Errore nel caricamento della matrice: {downlineError.message}</p>
          ) : (
            <MatrixViewer>
              <MatrixTree rootNode={rootNode} descendants={downlineData || []} />
            </MatrixViewer>
          )}
        </div>

        {/* SEZIONE 4: LEADERBOARD & PROSSIMI OBIETTIVI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Leaderboard currentUserId={user.id} />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Prossimi Obiettivi
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-yellow-500" />
                  <span className="text-xs font-semibold text-green-800 bg-green-200 px-2.5 py-1 rounded-full">Facile</span>
                </div>
                <p className="font-bold text-gray-900 mb-1">Rising Star</p>
                <p className="text-sm text-gray-600 mb-2">Raggiungi 6 affiliati diretti per sbloccare il badge Rising Star</p>
                <div className="w-full bg-green-200 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((level1Count / 6) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">{level1Count}/6 affiliati</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Gem className="w-8 h-8 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-800 bg-blue-200 px-2.5 py-1 rounded-full">Medio</span>
                </div>
                <p className="font-bold text-gray-900 mb-1">Diamond</p>
                <p className="text-sm text-gray-600 mb-2">Raggiungi 21 affiliati diretti per il badge Diamond</p>
                <div className="w-full bg-blue-200 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((level1Count / 21) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">{level1Count}/21 affiliati</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* ✅ CHAT MODAL WRAPPER */}
      <ChatModalWrapper userId={user.id} />
    </div>
  )
}