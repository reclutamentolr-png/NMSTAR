'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Permission } from '@/lib/admin-permissions'
import { generateShortCode } from '@/lib/shortLink'

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

export async function getAllUsers() {
  const admin = await verifyAdmin('users.read')
  if (!admin) return { users: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const supabase = await createClient()

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return { users: [], error: error.message }

  const enrichedUsers = await Promise.all(
    users.map(async (u) => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        ...prof
      }
    })
  )

  return { users: enrichedUsers, error: null }
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
  // separately and merge (same pattern as getAllUsers() above).
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
    .select('id, reward_id, user_id, points_spent, redeemed_at, fulfilled_at, reward_catalog(title)')
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

export async function markRewardFulfilled(redemptionId: string) {
  const admin = await verifyAdmin('rewards.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin
    .from('reward_redemptions')
    .update({ fulfilled_at: new Date().toISOString() })
    .eq('id', redemptionId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
