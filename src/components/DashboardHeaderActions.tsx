'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions/logout'
import { 
  Hand, 
  Settings, 
  LogOut, 
  User 
} from 'lucide-react'
import ProfileModal from './ProfileModal'

type DashboardHeaderActionsProps = {
  user: any
  profile: any
  isAdmin: boolean
}

export default function DashboardHeaderActions({ user, profile, isAdmin }: DashboardHeaderActionsProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  
  const userInitial = profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Icona Profilo e Nome */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
          title="Modifica profilo"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
            {userInitial.toUpperCase()}
          </div>
          <span className="text-sm text-gray-700 font-medium hidden sm:block">
            {profile?.first_name || 'Il mio profilo'}
          </span>
        </button>

        {/* Pulsante Pannello Admin (Visibile solo agli admin) */}
        {isAdmin && (
          <Link 
            href="/admin" 
            className="text-sm text-white bg-red-600 hover:bg-red-700 font-medium transition-colors flex items-center gap-1 px-3 py-1.5 rounded-md shadow-sm"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Pannello Admin</span>
          </Link>
        )}
        
        {/* Pulsante di Logout */}
        <form action={logout} className="inline">
          <button 
            type="submit" 
            className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-md"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </form>
      </div>

      {/* Modale Profilo */}
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialData={profile}
        userId={user.id}
      />
    </>
  )
}