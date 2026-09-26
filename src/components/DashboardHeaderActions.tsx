'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from '@/components/LocalizedLink' // ✅ CAMBIATO: usa LocalizedLink invece di next/link
import { logout } from '@/app/actions/logout'
import {
  Hand,
  Settings,
  LogOut,
  User,
  Wallet
} from 'lucide-react'
import ProfileModal from './ProfileModal'

type DashboardHeaderActionsProps = {
  user: any
  profile: any
  isAdmin: boolean
}

export default function DashboardHeaderActions({ user, profile, isAdmin }: DashboardHeaderActionsProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const t = useTranslations('dashboard')
  // Profilo ancora da completare (data di nascita provvisoria): pallino arancione.
  const profileIncomplete = profile?.date_of_birth === '2000-01-01'
  
  const userInitial = profile?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Icona Profilo e Nome */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors group"
          title={profileIncomplete ? t('completeProfileShort') : 'Modifica profilo'}
        >
          <div className="relative w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
            {userInitial.toUpperCase()}
            {profileIncomplete && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--ink)] bg-orange-500" />
            )}
          </div>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-sm text-[var(--gold-bright)] font-medium">{profile?.first_name || 'Il mio profilo'}</span>
            {profileIncomplete && <span className="block text-[10px] font-semibold text-orange-400">{t('completeProfileShort')}</span>}
          </span>
        </button>

        {/* Pulsante My Wallet */}
        <Link
          href="/wallet"
          className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 font-medium transition-colors flex items-center gap-1 px-3 py-1.5 rounded-md shadow-sm"
        >
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">Il mio Wallet</span>
        </Link>

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
