import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminPermissions, hasPermission } from '@/lib/admin-auth'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const permissions = await getAdminPermissions()
  
  if (permissions.length === 0) {
    redirect('/dashboard')
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
          <Link href="/dashboard" className="text-lg font-medium text-gray-600 hover:text-indigo-600 transition-colors">
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