import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { ArrowLeft, Shield } from 'lucide-react'
import AdminDashboard from '@/components/AdminDashboard'
import { Permission } from '@/lib/admin-permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  // ✅ CONTROLLO DOPPIO: sia profiles.is_admin sia admin_users
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, first_name, last_name')
    .eq('id', user.id)
    .single()
  
  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('role_id, admin_roles!inner(permissions)')
    .eq('user_id', user.id)
    .single()

  // Se NON è admin in nessuno dei due modi → redirect alla dashboard (SENZA logout)
  const isAdmin = profile?.is_admin || adminRecord
  
  if (!isAdmin) {
    console.log('⚠️ Utente non admin:', user.id)
    redirect(`/${locale}/dashboard`)
  }
  
  // Estrai i permessi (se esistono)
  const permissions: Permission[] = adminRecord?.admin_roles?.permissions || []
  const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Torna alla Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Pannello Amministratore</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard 
          userId={user.id}
          permissions={permissions}
          userName={userName}
          locale={locale}
        />
      </main>
    </div>
  )
}