import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import {
  ArrowLeft,
  Wallet,
  Ticket,
  Gift,
  Sparkles,
  Award,
  TicketCheck,
  Receipt,
  BadgePercent,
  IdCard,
  ArrowRight,
} from 'lucide-react'
import { fetchDirectSponsored } from '@/lib/directAffiliates'
import { isActiveSubscription } from '@/lib/subscriptionGate'
import { getCurrentRank, RANKS } from '@/lib/ranks'
import WalletMembershipCard from '@/components/WalletMembershipCard'
import WalletCouponsList from '@/components/WalletCouponsList'

function WalletSection({
  icon,
  title,
  comingSoonLabel,
  children,
}: {
  icon: React.ReactNode
  title: string
  comingSoonLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--paper)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--ink)]">
          {icon}
          {title}
        </h3>
        {comingSoonLabel && (
          <span className="rounded-full border border-[var(--gold)]/40 bg-[var(--gold-pale)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            {comingSoonLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export default async function WalletPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('wallet')
  const td = await getTranslations('dashboard')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect(`/${locale}/dashboard`)

  const directSponsored = await fetchDirectSponsored(supabase, user.id)
  const directActiveCount = directSponsored.filter(isActiveSubscription).length
  const currentRank = getCurrentRank(directActiveCount)

  const { data: receipts } = await supabase
    .from('digital_receipts')
    .select('id, object_name, template, confirmed_at, returned_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const receiptsList = receipts || []
  const receiptsPending = receiptsList.filter((r) => !r.confirmed_at).length
  const receiptsConfirmed = receiptsList.filter((r) => r.confirmed_at && !r.returned_at).length
  const receiptsReturned = receiptsList.filter((r) => r.returned_at).length

  const { data: coupons } = await supabase
    .from('wallet_coupons')
    .select('id, code, title, description, expires_at, redeemed_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const couponsList = coupons || []

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const referralUrl = `${baseUrl}/${locale}/ref/${profile.referral_code}`
  const memberSince = new Date(profile.created_at).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] text-white shadow-[0_8px_30px_rgba(23,23,23,0.18)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-[var(--gold-bright)] transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('backToDashboard')}
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <Wallet className="h-5 w-5 text-[var(--gold-bright)]" /> {t('title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 max-w-2xl">
          <p className="mb-2 text-lg font-semibold text-[var(--ink)]">{t('intro')}</p>
          <p className="text-sm leading-6 text-[var(--muted)]">{t('introSub')}</p>
        </div>

        {/* Membership */}
        <WalletSection icon={<IdCard className="h-5 w-5 text-[var(--gold)]" />} title={t('membershipTitle')}>
          <WalletMembershipCard
            firstName={profile.first_name}
            lastName={profile.last_name}
            memberId={profile.referral_code}
            memberSince={memberSince}
            planLabel={profile.subscription_status === 'active' ? td('subscriptionActive') : td('freePlan')}
            rankLabel={currentRank ? td(currentRank.labelKey) : null}
            qrUrl={referralUrl}
          />
        </WalletSection>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Points / XP */}
          <WalletSection icon={<Sparkles className="h-5 w-5 text-[var(--gold)]" />} title={t('pointsTitle')}>
            <p className="text-4xl font-bold text-[var(--ink)]">{profile.daily_points || 0}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{t('pointsDisclaimer')}</p>
            <Link
              href="/marketplace/listings"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--gold)] hover:text-[var(--ink)]"
            >
              {t('pointsCta')} <ArrowRight className="h-4 w-4" />
            </Link>
          </WalletSection>

          {/* Badge */}
          <WalletSection icon={<Award className="h-5 w-5 text-[var(--gold)]" />} title={t('badgeTitle')}>
            <div className="grid grid-cols-2 gap-3">
              {RANKS.map((rank) => {
                const earned = directActiveCount >= rank.threshold
                return (
                  <div
                    key={rank.key}
                    className={`rounded-lg border p-3 text-center ${
                      earned ? 'border-[var(--gold)]/55 bg-[var(--gold-pale)]' : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <p className={`text-sm font-bold ${earned ? 'text-[var(--ink)]' : 'text-gray-400'}`}>
                      {td(rank.labelKey)}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {earned ? t('badgeEarned') : t('badgeLocked', { threshold: rank.threshold })}
                    </p>
                  </div>
                )
              })}
            </div>
          </WalletSection>
        </div>

        {/* Receipts */}
        <WalletSection icon={<Receipt className="h-5 w-5 text-[var(--gold)]" />} title={t('receiptsTitle')}>
          {receiptsList.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('receiptsEmpty')}</p>
          ) : (
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-orange-500">{receiptsPending}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('receiptsPending')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{receiptsConfirmed}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('receiptsConfirmed')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--ink)]">{receiptsReturned}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('receiptsReturned')}</p>
              </div>
            </div>
          )}
          <Link
            href="/marketplace/digital-receipt"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--gold)] hover:text-[var(--ink)]"
          >
            {t('receiptsCta')} <ArrowRight className="h-4 w-4" />
          </Link>
        </WalletSection>

        {/* Coupon */}
        <WalletSection icon={<Ticket className="h-5 w-5 text-[var(--gold)]" />} title={t('couponTitle')}>
          {couponsList.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('couponEmpty')}</p>
          ) : (
            <WalletCouponsList coupons={couponsList} />
          )}
        </WalletSection>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Rewards */}
          <WalletSection icon={<Gift className="h-5 w-5 text-[var(--gold)]" />} title={t('rewardsTitle')} comingSoonLabel={t('comingSoon')}>
            <p className="text-sm text-[var(--muted)]">{t('rewardsEmpty')}</p>
          </WalletSection>

          {/* Pass */}
          <WalletSection icon={<TicketCheck className="h-5 w-5 text-[var(--gold)]" />} title={t('passTitle')} comingSoonLabel={t('comingSoon')}>
            <p className="text-sm text-[var(--muted)]">{t('passEmpty')}</p>
          </WalletSection>

          {/* Gift / Benefit */}
          <WalletSection icon={<BadgePercent className="h-5 w-5 text-[var(--gold)]" />} title={t('giftTitle')} comingSoonLabel={t('comingSoon')}>
            <p className="text-sm text-[var(--muted)]">{t('giftEmpty')}</p>
          </WalletSection>
        </div>
      </main>
    </div>
  )
}
