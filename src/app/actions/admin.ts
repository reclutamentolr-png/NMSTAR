'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Permission } from '@/lib/admin-permissions'

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
