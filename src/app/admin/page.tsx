import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers' // ✅ Aggiunto per leggere la lingua corrente
import { getAdminPermissions } from '@/lib/admin-auth'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  // ✅ 1. Leggi il cookie della lingua impostato da next-intl
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'it' // Fallback a 'it'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // ✅ 2. Reindirizza al login con la lingua corretta se non è loggato
  if (!user) redirect(`/${locale}/login`)

  const permissions = await getAdminPermissions()
  
  // ✅ 3. Reindirizza alla dashboard con la lingua corretta se non ha permessi
  if (permissions.length === 0) {
    redirect(`/${locale}/dashboard`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          
          {/* ✅ 4. Il link ora include dinamicamente la lingua (es. /it/dashboard) */}
          <Link 
            href={`/${locale}/dashboard`} 
            className="text-lg font-medium text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2"
          >
            ← Torna alla Dashboard
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile?.first_name} {profile?.last_name}
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              ADMIN
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard 
          userId={user.id}
          permissions={permissions}
          userName={`${profile?.first_name} ${profile?.last_name}`}
        />
      </main>
    </div>
  )
}