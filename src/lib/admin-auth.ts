import { createClient } from '@/lib/supabase/server'

export type Permission = 
  | '*' 
  | 'users.read' | 'users.write' | 'users.delete'
  | 'matrix.read' | 'matrix.write'
  | 'marketplace.read' | 'marketplace.write'
  | 'stats.read'
  | 'support.read' | 'support.write'
  | 'settings.read' | 'settings.write'

export async function getAdminPermissions(): Promise<Permission[]> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return []
    }

    // ✅ FIX: Usa .maybeSingle() invece di .single()
    // .maybeSingle() restituisce null se non trova righe, invece di lanciare errore
    const { data: adminUser, error: queryError } = await supabase
      .from('admin_users')
      .select('role_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Se c'è un errore (diverso da "nessuna riga"), loggalo
    if (queryError && queryError.code !== 'PGRST116') {
      console.error(' Errore query admin_users:', queryError)
      return []
    }

    // Se l'utente non è admin (nessuna riga trovata), ritorna array vuoto
    if (!adminUser) {
      return []
    }

    // ✅ FIX: Anche qui usa .maybeSingle()
    const { data: roleData, error: roleError } = await supabase
      .from('admin_roles')
      .select('name, permissions')
      .eq('id', adminUser.role_id)
      .maybeSingle()

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('❌ Errore query admin_roles:', roleError)
      return []
    }

    if (!roleData) {
      return []
    }

    const permissions = roleData.permissions || []
    
    if (permissions.includes('*')) {
      return ['*']
    }

    return permissions as Permission[]
  } catch (error) {
    console.error('❌ Errore generico in getAdminPermissions:', error)
    return []
  }
}

export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  if (userPermissions.includes('*')) return true
  return userPermissions.includes(requiredPermission)
}

export async function isAdmin(): Promise<boolean> {
  const permissions = await getAdminPermissions()
  return permissions.length > 0
}