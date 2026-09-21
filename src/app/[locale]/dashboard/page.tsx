import MatrixTree from '@/components/MatrixTree'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
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
import InstallAppPrompt from '@/components/InstallAppPrompt'
import SpilloverExplainer from '@/components/SpilloverExplainer'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import RankAchievementModal from '@/components/RankAchievementModal'
import RenewalReminderModal from '@/components/RenewalReminderModal'
import RankBadge from '@/components/RankBadge'
import DirectAffiliatesList from '@/components/DirectAffiliatesList'
import { getCurrentRank, getNewlyAchievedRank } from '@/lib/ranks'
import { isActiveSubscription } from '@/lib/subscriptionGate'
import { fetchDirectSponsored } from '@/lib/directAffiliates'
import {
  Rocket,
  Store,
  TreePine,
  Trophy,
  Star,
  Sparkles,
  Crown,
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
  const t = await getTranslations('dashboard')
  const commonT = await getTranslations('common')
  const supabase = await createClient()
  
  // 1. Verifica autenticazione
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
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
  // matrix_nodes.depth is absolute (from the global matrix root), not
  // relative to the viewed user — anyone placed via spillover has a
  // nonzero depth themselves, so it must be subtracted to get "how many
  // levels below ME" rather than "how many levels below the company root".
  const rootDepth = userNode?.depth ?? 0
  const maxDownlineDepth = (downlineData || []).reduce(
    (max: number, node: { depth: number }) => Math.max(max, node.depth - rootDepth),
    0
  )
  const userNodeId = userNode?.id

  // 9. RECUPERA LO SPONSOR
  const { data: sponsorData } = await supabase
    .from('profiles')
    .select('first_name, last_name, referral_code')
    .eq('id', profile?.sponsor_id)
    .single()

  // 9b. QUALIFICHE — basate su quanti utenti QUESTO utente ha sponsorizzato
  // personalmente (profiles.sponsor_id) E CHE SONO ATTIVI (abbonamento
  // pagante), non sui figli diretti nella matrice (matrix_nodes.parent_id,
  // level1Count, che è bloccato a 5 dallo spillover) e non su sponsorizzati
  // non paganti: Rising Star/Diamond misurano un team di persone attive,
  // non solo registrate.
  const directSponsored = await fetchDirectSponsored(supabase, user.id)
  const directActiveSponsored = directSponsored.filter(isActiveSubscription)
  const directSponsorCount = directActiveSponsored.length
  const directSponsoredWithStatus = directSponsored.map((p) => ({ ...p, is_active: isActiveSubscription(p) }))

  // Quanti sponsorizzati diretti NON sono finiti in uno dei 5 posti diretti
  // della matrice (matrix_nodes.parent_id === userNodeId) ma sono stati
  // spostati più in profondità dallo spillover perché quei posti erano già
  // occupati — sono comunque "diretti" (sponsor_id), solo non posizionati
  // direttamente sotto di lui nell'albero.
  const downlineNodeByUserId = new Map(
    (downlineData || []).map((d: { user_id: string; parent_id: string | null }) => [d.user_id, d])
  )
  const directSponsorInSpilloverCount = directSponsored.filter((p) => {
    const node = downlineNodeByUserId.get(p.id)
    return node ? node.parent_id !== userNodeId : false
  }).length

  const currentRank = getCurrentRank(directSponsorCount)
  const newlyAchievedRank = getNewlyAchievedRank(directSponsorCount, profile?.qualifications_seen || [])

  // Promemoria di rinnovo: mostrato ogni volta che entra in dashboard negli
  // ultimi 15 giorni prima della scadenza (a differenza del popup qualifiche,
  // qui non c'è "vista una volta" — è un promemoria di pagamento, deve
  // ripresentarsi finché non rinnova).
  let renewalDaysLeft: number | null = null
  if (profile?.subscription_status === 'active' && profile?.subscription_expires_at) {
    const msLeft = new Date(profile.subscription_expires_at).getTime() - new Date().getTime()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
    if (daysLeft >= 0 && daysLeft <= 15) renewalDaysLeft = daysLeft
  }

  // 10. URL di condivisione
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/ref/${profile?.referral_code}`

  // 11. CARICA GLI ANNUNCI PER L'ANTEPRIMA
  const recentListings = await getActiveListings({ limit: 3 })
  
  // 12. CARICA CONTATORE MESSAGGI NON LETTI
  const unreadMessagesCount = await getUnreadMessagesCount(user.id)

  return (
  <div className="min-h-screen bg-[var(--background)]" suppressHydrationWarning>
    {/* ✅ BANNER IMPERSONIFICAZIONE */}
    <ImpersonationBanner />

    {newlyAchievedRank ? (
      <RankAchievementModal
        rankKey={newlyAchievedRank.key}
        labelKey={newlyAchievedRank.labelKey}
        descriptionKey={newlyAchievedRank.descriptionKey}
        icon={newlyAchievedRank.icon}
      />
    ) : (
      renewalDaysLeft !== null &&
      profile?.subscription_expires_at && (
        <RenewalReminderModal expiresAt={profile.subscription_expires_at} daysLeft={renewalDaysLeft} />
      )
    )}
           
       <InstallAppPrompt />   {/* ✅ NUOVO */}

      {/* Header */}
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] shadow-[0_8px_30px_rgba(23,23,23,0.18)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="hidden text-2xl font-bold tracking-tight text-white sm:block">{t('programTitle')}</h1>
          <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">NMP</h1>
        
          <div className="flex items-center gap-3">
            <LanguageSwitcher dark />
            <DashboardHeaderActions user={user} profile={profile} isAdmin={userIsAdmin} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ActivityTracker userId={user.id} />
        
        {/* Completa Profilo */}
        {profile?.date_of_birth === '2000-01-01' && (
          <ProfileCompleter initialData={profile} />
        )}

        {/* SEZIONE 1: CODICE REFERRAL E SPONSOR */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/45 bg-[var(--ink)] p-6 text-white shadow-[0_18px_45px_rgba(23,23,23,0.2)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--gold)]/10 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Rocket className="h-6 w-6 text-[var(--gold-bright)]" />
                  {t('growthTool')}
                </h2>
                <p className="mb-2 text-sm text-stone-300">{t('yourReferralCode')}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-white drop-shadow-lg">
                    {profile?.referral_code}
                  </p>
                  {currentRank && <RankBadge rank={currentRank} />}
                </div>
                <DirectAffiliatesList people={directSponsoredWithStatus} />
              </div>
              
              <div className="flex-1 w-full lg:w-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
                  <p className="mb-2 text-xs text-stone-300">{t('yourSponsor')}</p>
                  {sponsorData ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)] shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {sponsorData.first_name?.[0]}{sponsorData.last_name?.[0] || ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">
                          {sponsorData.first_name} {sponsorData.last_name}
                        </p>
                        {sponsorData.referral_code && (
                          <p className="font-mono text-xs text-[var(--gold-bright)]">
                            {sponsorData.referral_code}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-stone-300">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white text-lg">-</span>
                      </div>
                      <p className="text-sm">{t('nobody')}</p>
                    </div>
                  )}
                </div>
                
                <div>
                    <p className="mb-2 text-xs text-stone-300">{t('shareLink')}</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={shareUrl} 
                      className="flex-1 rounded-lg border border-[var(--gold)]/35 bg-white/10 px-3 py-2 text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/60"
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
          <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--paper)] p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-[var(--muted)]">{t('directAffiliates')}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-[var(--ink)]">{directSponsored.length}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('sponsoredLabel')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{directSponsorCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('activeLabel')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{directSponsorInSpilloverCount}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('spilloverLabel')}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="mb-1 text-sm text-[var(--muted)]">{t('totalDownline')}</p>
                <p className="text-2xl font-bold text-[var(--ink)]">{totalDownline}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {maxDownlineDepth > 0 ? t('downlineDepth', { depth: maxDownlineDepth }) : t('downlineDepthNone')}
                </p>
              </div>
            </div>
          </div>

          {/* CARD 2: I tuoi punti */}
          <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 p-6 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                {t('points')}
              </h3>
              <span className="text-3xl font-bold text-yellow-600">{profile?.daily_points || 0}</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>{t('pointsProgress')}</span>
                <span className="font-semibold">{profile?.daily_points || 0}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((profile?.daily_points || 0) / 10 * 100, 100)}%` }}></div>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              {10 - (profile?.daily_points || 0) > 0 
                ? t('pointsNeeded', { count: 10 - (profile?.daily_points || 0) })
                : t('pointsSufficient')}
            </p>
            
            <UnreadMessagesBadge initialCount={unreadMessagesCount || 0} />
            
            <Link href="/marketplace/listings" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-700 hover:text-yellow-800 transition-colors">
                {t('manageListings')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 3: Stato Abbonamento */}
          <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--paper)] p-6 shadow-sm transition-colors hover:shadow-md">
            <p className="text-sm text-gray-500 mb-2">{t('subscriptionStatus')}</p>
            <p className={`text-3xl font-bold capitalize mb-2 ${profile?.subscription_status === 'active' ? 'text-green-600' : 'text-orange-500'}`}>
              {profile?.subscription_status === 'active' ? t('subscriptionActive') : t('freePlan')}
            </p>
             <p className="text-xs text-gray-400 mb-3">{t('currentPlan')}</p>
             {profile?.subscription_status !== 'active' ? (
               <Link href="/billing" className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--ink-soft)] hover:shadow-lg">
                 <Zap className="w-4 h-4 mr-2" />
                 {t('subscribeNow')}
               </Link>
             ) : (
               <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                 <Star className="w-4 h-4" />
                 {t('activePlan')}
               </div>
             )}
             {profile?.subscription_status === 'active' && profile?.subscription_expires_at && (
               <p className="text-xs text-gray-500 mt-2">
                 {t('expiresAt')}: {new Date(profile.subscription_expires_at).toLocaleDateString('it-IT')}
               </p>
             )}
          </div>

          {/* CARD 4: MARKETPLACE */}
          <Link href="/marketplace" className="group relative overflow-hidden rounded-xl border border-[var(--gold)]/50 bg-[var(--ink)] p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold-bright)] hover:shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg"></div>
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-3">
                 <Store className="h-10 w-10 text-[var(--gold-bright)]" />
               </div>
                <p className="text-white font-bold text-lg mb-1">{t('marketplace')}</p>
              <p className="mb-3 text-sm text-stone-300">{t('digitalTools')}</p>
              <div className="flex items-center text-sm font-semibold text-[var(--gold-bright)] transition-transform group-hover:translate-x-1">
                {t('discoverServices')}
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
              {t('communityListings')}
            </h2>
            <div className="flex gap-3">
              <Link href="/marketplace/listings?showForm=true" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {t('publishListing')}
              </Link>
              <Link href="/marketplace/listings" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                {t('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          {recentListings.length === 0 ? (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-dashed border-yellow-300 rounded-xl p-8 text-center">
              <Tag className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noListings')}</h3>
              <p className="text-gray-600 text-sm mb-4" dangerouslySetInnerHTML={{ __html: t('beFirst') }}></p>
              <Link href="/marketplace/listings?showForm=true" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" />
                {t('publishFirstListing')}
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
                  <p className="text-xs text-gray-500 mb-3">{commonT('by')} {listing.profiles?.first_name} {listing.profiles?.last_name}</p>
                  
                  {listing.user_id === user.id ? (
                    <div className="w-full py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      {t('yourListing')}
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
              <TreePine className="h-6 w-6 text-[var(--gold)]" />
              {t('yourMatrix')}
            </h2>
            <span className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold-pale)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)]">
              {t('directPositions')}
            </span>
          </div>
          {downlineError ? (
            <p className="text-red-500 text-center py-8">{t('matrixError')}: {downlineError.message}</p>
          ) : (
            <MatrixTree rootNode={rootNode} descendants={downlineData || []} />
          )}
        </div>

        <SpilloverExplainer />

        {/* SEZIONE 4: LEADERBOARD & PROSSIMI OBIETTIVI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Leaderboard currentUserId={user.id} />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {t('nextGoals')}
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-yellow-500" />
                  <span className="text-xs font-semibold text-green-800 bg-green-200 px-2.5 py-1 rounded-full">{t('easy')}</span>
                </div>
                <p className="font-bold text-gray-900 mb-1">{t('risingStar')}</p>
                <p className="text-sm text-gray-600 mb-2">{t('risingStarDesc')}</p>
                <div className="w-full bg-green-200 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((directSponsorCount / 6) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">{directSponsorCount}/6 {t('affiliates')}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-800 bg-blue-200 px-2.5 py-1 rounded-full">{t('medium')}</span>
                </div>
                <p className="font-bold text-gray-900 mb-1">{t('shiningStar')}</p>
                <p className="text-sm text-gray-600 mb-2">{t('shiningStarDesc')}</p>
                <div className="w-full bg-blue-200 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((directSponsorCount / 36) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">{directSponsorCount}/36 {t('affiliates')}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Crown className="w-8 h-8 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-800 bg-purple-200 px-2.5 py-1 rounded-full">{t('hard')}</span>
                </div>
                <p className="font-bold text-gray-900 mb-1">{t('diamondStar')}</p>
                <p className="text-sm text-gray-600 mb-2">{t('diamondStarDesc')}</p>
                <div className="w-full bg-purple-200 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((directSponsorCount / 108) * 100, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">{directSponsorCount}/108 {t('affiliates')}</p>
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