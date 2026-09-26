import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import DashboardHeaderActions from '@/components/DashboardHeaderActions'
import ActivityTracker from '@/components/ActivityTracker'
import ChatModalWrapper from '@/components/ChatModalWrapper'
import ListingDetailModalWrapper from '@/components/ListingDetailModalWrapper'
import { getActiveListings, getUnreadMessagesCount } from '@/lib/listings-server'
import ImpersonationBanner from '@/components/ImpersonationBanner'
import InstallAppPrompt from '@/components/InstallAppPrompt'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import RankAchievementModal from '@/components/RankAchievementModal'
import RenewalReminderModal from '@/components/RenewalReminderModal'
import AdminMessagePopup from '@/components/AdminMessagePopup'
import { isAdmin } from '@/lib/admin-auth'
import { getDashboardNetworkData } from '@/lib/dashboardNetworkData'
import { getActiveDashboardLayout } from '@/lib/dashboardLayout-server'
import { getMarketplaceAccessState } from '@/lib/marketplaceAccess'
import { getMarketplaceTools } from '@/lib/marketplaceTools'
import { getFavoriteToolNames } from '@/lib/favorites'
import DashboardTipo1 from '@/components/dashboard/DashboardTipo1'
import DashboardTipo2 from '@/components/dashboard/DashboardTipo2'
import ProArea from '@/components/dashboard/ProArea'
import ProTeaser from '@/components/dashboard/ProTeaser'
import { getProAreaStats } from '@/lib/proAreaStats'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const marketplaceT = await getTranslations('marketplace')
  const supabase = await createClient()

  // 1. Verifica autenticazione
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  // 2. Verifica se l'utente è amministratore
  const userIsAdmin = await isAdmin()

  // 3. Recupera dati profilo
  // Profilo completo (dati personali inclusi) solo tramite get_my_profile():
  // dal browser/sessione utente le colonne personali non sono più leggibili.
  const { data: profile } = await supabase.rpc('get_my_profile').maybeSingle<Record<string, any>>()

  // 4. Layout attivo (impostazione admin, "system_settings" key 'dashboard_layout')
  const layout = await getActiveDashboardLayout(supabase)

  // 5. Dati "rete" — condivisi da Tipo 1 (inline) e dalla pagina /dashboard/rete
  //    (Tipo 2 mostra solo un riepilogo, ma serve comunque per i popup
  //    qualifiche/rinnovo, quindi si recupera sempre).
  const network = await getDashboardNetworkData(supabase, user, profile, locale)
  const { newlyAchievedRank } = network

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

  // 6. URL di condivisione
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${locale}/ref/${profile?.referral_code}`

  // 7. Annunci recenti + messaggi non letti
  const recentListings = await getActiveListings({ limit: 3 })
  const unreadMessagesCount = await getUnreadMessagesCount(user.id)

  // 8. Strumenti Marketplace attivi e piano dell'utente (Area Professionisti
  //    per tutti i layout; lista strumenti e preferiti solo per Tipo 2)
  const { userPlan, isSettingEnabled, isToolEnabled, requiredPlan } = await getMarketplaceAccessState(supabase, user.id)
  const enabledTools = getMarketplaceTools(marketplaceT).filter((tool) => isSettingEnabled(tool.toolName))
  const proTools = enabledTools.filter((tool) => requiredPlan(tool.toolName) === 'pro')
  const isPro = userPlan === 'pro'

  // Area Professionisti: dati dell'attività, giorni di prova rimasti o data di rinnovo
  let proAreaStats: Awaited<ReturnType<typeof getProAreaStats>> = {}
  let trialDaysLeft: number | null = null
  let proRenewsOn: string | null = null
  if (isPro && proTools.length > 0) {
    proAreaStats = await getProAreaStats(supabase, user.id)
    const paidPro = profile?.subscription_status === 'active' && profile?.subscription_plan === 'pro'
    const trialEnd = profile?.pro_trial_ends_at ? new Date(profile.pro_trial_ends_at).getTime() : 0
    if (!paidPro && trialEnd > new Date().getTime()) {
      trialDaysLeft = Math.ceil((trialEnd - new Date().getTime()) / (1000 * 60 * 60 * 24))
    } else if (profile?.subscription_expires_at) {
      proRenewsOn = new Date(profile.subscription_expires_at).toLocaleDateString(locale)
    }
  }

  let visibleTools: ReturnType<typeof getMarketplaceTools> = []
  let lockedToolNames: string[] = []
  let proToolNames: string[] = []
  let favoriteToolNames: string[] = []
  if (layout === 'tipo2') {
    // Chi è Pro trova gli strumenti Pro nell'Area Professionisti: non si
    // ripetono nelle categorie sotto.
    visibleTools = isPro ? enabledTools.filter((tool) => requiredPlan(tool.toolName) !== 'pro') : enabledTools
    // Admin-enabled but not usable by THIS user (no active subscription) —
    // shown locked instead of silently hidden, same distinction the
    // marketplace category grid already makes via MarketplaceCard.
    lockedToolNames = visibleTools.filter((tool) => !isToolEnabled(tool.toolName)).map((tool) => tool.toolName)
    proToolNames = visibleTools.filter((tool) => requiredPlan(tool.toolName) === 'pro').map((tool) => tool.toolName)
    favoriteToolNames = await getFavoriteToolNames(supabase, user.id)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]" suppressHydrationWarning>
      <ImpersonationBanner />

      {newlyAchievedRank ? (
        <RankAchievementModal
          rankKey={newlyAchievedRank.key}
          labelKey={newlyAchievedRank.labelKey}
          descriptionKey={newlyAchievedRank.descriptionKey}
          icon={newlyAchievedRank.icon}
          bonusPoints={newlyAchievedRank.bonusPoints}
        />
      ) : renewalDaysLeft !== null && profile?.subscription_expires_at ? (
        <RenewalReminderModal expiresAt={profile.subscription_expires_at} daysLeft={renewalDaysLeft} />
      ) : (
        <AdminMessagePopup />
      )}

      <InstallAppPrompt />

      {/* Header */}
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] shadow-[0_8px_30px_rgba(23,23,23,0.18)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="hidden text-2xl font-bold tracking-tight text-white sm:block">{t('programTitle')}</h1>
          <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">Kumani</h1>

          <div className="flex items-center gap-3">
            <LanguageSwitcher dark />
            <DashboardHeaderActions user={user} profile={profile} isAdmin={userIsAdmin} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ActivityTracker userId={user.id} />

        {isPro && proTools.length > 0 ? (
          <ProArea tools={proTools} stats={proAreaStats} trialDaysLeft={trialDaysLeft} renewsOn={proRenewsOn} />
        ) : (
          !isPro && proTools.length > 0 && <ProTeaser />
        )}

        {layout === 'tipo2' ? (
          <DashboardTipo2
            profile={profile}
            shareUrl={shareUrl}
            recentListings={recentListings}
            unreadMessagesCount={unreadMessagesCount || 0}
            visibleTools={visibleTools}
            lockedToolNames={lockedToolNames}
            proToolNames={proToolNames}
            favoriteToolNames={favoriteToolNames}
            network={network}
            userId={user.id}
          />
        ) : (
          <DashboardTipo1
            user={user}
            profile={profile}
            shareUrl={shareUrl}
            recentListings={recentListings}
            unreadMessagesCount={unreadMessagesCount || 0}
            network={network}
          />
        )}
      </main>

      <ChatModalWrapper userId={user.id} />
      <ListingDetailModalWrapper />
    </div>
  )
}
