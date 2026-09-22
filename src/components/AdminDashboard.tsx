'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasPermission, Permission } from '@/lib/admin-permissions'
import MatrixTree from '@/components/MatrixTree'
import {
  adminUpdateProfile,
  impersonateUser,
  createCoupon,
  listCoupons,
  revokeCoupon,
  listVouchers,
  revokeVoucher,
  createReward,
  updateReward,
  listRewards,
  deleteReward,
  listRewardRedemptions,
  markRewardFulfilled,
} from '@/app/actions/admin'
import { DASHBOARD_LAYOUTS, DEFAULT_DASHBOARD_LAYOUT } from '@/lib/dashboardLayouts'
import {
  LayoutDashboard,
  Users,
  GitBranch,
  ShoppingBag,
  Settings,
  TrendingUp,
  UserCheck,
  Activity,
  Lock,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  Eye,
  Pencil,
  UserCog,
  Ticket,
  Trash2,
  BadgeCheck,
  Gift
} from 'lucide-react'

type AdminDashboardProps = {
  userId: string
  permissions: Permission[]
  userName: string
  locale: string // ✅ AGGIUNTO: necessario per costruire il redirect URL
}

export default function AdminDashboard({ userId, permissions, userName, locale }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const supabase = createClient()

  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalNodes: 0, blockedUsers: 0 })
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [userCurrentRoleId, setUserCurrentRoleId] = useState<string>('none')
  const [isSaving, setIsSaving] = useState(false)

  const [matrixUsers, setMatrixUsers] = useState<any[]>([])
  const [selectedMatrixUserId, setSelectedMatrixUserId] = useState<string>('')
  const [matrixData, setMatrixData] = useState<any>(null)
  const [matrixDescendants, setMatrixDescendants] = useState<any[]>([])
  const [matrixStats, setMatrixStats] = useState({ total: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 })
  const [loadingMatrix, setLoadingMatrix] = useState(false)

  const [marketplaceTools, setMarketplaceTools] = useState<any[]>([])
  const [marketplaceUsage, setMarketplaceUsage] = useState<any[]>([])
  const [savingTool, setSavingTool] = useState<string | null>(null)

  const [profileEditUser, setProfileEditUser] = useState<any>(null)
  const [profileForm, setProfileForm] = useState<any>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)

  const [couponUsers, setCouponUsers] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [couponForm, setCouponForm] = useState({ userId: '', title: '', description: '', expiresAt: '' })
  const [savingCoupon, setSavingCoupon] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const [vouchers, setVouchers] = useState<any[]>([])
  const [loadingVouchers, setLoadingVouchers] = useState(false)

  const [rewards, setRewards] = useState<any[]>([])
  const [rewardRedemptions, setRewardRedemptions] = useState<any[]>([])
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [rewardForm, setRewardForm] = useState({ title: '', description: '', imageUrl: '', pointsCost: '', isVisible: true })
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
  const [savingReward, setSavingReward] = useState(false)
  const [rewardError, setRewardError] = useState<string | null>(null)

  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({
    maintenance_mode: false,
    maintenance_message: 'Sito in manutenzione. Torna presto!',
    dashboard_layout: DEFAULT_DASHBOARD_LAYOUT
  })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (activeSection === 'overview') {
      loadStats()
      loadOnlineUsers()
      const interval = setInterval(loadOnlineUsers, 30000)
      return () => clearInterval(interval)
    }
    else if (activeSection === 'users') loadUsers()
    else if (activeSection === 'matrix') loadMatrixUsers()
    else if (activeSection === 'marketplace') loadMarketplaceData()
    else if (activeSection === 'coupons') loadCouponsData()
    else if (activeSection === 'vouchers') loadVouchersData()
    else if (activeSection === 'rewards') loadRewardsData()
    else if (activeSection === 'settings') loadSystemSettings()
  }, [activeSection])

  const loadStats = async () => {
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: activeUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('is_blocked', false)
    const { count: totalNodes } = await supabase.from('matrix_nodes').select('*', { count: 'exact', head: true })
    const { count: blockedUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_blocked', true)
    setStats({ totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, totalNodes: totalNodes || 0, blockedUsers: blockedUsers || 0 })
  }

  const loadOnlineUsers = async () => {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', fifteenMinutesAgo)
      setOnlineUsers(count || 0)
    } catch (error) {
      console.error('Errore caricamento utenti online:', error)
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, email, referral_code, subscription_status, is_blocked, created_at').order('created_at', { ascending: false }).limit(100)
    if (data) setUsers(data)
    setLoadingUsers(false)
  }

  const loadMatrixUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, referral_code').order('first_name').limit(500)
    if (data) setMatrixUsers(data)
  }

  const loadMatrixForUser = async (targetUserId: string) => {
    if (!targetUserId) {
      setMatrixData(null)
      setMatrixDescendants([])
      setMatrixStats({ total: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 })
      return
    }
    setLoadingMatrix(true)
    setSelectedMatrixUserId(targetUserId)
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetUserId).single()
      const { data: userNode } = await supabase.from('matrix_nodes').select('*').eq('user_id', targetUserId).single()
      const { data: downlineData } = await supabase.rpc('get_user_downline', { p_user_id: targetUserId, p_max_depth: 5 })

      const correctRootId = userNode?.id || (downlineData && downlineData.length > 0 ? downlineData[0].parent_id : `root-${targetUserId}`)

      const rootNode = {
        id: correctRootId,
        user_id: targetUserId,
        parent_id: userNode?.parent_id || null,
        path: userNode?.path || 'root',
        level: userNode?.level || 1,
        position: userNode?.position || 1,
        depth: userNode?.depth || 0,
        created_at: userNode?.created_at || new Date().toISOString(),
        username: profile?.username,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        referral_code: profile?.referral_code,
        country_code: profile?.country_code
      }

      setMatrixData(rootNode)
      setMatrixDescendants(downlineData || [])
      setMatrixStats({
        total: downlineData?.length || 0,
        level1: downlineData?.filter((d: any) => d.depth === 1).length || 0,
        level2: downlineData?.filter((d: any) => d.depth === 2).length || 0,
        level3: downlineData?.filter((d: any) => d.depth === 3).length || 0,
        level4: downlineData?.filter((d: any) => d.depth === 4).length || 0,
        level5: downlineData?.filter((d: any) => d.depth === 5).length || 0,
      })
    } catch (error) {
      console.error('Errore caricamento matrice:', error)
    } finally {
      setLoadingMatrix(false)
    }
  }

  const viewUserMatrix = (user: any) => {
    setActiveSection('matrix')
    setTimeout(() => {
      setSelectedMatrixUserId(user.id)
      loadMatrixForUser(user.id)
    }, 100)
  }

  const loadMarketplaceData = async () => {
    const { data: tools } = await supabase.from('marketplace_settings').select('*').order('tool_name')
    const toolsList = tools || []
    setMarketplaceTools(toolsList)

    const { data: usageRaw } = await supabase.from('marketplace_usage').select('tool_name')
    const usageCount: Record<string, number> = {}
    usageRaw?.forEach((u: any) => {
      usageCount[u.tool_name] = (usageCount[u.tool_name] || 0) + 1
    })
    setMarketplaceUsage(
      toolsList.map(t => ({
        ...t,
        usage_count: usageCount[t.tool_name] || 0
      }))
    )
  }

  const loadCouponsData = async () => {
    setLoadingCoupons(true)
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, referral_code')
      .order('first_name')
      .limit(500)
    setCouponUsers(usersData || [])

    const result = await listCoupons()
    setCoupons(result.coupons)
    setLoadingCoupons(false)
  }

  const handleCreateCoupon = async () => {
    setCouponError(null)
    if (!couponForm.userId || !couponForm.title.trim()) {
      setCouponError('Seleziona un utente e inserisci un titolo.')
      return
    }
    setSavingCoupon(true)
    const result = await createCoupon({
      userId: couponForm.userId,
      title: couponForm.title,
      description: couponForm.description,
      expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null,
    })
    setSavingCoupon(false)
    if (!result.success) {
      setCouponError(result.error || 'Errore durante la creazione del coupon.')
      return
    }
    setCouponForm({ userId: '', title: '', description: '', expiresAt: '' })
    await loadCouponsData()
  }

  const handleRevokeCoupon = async (couponId: string) => {
    if (!confirm('Revocare questo coupon? L\'operazione non è reversibile.')) return
    const result = await revokeCoupon(couponId)
    if (result.success) {
      setCoupons((prev) => prev.filter((c) => c.id !== couponId))
    } else {
      alert(result.error || 'Errore durante la revoca del coupon.')
    }
  }

  const loadVouchersData = async () => {
    setLoadingVouchers(true)
    const result = await listVouchers()
    setVouchers(result.vouchers)
    setLoadingVouchers(false)
  }

  const handleRevokeVoucher = async (voucherId: string) => {
    if (!confirm('Revocare questo voucher? Solo i voucher non ancora riscattati possono essere revocati.')) return
    const result = await revokeVoucher(voucherId)
    if (result.success) {
      setVouchers((prev) => prev.map((v) => (v.id === voucherId ? { ...v, status: 'revoked' } : v)))
    } else {
      alert(result.error || 'Errore durante la revoca del voucher.')
    }
  }

  const loadRewardsData = async () => {
    setLoadingRewards(true)
    const [rewardsResult, redemptionsResult] = await Promise.all([listRewards(), listRewardRedemptions()])
    setRewards(rewardsResult.rewards)
    setRewardRedemptions(redemptionsResult.redemptions)
    setLoadingRewards(false)
  }

  const resetRewardForm = () => {
    setRewardForm({ title: '', description: '', imageUrl: '', pointsCost: '', isVisible: true })
    setEditingRewardId(null)
  }

  const handleEditReward = (reward: any) => {
    setEditingRewardId(reward.id)
    setRewardForm({
      title: reward.title,
      description: reward.description || '',
      imageUrl: reward.image_url || '',
      pointsCost: String(reward.points_cost),
      isVisible: reward.is_visible,
    })
  }

  const handleSaveReward = async () => {
    setRewardError(null)
    const pointsCost = parseInt(rewardForm.pointsCost, 10)
    if (!rewardForm.title.trim() || !pointsCost || pointsCost <= 0) {
      setRewardError('Titolo e Punti Rete (> 0) sono obbligatori.')
      return
    }
    setSavingReward(true)
    const payload = {
      title: rewardForm.title,
      description: rewardForm.description,
      imageUrl: rewardForm.imageUrl,
      pointsCost,
      isVisible: rewardForm.isVisible,
    }
    const result = editingRewardId ? await updateReward(editingRewardId, payload) : await createReward(payload)
    setSavingReward(false)
    if (!result.success) {
      setRewardError(result.error || 'Errore durante il salvataggio del premio.')
      return
    }
    resetRewardForm()
    await loadRewardsData()
  }

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Eliminare questo premio? Possibile solo se non è mai stato riscattato.')) return
    const result = await deleteReward(rewardId)
    if (result.success) {
      setRewards((prev) => prev.filter((r) => r.id !== rewardId))
    } else {
      alert(result.error || 'Errore durante l\'eliminazione del premio.')
    }
  }

  const handleMarkFulfilled = async (redemptionId: string) => {
    const result = await markRewardFulfilled(redemptionId)
    if (result.success) {
      setRewardRedemptions((prev) =>
        prev.map((r) => (r.id === redemptionId ? { ...r, fulfilled_at: new Date().toISOString() } : r))
      )
    } else {
      alert(result.error || 'Errore durante l\'aggiornamento.')
    }
  }

  const toggleToolEnabled = async (toolName: string, currentStatus: boolean) => {
    setSavingTool(toolName)
    const { error } = await supabase.from('marketplace_settings').update({ is_enabled: !currentStatus, updated_at: new Date().toISOString() }).eq('tool_name', toolName)
    if (!error) {
      await loadMarketplaceData()
    } else {
      alert('Errore durante l\'aggiornamento')
    }
    setSavingTool(null)
  }

  const loadSystemSettings = async () => {
    const { data } = await supabase.from('system_settings').select('key, value')
    if (data) {
      const settingsObj: Record<string, any> = { ...systemSettings }
      data.forEach((s: any) => {
        try {
          settingsObj[s.key] = JSON.parse(s.value)
        } catch {
          settingsObj[s.key] = s.value
        }
      })
      setSystemSettings(settingsObj)
    }
  }

  const saveSystemSettings = async () => {
    setSavingSettings(true)
    try {
      const rows = Object.entries(systemSettings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value)
      }))
      for (const row of rows) {
        await supabase.from('system_settings').upsert(row, { onConflict: 'key' })
      }
      alert('✅ Impostazioni salvate con successo!')
    } catch (error) {
      alert('❌ Errore durante il salvataggio')
    }
    setSavingSettings(false)
  }

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openManageModal = async (user: any) => {
    setSelectedUser(user)
    setIsModalOpen(true)
    const { data: roles } = await supabase.from('admin_roles').select('id, name').order('name')
    setAvailableRoles(roles || [])
    const { data: adminRecord } = await supabase.from('admin_users').select('role_id').eq('user_id', user.id).single()
    setUserCurrentRoleId(adminRecord?.role_id || 'none')
  }

  const handleSaveUserManagement = async () => {
    if (!selectedUser) return
    setIsSaving(true)
    try {
      if (userCurrentRoleId === 'none') {
        await supabase.from('admin_users').delete().eq('user_id', selectedUser.id)
      } else {
        await supabase.from('admin_users').upsert({
          user_id: selectedUser.id,
          role_id: userCurrentRoleId,
          assigned_by: userId,
          notes: 'Assegnato da Pannello Admin'
        }, { onConflict: 'user_id' })
      }
      await loadUsers()
      setIsModalOpen(false)
      setSelectedUser(null)
      alert('✅ Utente aggiornato con successo!')
    } catch (error) {
      alert('❌ Errore durante il salvataggio.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleBlock = async (user: any) => {
    if (!confirm(`Sei sicuro di voler ${user.is_blocked ? 'SBLOCCARE' : 'BLOCCARE'} l'utente ${user.email}?`)) return
    const newBlockedStatus = !user.is_blocked
    const { error } = await supabase.from('profiles').update({ is_blocked: newBlockedStatus }).eq('id', user.id)
    if (!error) {
      await loadUsers()
      alert(`✅ Utente ${newBlockedStatus ? 'bloccato' : 'sbloccato'} con successo.`)
    } else {
      alert('❌ Errore durante l\'aggiornamento.')
    }
  }

  const openProfileEdit = async (user: any) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfileEditUser(data)
      setProfileForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        username: data.username || '',
        phone: data.phone || '',
        country_code: data.country_code || '',
        date_of_birth: data.date_of_birth === '2000-01-01' ? '' : (data.date_of_birth || ''),
        occupation: data.occupation || '',
        referral_code: data.referral_code || '',
        daily_points: data.daily_points || 0,
        subscription_status: data.subscription_status || 'free',
        subscription_expires_at: data.subscription_expires_at ? data.subscription_expires_at.slice(0, 10) : '',
        is_admin: data.is_admin || false
      })
    }
  }

  const handleSaveProfile = async () => {
    if (!profileEditUser) return
    setSavingProfile(true)
    const result = await adminUpdateProfile(profileEditUser.id, {
      ...profileForm,
      date_of_birth: profileForm.date_of_birth || '2000-01-01',
      // Un abbonamento "Active" senza scadenza resta attivo per sempre
      // (isActiveSubscription tratta null come "nessuna scadenza") — qui
      // convertiamo la data scelta in ISO, o null se lasciata vuota
      // intenzionalmente (es. account interni/di staff).
      subscription_expires_at: profileForm.subscription_expires_at
        ? new Date(profileForm.subscription_expires_at).toISOString()
        : null
    })
    if (result.success) {
      alert('✅ Profilo aggiornato con successo!')
      setProfileEditUser(null)
      await loadUsers()
    } else {
      alert('❌ Errore: ' + (result.error || 'Impossibile aggiornare'))
    }
    setSavingProfile(false)
  }

    // ✅ IMPERSONIFICAZIONE: stessa scheda + link di ripristino admin
  const handleImpersonate = async (user: any) => {
    if (!confirm(`Vuoi impersonare ${user.first_name} ${user.last_name}?\n\nVerrai loggato come questo utente.\nPotrai tornare al tuo account admin in qualsiasi momento con il pulsante "Torna Admin" del banner giallo.`)) return

    setImpersonatingId(user.id)
    try {
      const result = await impersonateUser(user.id)

      if (result.success && result.targetUrl && result.adminRestoreUrl) {
        // ✅ Salva il link di ripristino admin prima di cambiare sessione
        localStorage.setItem('impersonation_restore', result.adminRestoreUrl)
        localStorage.setItem('impersonatingAdmin', userId)

        // ✅ Naviga al magic link dell'utente target (stessa scheda)
        window.location.href = result.targetUrl
      } else {
        alert('Errore: ' + (result.error || 'Impossibile impersonificare'))
        setImpersonatingId(null)
      }
    } catch (err: any) {
      alert('Errore: ' + (err.message || 'Errore sconosciuto'))
      setImpersonatingId(null)
    }
  }

  const menuItems = [
  { id: 'overview', label: 'Panoramica', Icon: LayoutDashboard, permission: 'stats.read' as Permission },
  { id: 'users', label: 'Utenti', Icon: Users, permission: 'users.read' as Permission },
  { id: 'matrix', label: 'Matrice', Icon: GitBranch, permission: 'matrix.read' as Permission },
  { id: 'marketplace', label: 'Marketplace', Icon: ShoppingBag, permission: 'marketplace.read' as Permission },
  { id: 'coupons', label: 'Coupon', Icon: Ticket, permission: 'coupons.read' as Permission },
  { id: 'vouchers', label: 'Voucher', Icon: BadgeCheck, permission: 'vouchers.read' as Permission },
  { id: 'rewards', label: 'Premi', Icon: Gift, permission: 'rewards.read' as Permission },
  { id: 'settings', label: 'Impostazioni', Icon: Settings, permission: 'settings.read' as Permission },
]

  const availableMenuItems = menuItems.filter(item => hasPermission(permissions, item.permission))

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Benvenuto, {userName.split(' ')[0]}!</h2>
        <p className="text-indigo-100">Ecco lo stato attuale della tua piattaforma Kumani.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wide">
            <Users className="w-4 h-4" />
            Utenti Totali
          </div>
          <div className="text-4xl font-bold text-indigo-600 mt-2">{stats.totalUsers}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wide">
            <UserCheck className="w-4 h-4" />
            Abbonamenti Attivi
          </div>
          <div className="text-4xl font-bold text-green-600 mt-2">{stats.activeUsers}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wide">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Activity className="w-4 h-4" />
            Online Ora
          </div>
          <div className="text-4xl font-bold text-green-600 mt-2">{onlineUsers}</div>
          <div className="text-xs text-gray-400 mt-1">Ultimi 15 min</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wide">
            <GitBranch className="w-4 h-4" />
            Nodi Matrice
          </div>
          <div className="text-4xl font-bold text-orange-600 mt-2">{stats.totalNodes}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wide">
            <Lock className="w-4 h-4" />
            Utenti Bloccati
          </div>
          <div className="text-4xl font-bold text-red-600 mt-2">{stats.blockedUsers}</div>
        </div>
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7" />
          Gestione Utenti
        </h2>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cerca per nome, email o codice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Users className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loadingUsers ? (
          <div className="p-8 text-center text-gray-500">Caricamento...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nessun utente trovato.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Utente</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Codice</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.is_blocked ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                      {user.is_blocked && <span className="text-xs text-red-600 font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> BLOCCATO</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm font-mono text-indigo-600">{user.referral_code}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.subscription_status === 'active' && !user.is_blocked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.is_blocked ? 'Bloccato' : (user.subscription_status === 'active' ? 'Attivo' : 'Free')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openProfileEdit(user)} className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1">
                        <Pencil className="w-4 h-4" /> Modifica
                      </button>
                      <button onClick={() => handleImpersonate(user)} disabled={impersonatingId === user.id} className="text-purple-600 hover:text-purple-800 text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50">
                        <UserCog className="w-4 h-4" /> {impersonatingId === user.id ? '...' : 'Impersonifica'}
                      </button>
                      <button onClick={() => viewUserMatrix(user)} className="text-purple-600 hover:text-purple-800 text-sm font-medium inline-flex items-center gap-1">
                        <Eye className="w-4 h-4" /> Matrice
                      </button>
                      <button onClick={() => handleToggleBlock(user)} className={`text-sm font-medium inline-flex items-center gap-1 ${user.is_blocked ? 'text-green-600' : 'text-red-600'}`}>
                        {user.is_blocked ? <><Lock className="w-4 h-4" /> Sblocca</> : <><Lock className="w-4 h-4" /> Blocca</>}
                      </button>
                      <button onClick={() => openManageModal(user)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Ruolo</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  const renderMatrix = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <GitBranch className="w-7 h-7" />
        Visualizzatore Matrice
      </h2>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona un utente:</label>
        <select value={selectedMatrixUserId} onChange={(e) => loadMatrixForUser(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg">
          <option value="">-- Seleziona --</option>
          {matrixUsers.map(u => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.referral_code})</option>
          ))}
        </select>
      </div>

      {loadingMatrix ? (
        <div className="bg-white p-12 rounded-xl border text-center text-gray-500">⏳ Caricamento...</div>
      ) : !matrixData ? (
        <div className="bg-white p-12 rounded-xl border text-center text-gray-500">
          <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Seleziona un utente per visualizzare la sua matrice</p>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-purple-100 text-sm">Matrice di</p>
                <h3 className="text-2xl font-bold">{matrixData.first_name} {matrixData.last_name}</h3>
                <p className="text-purple-100 text-sm mt-1">Codice: <span className="font-mono font-bold text-white">{matrixData.referral_code}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border text-center"><div className="text-xs text-gray-500 uppercase">Totale</div><div className="text-2xl font-bold text-indigo-600">{matrixStats.total}</div></div>
            <div className="bg-white p-4 rounded-xl border text-center"><div className="text-xs text-gray-500 uppercase">Livello 1</div><div className="text-2xl font-bold text-green-600">{matrixStats.level1}</div></div>
            <div className="bg-white p-4 rounded-xl border text-center"><div className="text-xs text-gray-500 uppercase">Livello 2</div><div className="text-2xl font-bold text-blue-600">{matrixStats.level2}</div></div>
            <div className="bg-white p-4 rounded-xl border text-center"><div className="text-xs text-gray-500 uppercase">Livello 3</div><div className="text-2xl font-bold text-purple-600">{matrixStats.level3}</div></div>
            <div className="bg-white p-4 rounded-xl border text-center"><div className="text-xs text-gray-500 uppercase">Livello 4</div><div className="text-2xl font-bold text-orange-600">{matrixStats.level4}</div></div>
            <div className="bg-white p-4 rounded-xl border text-center"><div className="text-xs text-gray-500 uppercase">Livello 5</div><div className="text-2xl font-bold text-red-600">{matrixStats.level5}</div></div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Albero Matrice 5xN</h3>
            {matrixDescendants.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <GitBranch className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p>Questa matrice è vuota</p>
              </div>
            ) : (
              <MatrixTree rootNode={matrixData} descendants={matrixDescendants} />
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderMarketplace = () => {
    const filteredTools = marketplaceUsage.filter((tool: any) => tool.tool_name !== 'nfc-smart-hub')

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" />
            Gestione Marketplace
          </h2>
          <p className="text-gray-600 mt-1">Abilita o disabilita gli strumenti per tutti gli utenti</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTools.map((tool: any) => (
            <div key={tool.tool_name} className={`bg-white p-6 rounded-xl border shadow-sm ${!tool.is_enabled ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 capitalize">{tool.tool_name.replace(/-/g, ' ')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{tool.description || 'Strumento del marketplace'}</p>
                </div>
                <button
                  onClick={() => toggleToolEnabled(tool.tool_name, tool.is_enabled)}
                  disabled={savingTool === tool.tool_name}
                  className="focus:outline-none"
                >
                  {tool.is_enabled ? (
                    <ToggleRight className="w-14 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-14 h-8 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Utilizzi Totali</div>
                  <div className="text-2xl font-bold text-indigo-600">{tool.usage_count}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${tool.is_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {tool.is_enabled ? 'ATTIVO' : 'DISATTIVO'}
                </div>
              </div>
              {savingTool === tool.tool_name && (
                <div className="mt-3 text-xs text-indigo-600">💾 Salvataggio...</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderCoupons = () => {
    const now = new Date()
    const statusOf = (c: any) => {
      if (c.redeemed_at) return { label: 'Utilizzato', className: 'bg-gray-100 text-gray-600' }
      if (c.expires_at && new Date(c.expires_at) < now) return { label: 'Scaduto', className: 'bg-red-100 text-red-700' }
      return { label: 'Disponibile', className: 'bg-green-100 text-green-700' }
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-7 h-7" />
            Coupon Wallet
          </h2>
          <p className="text-gray-600 mt-1">Assegna un coupon direttamente a un utente: lo vedrà nel suo My Wallet</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">Nuovo coupon</h3>
          {couponError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{couponError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Utente</label>
              <select
                value={couponForm.userId}
                onChange={(e) => setCouponForm({ ...couponForm, userId: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Seleziona un utente...</option>
                {couponUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} — {u.referral_code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scadenza (opzionale)</label>
              <input
                type="date"
                value={couponForm.expiresAt}
                onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Titolo</label>
              <input
                type="text"
                placeholder="Es. Spedizione gratuita"
                value={couponForm.title}
                onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione (opzionale)</label>
              <textarea
                placeholder="Es. Valido su un ordine dal Marketplace"
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20"
              />
            </div>
          </div>
          <button
            onClick={handleCreateCoupon}
            disabled={savingCoupon}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            <Ticket className="w-4 h-4" />
            {savingCoupon ? 'Creazione...' : 'Crea e assegna coupon'}
          </button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Titolo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Utente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Codice</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Scadenza</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loadingCoupons ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Caricamento...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessun coupon emesso ancora</td></tr>
              ) : (
                coupons.map((c) => {
                  const status = statusOf(c)
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{c.title}</div>
                        {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.profiles?.first_name} {c.profiles?.last_name}
                        <div className="text-xs text-gray-400">{c.profiles?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.code}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevokeCoupon(c.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Revoca coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderVouchers = () => {
    const statusOf = (v: any) => {
      if (v.status === 'redeemed') return { label: 'Riscattato', className: 'bg-gray-100 text-gray-600' }
      if (v.status === 'revoked') return { label: 'Revocato', className: 'bg-red-100 text-red-700' }
      return { label: 'Disponibile', className: 'bg-green-100 text-green-700' }
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BadgeCheck className="w-7 h-7" />
            Voucher Abbonamento
          </h2>
          <p className="text-gray-600 mt-1">
            I Kumani creano questi voucher spendendo 49 punti; solo lettura e revoca qui — la creazione e il riscatto
            avvengono dal My Wallet di ciascun utente.
          </p>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Codice</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Creato da</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Riscattato da</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Creato il</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loadingVouchers ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Caricamento...</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessun voucher creato ancora</td></tr>
              ) : (
                vouchers.map((v) => {
                  const status = statusOf(v)
                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{v.code}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {v.creator?.first_name} {v.creator?.last_name}
                        <div className="text-xs text-gray-400">{v.creator?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {v.redeemed_by ? (
                          <>
                            {v.redeemer?.first_name} {v.redeemer?.last_name}
                            <div className="text-xs text-gray-400">{v.redeemer?.email}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(v.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {v.status === 'active' && (
                          <button
                            onClick={() => handleRevokeVoucher(v.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Revoca voucher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderRewards = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-7 h-7" />
            Catalogo Premi
          </h2>
          <p className="text-gray-600 mt-1">
            Premi riscattabili dai Kumani con i Punti Rete. Un premio già riscattato non può più essere eliminato,
            solo nascosto (disattiva &quot;Visibile&quot;).
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">{editingRewardId ? 'Modifica premio' : 'Nuovo premio'}</h3>
          {rewardError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{rewardError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di Regalo</label>
              <input
                type="text"
                placeholder="Es. Buono Amazon 20€"
                value={rewardForm.title}
                onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Punti Rete necessari</label>
              <input
                type="number"
                min="1"
                placeholder="Es. 294"
                value={rewardForm.pointsCost}
                onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto (URL)</label>
              <input
                type="text"
                placeholder="https://..."
                value={rewardForm.imageUrl}
                onChange={(e) => setRewardForm({ ...rewardForm, imageUrl: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
              <textarea
                placeholder="Descrizione del premio"
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                id="reward-visible"
                checked={rewardForm.isVisible}
                onChange={(e) => setRewardForm({ ...rewardForm, isVisible: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="reward-visible" className="text-sm font-medium text-gray-700">
                Visibile nel Catalogo Premi dei Kumani
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveReward}
              disabled={savingReward}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              <Gift className="w-4 h-4" />
              {savingReward ? 'Salvataggio...' : editingRewardId ? 'Salva modifiche' : 'Crea premio'}
            </button>
            {editingRewardId && (
              <button onClick={resetRewardForm} className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium">
                Annulla
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Premio</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Punti Rete</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Visibile</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loadingRewards ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Caricamento...</td></tr>
              ) : rewards.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nessun premio creato ancora</td></tr>
              ) : (
                rewards.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.title}</div>
                      {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{r.points_cost}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {r.is_visible ? 'Visibile' : 'Nascosto'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEditReward(r)} className="text-indigo-500 hover:text-indigo-700 p-1" title="Modifica">
                        <Pencil className="w-4 h-4 inline" />
                      </button>
                      <button onClick={() => handleDeleteReward(r.id)} className="text-red-500 hover:text-red-700 p-1 ml-1" title="Elimina">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3">Riscatti da evadere</h3>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Premio</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Kumano</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Punti spesi</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Richiesto il</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rewardRedemptions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessun riscatto ancora</td></tr>
                ) : (
                  rewardRedemptions.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{r.reward_catalog?.title}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.redeemer?.first_name} {r.redeemer?.last_name}
                        <div className="text-xs text-gray-400">{r.redeemer?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.points_spent}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(r.redeemed_at).toLocaleDateString('it-IT')}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.fulfilled_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {r.fulfilled_at ? 'Evaso' : 'Da evadere'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!r.fulfilled_at && (
                          <button
                            onClick={() => handleMarkFulfilled(r.id)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Segna come evaso
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          Impostazioni Sistema
        </h2>
        <p className="text-gray-600 mt-1">Configura i parametri globali della piattaforma</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Tipo di Dashboard
          </label>
          <p className="text-xs text-gray-500 mb-3">Scegli quale versione della dashboard vedono tutti gli utenti.</p>
          <div className="space-y-2">
            {DASHBOARD_LAYOUTS.map((layoutOption) => {
              const isSelected = (systemSettings.dashboard_layout || DEFAULT_DASHBOARD_LAYOUT) === layoutOption.id
              return (
                <button
                  key={layoutOption.id}
                  type="button"
                  onClick={() => setSystemSettings({ ...systemSettings, dashboard_layout: layoutOption.id })}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{layoutOption.name}</span>
                    {isSelected && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Attivo</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{layoutOption.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
          <div>
            <div className="font-medium text-red-900">Modalità Manutenzione</div>
            <div className="text-sm text-red-600">Se attiva, gli utenti vedranno un messaggio di manutenzione</div>
          </div>
          <button
            onClick={() => setSystemSettings({...systemSettings, maintenance_mode: !systemSettings.maintenance_mode})}
            className="focus:outline-none"
          >
            {systemSettings.maintenance_mode ? (
              <ToggleRight className="w-14 h-8 text-red-500" />
            ) : (
              <ToggleLeft className="w-14 h-8 text-gray-400" />
            )}
          </button>
        </div>

        {systemSettings.maintenance_mode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio di Manutenzione</label>
            <textarea
              value={systemSettings.maintenance_message || ''}
              onChange={(e) => setSystemSettings({...systemSettings, maintenance_message: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={saveSystemSettings}
            disabled={savingSettings}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingSettings ? 'Salvataggio...' : 'Salva Impostazioni'}
          </button>
        </div>
      </div>
    </div>
  )

  const renderManageModal = () => {
    if (!isModalOpen || !selectedUser) return null
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Gestisci Utente</h3>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo Amministrativo</label>
              <select value={userCurrentRoleId} onChange={(e) => setUserCurrentRoleId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="none">Nessuno (Utente Standard)</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium" disabled={isSaving}>Annulla</button>
            <button onClick={handleSaveUserManagement} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2" disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderProfileEditModal = () => {
    if (!profileEditUser) return null
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setProfileEditUser(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900">Modifica Profilo</h3>
              <p className="text-xs text-gray-500">{profileEditUser.email}</p>
            </div>
            <button onClick={() => setProfileEditUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={profileForm.first_name || ''} onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
              <input type="text" value={profileForm.last_name || ''} onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={profileForm.username || ''} onChange={(e) => setProfileForm({...profileForm, username: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Referral Code</label>
              <input type="text" value={profileForm.referral_code || ''} onChange={(e) => setProfileForm({...profileForm, referral_code: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input type="tel" value={profileForm.phone || ''} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Paese</label>
              <input type="text" value={profileForm.country_code || ''} onChange={(e) => setProfileForm({...profileForm, country_code: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Data di nascita</label>
              <input type="date" value={profileForm.date_of_birth || ''} onChange={(e) => setProfileForm({...profileForm, date_of_birth: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Occupazione</label>
              <input type="text" value={profileForm.occupation || ''} onChange={(e) => setProfileForm({...profileForm, occupation: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Punti giornalieri</label>
              <input type="number" value={profileForm.daily_points || 0} onChange={(e) => setProfileForm({...profileForm, daily_points: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Abbonamento</label>
              <select
                value={profileForm.subscription_status || 'free'}
                onChange={(e) => {
                  const newStatus = e.target.value
                  // Passando ad "Active" senza una scadenza già impostata,
                  // suggerisce +1 anno da oggi (stessa durata del pagamento
                  // reale via Stripe) invece di lasciare l'abbonamento
                  // attivo a vita per errore — l'admin può comunque
                  // cancellare la data se vuole davvero nessuna scadenza.
                  const shouldSuggestExpiry = newStatus === 'active' && !profileForm.subscription_expires_at
                  const suggested = new Date()
                  suggested.setFullYear(suggested.getFullYear() + 1)
                  setProfileForm({
                    ...profileForm,
                    subscription_status: newStatus,
                    subscription_expires_at: shouldSuggestExpiry
                      ? suggested.toISOString().slice(0, 10)
                      : profileForm.subscription_expires_at
                  })
                }}
                className="w-full p-2 border rounded-lg"
              >
                <option value="free">Free</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Scadenza abbonamento</label>
              <input
                type="date"
                value={profileForm.subscription_expires_at || ''}
                onChange={(e) => setProfileForm({...profileForm, subscription_expires_at: e.target.value})}
                className="w-full p-2 border rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">Vuoto = nessuna scadenza (resta attivo per sempre)</p>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_admin" checked={profileForm.is_admin || false} onChange={(e) => setProfileForm({...profileForm, is_admin: e.target.checked})} className="w-4 h-4" />
              <label htmlFor="is_admin" className="text-sm font-medium text-gray-700">Amministratore</label>
            </div>
          </div>

          <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
            <button onClick={() => setProfileEditUser(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium" disabled={savingProfile}>Annulla</button>
            <button onClick={handleSaveProfile} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2" disabled={savingProfile}>
              <Save className="w-4 h-4" />
              {savingProfile ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2 sticky top-4">
          {availableMenuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveSection(item.id)} 
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                activeSection === item.id ? 'bg-red-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <item.Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="lg:col-span-3 space-y-6">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'users' && renderUsers()}
        {activeSection === 'matrix' && renderMatrix()}
        {activeSection === 'marketplace' && renderMarketplace()}
        {activeSection === 'coupons' && renderCoupons()}
        {activeSection === 'vouchers' && renderVouchers()}
        {activeSection === 'rewards' && renderRewards()}
        {activeSection === 'settings' && renderSettings()}
      </div>

      {renderManageModal()}
      {renderProfileEditModal()}
    </div>
  )
}