'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { Permission } from '@/lib/admin-permissions'
import { generateShortCode } from '@/lib/shortLink'
import { updateTag } from 'next/cache'
import { SPOTLIGHT_HOME_CACHE_TAG, type SpotlightModerationStatus } from '@/lib/spotlight'

const getServiceClient = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

// Verifies the CURRENT SESSION is an admin and, when `requiredPermission` is
// given, that their role actually grants it — the admin panel UI only hides
// menu items for permissions a role lacks, it doesn't stop the underlying
// server action from being invoked directly, so this is the real gate.
async function verifyAdmin(requiredPermission?: Permission) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  // Full admins (profiles.is_admin) bypass the granular role/permission system.
  if (profile?.is_admin) return user

  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('role_id, admin_roles(permissions)')
    .eq('user_id', user.id)
    .single()

  if (!adminRecord) return null
  if (!requiredPermission) return user

  const roles = adminRecord.admin_roles as { permissions?: string[] } | { permissions?: string[] }[] | null
  const rawPermissions: string[] = Array.isArray(roles)
    ? (roles[0]?.permissions ?? [])
    : (roles?.permissions ?? [])

  if (rawPermissions.includes('*') || rawPermissions.includes(requiredPermission)) return user

  return null
}

export async function adminUpdateProfile(userId: string, profileData: Record<string, unknown>) {
  const admin = await verifyAdmin('users.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(profileData)
    .eq('id', userId)

  if (error) {
    console.error('Errore aggiornamento profilo:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ✅ GENERA DUE LINK: uno per l'utente target, uno di ripristino per l'admin
export async function impersonateUser(userId: string) {
  const admin = await verifyAdmin('users.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Recupera email utente target
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (userError || !userData.user?.email) {
    return { success: false, error: 'Utente non trovato' }
  }

  if (!admin.email) {
    return { success: false, error: 'Email admin non trovata' }
  }

  // Link 1: login come utente target → passa dalla pagina callback
  const { data: targetLink, error: e1 } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
    options: {
      redirectTo: `${base}/it/auth/impersonate-callback?impersonating=${admin.id}`
    }
  })
  if (e1) return { success: false, error: e1.message }

  // Link 2: ripristino sessione admin — sempre per l'admin della sessione
  // verificata (admin.id), MAI per un id passato dal client, altrimenti un
  // admin malevolo potrebbe farsi generare il link di accesso di un altro admin.
  const { data: adminLink, error: e2 } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: admin.email!,
    options: {
      redirectTo: `${base}/it/auth/impersonate-callback?restore=1`
    }
  })
  if (e2) return { success: false, error: e2.message }

  return {
    success: true,
    targetUrl: targetLink.properties.action_link,
    adminRestoreUrl: adminLink.properties.action_link
  }
}

// ── Wallet coupons ──────────────────────────────────────────────────────
// Manual coupon issuance: an admin assigns a coupon directly to one user,
// who then sees and self-redeems it from their My Wallet. See
// supabase/migrations/20260921240000_add_wallet_coupons.sql for the RLS
// rationale (owner can only ever read + redeem, never edit).

export async function createCoupon(input: {
  userId: string
  title: string
  description: string
  expiresAt: string | null
}) {
  const admin = await verifyAdmin('coupons.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  if (!input.userId || !input.title.trim()) {
    return { success: false, error: 'Utente e titolo sono obbligatori' }
  }

  const supabaseAdmin = getServiceClient()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode()
    const { error } = await supabaseAdmin.from('wallet_coupons').insert({
      user_id: input.userId,
      code,
      title: input.title.trim(),
      description: input.description.trim() || null,
      expires_at: input.expiresAt,
      issued_by: admin.id,
    })

    if (!error) return { success: true }
    if (error.code !== '23505') {
      // Not a unique-code collision — a real error, stop retrying.
      return { success: false, error: error.message }
    }
  }

  return { success: false, error: 'Impossibile generare un codice coupon univoco. Riprova.' }
}

