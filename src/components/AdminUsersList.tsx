'use client'

import { useState } from 'react'
import { impersonateUser } from '@/app/actions/admin'
import AdminUserEditor from './AdminUserEditor'
import { Edit, UserCog, Mail, Calendar, Shield, Crown } from 'lucide-react'

type AdminUsersListProps = {
  users: any[]
}

export default function AdminUsersList({ users }: AdminUsersListProps) {
  const [editingUser, setEditingUser] = useState<any>(null)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  const handleImpersonate = async (userId: string) => {
    if (!confirm('Vuoi accedere come questo utente? Verrai disconnesso dal tuo account e loggato come l\'utente selezionato.')) return
    
    setImpersonating(userId)
    const result = await impersonateUser(userId)
    
    if (result.success && result.hashed_token) {
      // Apri il magic link in una nuova finestra
      const magicLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify?token=${result.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent('/it/dashboard')}`
      window.open(magicLink, '_blank')
    } else {
      alert('Errore: ' + (result.error || 'Impossibile impersonificare'))
    }
    setImpersonating(null)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Utente</th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Referral</th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Ruolo</th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Punti</th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Iscritto</th>
                <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        user.is_admin ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                      }`}>
                        <span className="text-white font-bold text-sm">
                          {user.first_name?.[0]}{user.last_name?.[0] || ''}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          {user.first_name || '—'} {user.last_name || ''}
                          {user.is_admin && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="text-xs text-gray-500">@{user.username || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{user.referral_code || '—'}</code>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Utente</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-indigo-600">{user.daily_points || 0}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        Modifica
                      </button>
                      <button
                        onClick={() => handleImpersonate(user.id)}
                        disabled={impersonating === user.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <UserCog className="w-3 h-3" />
                        {impersonating === user.id ? '...' : 'Impersonifica'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <AdminUserEditor user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </>
  )
}