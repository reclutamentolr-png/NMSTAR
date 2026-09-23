'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Permission } from '@/lib/admin-permissions'
import type { LocalizedText, AdminMessageRow, MessageType } from '@/lib/adminMessages'

const getServiceClient = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

// Mirrors verifyAdmin() in src/app/actions/admin.ts — kept as a private
// copy here (rather than importing from that file) since a 'use server'
// module may only export async functions, and duplicating ~25 lines of
// this specific check is safer than reshaping the existing admin actions
// file just to share it.
async function verifyAdmin(requiredPermission?: Permission) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

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

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function createAdminMessage(
  type: MessageType,
  targetUserId: string | null,
  title: LocalizedText,
  body: LocalizedText
): Promise<ActionResult<{ id: string }>> {
  const admin = await verifyAdmin('messages.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  if (type === 'individual' && !targetUserId) {
    return { success: false, error: 'Seleziona un destinatario per un messaggio individuale.' }
  }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('admin_messages')
    .insert({
      type,
      target_user_id: type === 'individual' ? targetUserId : null,
      title,
      body,
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[AdminMessages] createAdminMessage failed:', error)
    return { success: false, error: error?.message || 'Errore durante la creazione del messaggio.' }
  }

  return { success: true, data: { id: data.id } }
}

export async function listAdminMessages(): Promise<{ messages: AdminMessageRow[]; error: string | null }> {
  const admin = await verifyAdmin('messages.read')
  if (!admin) return { messages: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('admin_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { messages: [], error: error.message }
  return { messages: data || [], error: null }
}

export async function toggleAdminMessageActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const admin = await verifyAdmin('messages.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('admin_messages').update({ is_active: isActive }).eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function deleteAdminMessage(id: string): Promise<ActionResult<null>> {
  const admin = await verifyAdmin('messages.write')
  if (!admin) return { success: false, error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { error } = await supabaseAdmin.from('admin_messages').delete().eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

/** Users searchable when picking a recipient for an individual message. */
export async function listMessageableUsers(): Promise<{ users: { id: string; first_name: string; last_name: string; email: string }[]; error: string | null }> {
  const admin = await verifyAdmin('messages.read')
  if (!admin) return { users: [], error: 'Non autorizzato' }

  const supabaseAdmin = getServiceClient()
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email')
    .order('first_name')
    .limit(1000)

  if (error) return { users: [], error: error.message }
  return { users: data || [], error: null }
}