export async function listCoupons() {
  const admin = await verifyAdmin('coupons.read')
  if (!admin) return { coupons: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('wallet_coupons')
    .select('id, code, title, description, expires_at, redeemed_at, created_at, user_id, profiles:user_id(first_name, last_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { coupons: [], error: error.message }
  return { coupons: data || [], error: null }
}

export async function revokeCoupon(couponId: string) {
  const admin = await verifyAdmin('coupons.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('wallet_coupons').delete().eq('id', couponId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Subscription vouchers ───────────────────────────────────────────────
// Read-only admin visibility + revocation for the voucher system: creation
// and redemption both happen client-side via the SECURITY DEFINER RPCs in
// supabase/migrations/20260922130000_add_subscription_vouchers.sql (never
// through a server action), so this file only ever reads or revokes —
// mirrors the coupon admin surface above.

export async function listVouchers() {
  const admin = await verifyAdmin('vouchers.read')
  if (!admin) return { vouchers: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('subscription_vouchers')
    .select('id, code, status, created_at, redeemed_at, created_by, redeemed_by')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { vouchers: [], error: error.message }
  const rows = data || []

  // created_by/redeemed_by reference auth.users, not profiles, so PostgREST
  // can't embed profiles automatically here — fetch the involved profiles
  // separately and merge instead.
  const userIds = Array.from(new Set(rows.flatMap((v) => [v.created_by, v.redeemed_by].filter(Boolean))))
  const profiles = userIds.length
    ? (await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', userIds)).data
    : []
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

  const vouchers = rows.map((v) => ({
    ...v,
    creator: byId[v.created_by] || null,
    redeemer: v.redeemed_by ? byId[v.redeemed_by] || null : null,
  }))

  return { vouchers, error: null }
}

export async function revokeVoucher(voucherId: string) {
  const admin = await verifyAdmin('vouchers.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  // Only an still-active voucher can be revoked — one already redeemed has
  // already activated someone's subscription and revoking the row here
  // would not undo that, so it must not look like it did.
  const { error } = await supabaseAdmin
    .from('subscription_vouchers')
    .update({ status: 'revoked' })
    .eq('id', voucherId)
    .eq('status', 'active')

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Admin-issued codes are visually distinct from Kumano-issued ones ("KVA-"
// vs "KV-") purely for audit clarity in the table below — functionally
// they redeem through the exact same, already-hardened
// redeem_subscription_voucher() RPC (single-use, self-redemption blocked).
// Unlike a Kumano's voucher, this one costs no points: admin.id becomes
// created_by, so an admin can never redeem their own issued code either.
const ADMIN_VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // unambiguous, no 0/O/1/I
const ADMIN_VOUCHER_LENGTH = 14 // 32^14 keyspace — brute-forcing a valid code is infeasible

function generateSecureVoucherCode(): string {
  // crypto.randomBytes is a CSPRNG (unlike Math.random), so a generated
  // code can't be predicted or reproduced by anyone outside this server,
  // including by the admin issuing it. 256 is an exact multiple of the
  // 32-character alphabet, so byte % 32 has zero modulo bias.
  const bytes = randomBytes(ADMIN_VOUCHER_LENGTH)
  let code = ''
  for (let i = 0; i < ADMIN_VOUCHER_LENGTH; i++) {
    code += ADMIN_VOUCHER_ALPHABET[bytes[i] % ADMIN_VOUCHER_ALPHABET.length]
  }
  return code
}

export async function createAdminVoucher(): Promise<{ success: true; code: string } | { success: false; error: string }> {
  const admin = await verifyAdmin('vouchers.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = 'KVA-' + generateSecureVoucherCode()
    const { error } = await supabaseAdmin.from('subscription_vouchers').insert({
      code,
      created_by: admin.id,
      status: 'active',
    })
    if (!error) return { success: true, code }
    if (error.code !== '23505') return { success: false, error: error.message }
  }

  return { success: false, error: 'Impossibile generare un codice univoco. Riprova.' }
}

// Credits daily_points (KU Points) directly to a user — separate from
// network_points on purpose, per product decision: an admin top-up should
// only unlock listings, never let someone mint vouchers/rewards for free.
export async function creditDailyPoints(userId: string, amount: number) {
  const admin = await verifyAdmin('vouchers.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  if (!userId || !Number.isInteger(amount) || amount <= 0) {
    return { success: false, error: 'Seleziona un utente e un numero di punti valido (> 0).' }
  }

  const supabaseAdmin = getServiceClient()
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('daily_points')
    .eq('id', userId)
    .single()

  if (fetchError || !profile) return { success: false, error: 'Utente non trovato.' }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ daily_points: (profile.daily_points || 0) + amount })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listVoucherUsers() {
  const admin = await verifyAdmin('vouchers.read')
  if (!admin) return { users: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, referral_code, daily_points')
    .order('first_name')
    .limit(500)

  if (error) return { users: [], error: error.message }
  return { users: data || [], error: null }
}

// ── Reward catalog ──────────────────────────────────────────────────────
// Prizes a Kumano can redeem with network_points (see
// supabase/migrations/20260922150000_fix_voucher_points_and_reward_tiers.sql
// for reward_catalog / reward_redemptions / redeem_reward()). Admin manages
// the catalog here; the actual point spend + redemption record only ever
// happens through the redeem_reward() RPC, called from
// src/app/actions/rewards.ts, never from this file.

export async function createReward(input: {
  title: string
  description: string
  imageUrl: string
  pointsCost: number
  isVisible: boolean
}) {
  const admin = await verifyAdmin('rewards.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  if (!input.title.trim() || !input.pointsCost || input.pointsCost <= 0) {
    return { success: false, error: 'Titolo e Punti Rete (> 0) sono obbligatori' }
  }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('reward_catalog').insert({
    title: input.title.trim(),
    description: input.description.trim() || null,
    image_url: input.imageUrl.trim() || null,
    points_cost: input.pointsCost,
    is_visible: input.isVisible,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateReward(
  rewardId: string,
  input: { title: string; description: string; imageUrl: string; pointsCost: number; isVisible: boolean }
) {
  const admin = await verifyAdmin('rewards.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  if (!input.title.trim() || !input.pointsCost || input.pointsCost <= 0) {
    return { success: false, error: 'Titolo e Punti Rete (> 0) sono obbligatori' }
  }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin
    .from('reward_catalog')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      image_url: input.imageUrl.trim() || null,
      points_cost: input.pointsCost,
      is_visible: input.isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rewardId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listRewards() {
  const admin = await verifyAdmin('rewards.read')
  if (!admin) return { rewards: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('reward_catalog')
    .select('id, title, description, image_url, points_cost, is_visible, created_at')
    .order('created_at', { ascending: false })

  if (error) return { rewards: [], error: error.message }
  return { rewards: data || [], error: null }
}

export async function deleteReward(rewardId: string) {
  const admin = await verifyAdmin('rewards.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  // reward_redemptions.reward_id is ON DELETE RESTRICT, so this fails with
  // a clear DB error if the reward has ever been redeemed — a redeemed
  // reward can only be hidden (is_visible: false via updateReward), never
  // deleted, so fulfillment history is never lost.
  const { error } = await supabaseAdmin.from('reward_catalog').delete().eq('id', rewardId)
  if (error) return { success: false, error: 'Non è possibile eliminare un premio già riscattato: nascondilo invece.' }
  return { success: true }
}

export async function listRewardRedemptions() {
  const admin = await verifyAdmin('rewards.read')
  if (!admin) return { redemptions: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('reward_redemptions')
    .select('id, reward_id, user_id, points_spent, redeemed_at, fulfilled_at, fulfillment_code, reward_catalog(title)')
    .order('redeemed_at', { ascending: false })
    .limit(200)

  if (error) return { redemptions: [], error: error.message }
  const rows = data || []

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
  const profiles = userIds.length
    ? (await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', userIds)).data
    : []
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

  const redemptions = rows.map((r) => ({ ...r, redeemer: byId[r.user_id] || null }))
  return { redemptions, error: null }
}

// Fulfills a reward redemption by entering the real code the admin bought
// (an Amazon gift card code, etc.): marks the redemption evaso AND copies
// the code into a new wallet_coupons row for that user, so it shows up
// where Kumani already know to look for coupons — My Wallet → Coupon —
// reusing that existing UI (including the coupon PDF) instead of building
// a parallel "view my prize" screen.
export async function fulfillRewardRedemption(redemptionId: string, code: string) {
  const admin = await verifyAdmin('rewards.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const trimmedCode = code.trim()
  if (!trimmedCode) return { success: false, error: 'Inserisci il codice da inviare.' }

  const supabaseAdmin = getServiceClient()

  const { data: redemption, error: fetchError } = await supabaseAdmin
    .from('reward_redemptions')
    .select('id, user_id, fulfilled_at, reward_catalog(title, description)')
    .eq('id', redemptionId)
    .single()

  if (fetchError || !redemption) return { success: false, error: 'Riscatto non trovato.' }
  if (redemption.fulfilled_at) return { success: false, error: 'Questo riscatto è già stato evaso.' }

  const rewardInfo = Array.isArray(redemption.reward_catalog) ? redemption.reward_catalog[0] : redemption.reward_catalog

  const { error: couponError } = await supabaseAdmin.from('wallet_coupons').insert({
    user_id: redemption.user_id,
    code: trimmedCode,
    title: rewardInfo?.title || 'Premio',
    description: rewardInfo?.description || null,
    issued_by: admin.id,
  })

  if (couponError) {
    if (couponError.code === '23505') {
      return { success: false, error: 'Questo codice è già stato usato per un altro coupon. Verificalo.' }
    }
    return { success: false, error: couponError.message }
  }

  const { error: updateError } = await supabaseAdmin
    .from('reward_redemptions')
    .update({ fulfilled_at: new Date().toISOString(), fulfillment_code: trimmedCode })
    .eq('id', redemptionId)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true }
}

// ── Financial summary ───────────────────────────────────────────────────
// Read-only reporting for the "Amministrazione" admin section: real Stripe
// revenue vs. everything given back to the network (vouchers, rewards,
// rank/structure bonuses). Every euro figure here is an estimate derived
// from subscription_price_eur (1 point ≈ 1 euro, the symbolism this whole
// points system was built on — see the voucher cost / subscription price
// match) — it is not pulled from Stripe's own ledger, only from what the
// app itself tracks.
//
// Kumano-issued vs admin-issued vouchers are told apart by code prefix
// ("KV-" vs "KVA-", see createAdminVoucher above) — a code starting with
// "KVA-" never matches the LIKE 'KV-%' pattern because its 3rd character
// is 'A', not '-', so the two counts never overlap (verified live before
// relying on it here).
export async function getAdminFinancialSummary() {
  const admin = await verifyAdmin('stats.read')
  if (!admin) return { success: false as const, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()

  const readNumberSetting = async (key: string, fallback: number) => {
    const { data } = await supabaseAdmin.from('system_settings').select('value').eq('key', key).maybeSingle()
    if (!data) return fallback
    const parsed = parseInt(JSON.parse(data.value), 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const subscriptionPrice = await readNumberSetting('subscription_price_eur', 49)
  const matrixBonusPerSlot = await readNumberSetting('matrix_slot_bonus_points', 5)
  const matrixSpilloverBonusPerSlot = await readNumberSetting('matrix_spillover_bonus_points', 5)

  const { count: activeStripeCount } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active')
    .eq('subscription_source', 'stripe')

  const { count: kumanoVouchersRedeemed } = await supabaseAdmin
    .from('subscription_vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'redeemed')
    .like('code', 'KV-%')

  const { count: adminVouchersRedeemed } = await supabaseAdmin
    .from('subscription_vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'redeemed')
    .like('code', 'KVA-%')

  const { data: rewardRows, count: rewardsRedeemedCount } = await supabaseAdmin
    .from('reward_redemptions')
    .select('points_spent', { count: 'exact' })
  const rewardsValue = (rewardRows || []).reduce((sum, r) => sum + (r.points_spent || 0), 0)

  const RANK_BONUS_VALUES: Record<string, number> = { rising_star: 49, shining_star: 294, diamond_star: 900 }
  const { data: profilesWithRanks } = await supabaseAdmin.from('profiles').select('rank_bonuses_claimed')
  let rankBonusValue = 0
  for (const p of profilesWithRanks || []) {
    for (const key of p.rank_bonuses_claimed || []) {
      rankBonusValue += RANK_BONUS_VALUES[key] || 0
    }
  }

  const { data: profilesWithSlots } = await supabaseAdmin
    .from('profiles')
    .select('matrix_bonus_direct_slots_paid, matrix_bonus_spillover_slots_paid')
  const matrixBonusValue = (profilesWithSlots || []).reduce(
    (sum, p) =>
      sum +
      (p.matrix_bonus_direct_slots_paid || 0) * matrixBonusPerSlot +
      (p.matrix_bonus_spillover_slots_paid || 0) * matrixSpilloverBonusPerSlot,
    0
  )

  const realRevenue = (activeStripeCount || 0) * subscriptionPrice
  const kumanoVouchersValue = (kumanoVouchersRedeemed || 0) * subscriptionPrice
  const adminVouchersValue = (adminVouchersRedeemed || 0) * subscriptionPrice
  const totalReturnedToNetwork = kumanoVouchersValue + adminVouchersValue + rewardsValue + rankBonusValue + matrixBonusValue
  const returnedPercent = realRevenue > 0 ? (totalReturnedToNetwork / realRevenue) * 100 : 0

  return {
    success: true as const,
    subscriptionPrice,
    activeStripeCount: activeStripeCount || 0,
    realRevenue,
    kumanoVouchersRedeemed: kumanoVouchersRedeemed || 0,
    kumanoVouchersValue,
    adminVouchersRedeemed: adminVouchersRedeemed || 0,
    adminVouchersValue,
    rewardsRedeemedCount: rewardsRedeemedCount || 0,
    rewardsValue,
    rankBonusValue,
    matrixBonusValue,
    totalReturnedToNetwork,
    returnedPercent,
  }
}

// "Bacheca" moderation queue — one row per report, listing embedded via its
// public FK (works fine through PostgREST, unlike reporter_id → auth.users
// below, which needs a separate profiles lookup, same workaround as
// listRewardRedemptions).
export async function listListingReports() {
  const admin = await verifyAdmin('listings.read')
  if (!admin) return { reports: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('listing_reports')
    .select('id, listing_id, reporter_id, reason, created_at, listings(id, title, description, category, price, image_url, user_id, created_at)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { reports: [], error: error.message }
  const rows = data || []

  // Reporter (auth.users FK, needs a separate lookup) and listing owner (full
  // name only shown here in the admin queue — public listing/user-facing
  // views only ever get first_name, see ListingDetailModal/page.tsx/
  // CommunityPreview.tsx) share one batched profiles query.
  const ownerIds = rows.map((r: any) => r.listings?.user_id).filter(Boolean)
  const profileIds = Array.from(new Set([...rows.map((r) => r.reporter_id), ...ownerIds].filter(Boolean)))
  const profiles = profileIds.length
    ? (await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', profileIds)).data
    : []
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

  const reports = rows.map((r: any) => ({
    ...r,
    reporter: byId[r.reporter_id] || null,
    owner: r.listings?.user_id ? byId[r.listings.user_id] || null : null,
  }))
  return { reports, error: null }
}

// Dismisses a single report without touching the listing (e.g. it turned out
// to be unfounded) — other reports on the same listing, if any, are untouched.
export async function dismissListingReport(reportId: string) {
  const admin = await verifyAdmin('listings.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('listing_reports').delete().eq('id', reportId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Deletes the reported listing outright ("ban"). listing_reports.listing_id
// is ON DELETE CASCADE, so every report on it (from any reporter) is cleaned
// up automatically — no separate cleanup needed here.
export async function deleteReportedListing(listingId: string) {
  const admin = await verifyAdmin('listings.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('listings').delete().eq('id', listingId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Kumano del Giorno — coda di moderazione. Una storia entra in rotazione
// (dashboard, /spotlight, home) solo da approvata; il trigger DB la rimette
// pending a ogni modifica del contenuto, quindi qui arrivano sia le nuove
// sia quelle modificate. Stesso permesso della Bacheca annunci: è
// moderazione di contenuti della community.
export async function listSpotlightProfilesForModeration() {
  const admin = await verifyAdmin('listings.read')
  if (!admin) return { profiles: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('spotlight_profiles')
    .select('id, user_id, display_name, city, country, profession, story, story_locale, is_opted_in, show_on_home, moderation_status, updated_at')
    .order('moderation_status', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(300)

  if (error) return { profiles: [], error: error.message }
  const rows = data || []

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const profiles = userIds.length
    ? (await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', userIds)).data
    : []
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

  return { profiles: rows.map((r) => ({ ...r, owner: byId[r.user_id] || null })), error: null }
}

export async function moderateSpotlightProfile(profileId: string, status: SpotlightModerationStatus) {
  const admin = await verifyAdmin('listings.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('spotlight_profiles').update({ moderation_status: status }).eq('id', profileId)
  if (error) return { success: false, error: error.message }

  // Un rifiuto deve sparire subito anche dalla landing cachata.
  updateTag(SPOTLIGHT_HOME_CACHE_TAG)
  return { success: true }
}

// Elenco utenti per il pannello admin (email inclusa): le colonne personali
// non sono più leggibili dal browser, nemmeno dagli admin.
export async function adminListUsers() {
  const admin = await verifyAdmin('users.read')
  if (!admin) return { users: [], error: 'Non autorizzato' }
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('id, first_name, last_name, email, referral_code, subscription_status, is_blocked, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return { users: [], error: error.message }
  return { users: data || [], error: null }
}

// Profilo completo di un utente per la modifica dal pannello admin.
export async function adminGetProfile(userId: string) {
  const admin = await verifyAdmin('users.read')
  if (!admin) return { profile: null, error: 'Non autorizzato' }
  const { data, error } = await getServiceClient().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) return { profile: null, error: error.message }
  return { profile: data, error: null }
}
