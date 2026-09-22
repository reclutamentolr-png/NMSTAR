import { getTranslations } from 'next-intl/server'
import MatrixTree from '@/components/MatrixTree'
import CopyButton from '@/components/CopyButton'
import ProfileCompleter from '@/components/ProfileCompleter'
import Leaderboard from '@/components/Leaderboard'
import Link from '@/components/LocalizedLink'
import SpilloverExplainer from '@/components/SpilloverExplainer'
import RankBadge from '@/components/RankBadge'
import DirectAffiliatesList from '@/components/DirectAffiliatesList'
import NotYetKumaniList from '@/components/NotYetKumaniList'
import UnreadMessagesBadge from '@/components/UnreadMessagesBadge'
import CommunityPreview from './CommunityPreview'
import VoucherActivationButton from '@/components/VoucherActivationButton'
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
  ArrowRight,
} from 'lucide-react'
import type { DashboardNetworkData } from '@/lib/dashboardNetworkData'

// The historic single-page dashboard: everything (tools shortcuts, referral
// code, KUMI, matrix, KUMANI lists, qualifications) in one scroll. Kept
// byte-for-byte in behavior when extracted from dashboard/page.tsx — only
// the data now arrives as props instead of module-level variables, so it
// can be selected as "Tipo 1" from admin without touching this file.
export default async function DashboardTipo1({
  user,
  profile,
  shareUrl,
  recentListings,
  unreadMessagesCount,
  network,
}: {
  user: { id: string }
  profile: any
  shareUrl: string
  recentListings: any[]
  unreadMessagesCount: number
  network: DashboardNetworkData
}) {
  const t = await getTranslations('dashboard')

  const {
    rootNode,
    activeDownlineForTree,
    downlineError,
    totalDownline,
    maxDownlineDepth,
    sponsorData,
    directSponsored,
    directSponsorCount,
    activeKumani,
    pendingKumani,
    directSponsorInSpilloverCount,
    currentRank,
    loginUrl,
  } = network

  return (
    <>
      {/* Completa Profilo */}
      {profile?.date_of_birth === '2000-01-01' && <ProfileCompleter initialData={profile} />}

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
              <DirectAffiliatesList people={activeKumani} />
              <NotYetKumaniList people={pendingKumani} senderName={profile?.first_name || ''} loginUrl={loginUrl} />
            </div>

            <div className="flex-1 w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/20">
                <p className="mb-2 text-xs text-stone-300">{t('yourSponsor')}</p>
                {sponsorData ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)] shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {sponsorData.first_name?.[0]}
                        {sponsorData.last_name?.[0] || ''}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">
                        {sponsorData.first_name} {sponsorData.last_name}
                      </p>
                      {sponsorData.referral_code && (
                        <p className="font-mono text-xs text-[var(--gold-bright)]">{sponsorData.referral_code}</p>
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
        {/* CARD 1: KUMANI Diretti + Downline */}
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
              <div
                className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((profile?.daily_points || 0) / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
            {10 - (profile?.daily_points || 0) > 0
              ? t('pointsNeeded', { count: 10 - (profile?.daily_points || 0) })
              : t('pointsSufficient')}
          </p>

          <UnreadMessagesBadge initialCount={unreadMessagesCount || 0} />

          <Link
            href="/marketplace/listings"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-yellow-700 hover:text-yellow-800 transition-colors"
          >
            {t('manageListings')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* CARD 3: Stato Abbonamento */}
        <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--paper)] p-6 shadow-sm transition-colors hover:shadow-md">
          <p className="text-sm text-gray-500 mb-2">{t('subscriptionStatus')}</p>
          <p
            className={`text-3xl font-bold capitalize mb-2 ${
              profile?.subscription_status === 'active' ? 'text-green-600' : 'text-orange-500'
            }`}
          >
            {profile?.subscription_status === 'active' ? t('subscriptionActive') : t('freePlan')}
          </p>
          <p className="text-xs text-gray-400 mb-3">{t('currentPlan')}</p>
          {profile?.subscription_status !== 'active' ? (
            <>
              <Link
                href="/billing"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--ink-soft)] hover:shadow-lg"
              >
                <Zap className="w-4 h-4 mr-2" />
                {t('subscribeNow')}
              </Link>
              <VoucherActivationButton />
            </>
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
        <Link
          href="/marketplace"
          className="group relative overflow-hidden rounded-xl border border-[var(--gold)]/50 bg-[var(--ink)] p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold-bright)] hover:shadow-xl"
        >
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

      <CommunityPreview recentListings={recentListings} userId={user.id} />

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
          <p className="text-red-500 text-center py-8">
            {t('matrixError')}: {downlineError.message}
          </p>
        ) : (
          <MatrixTree rootNode={rootNode} descendants={activeDownlineForTree} />
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
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((directSponsorCount / 6) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {directSponsorCount}/6 {t('affiliates')}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-8 h-8 text-blue-500" />
                <span className="text-xs font-semibold text-blue-800 bg-blue-200 px-2.5 py-1 rounded-full">{t('medium')}</span>
              </div>
              <p className="font-bold text-gray-900 mb-1">{t('shiningStar')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('shiningStarDesc')}</p>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((directSponsorCount / 36) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {directSponsorCount}/36 {t('affiliates')}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Crown className="w-8 h-8 text-purple-500" />
                <span className="text-xs font-semibold text-purple-800 bg-purple-200 px-2.5 py-1 rounded-full">{t('hard')}</span>
              </div>
              <p className="font-bold text-gray-900 mb-1">{t('diamondStar')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('diamondStarDesc')}</p>
              <div className="w-full bg-purple-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((directSponsorCount / 108) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {directSponsorCount}/108 {t('affiliates')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
