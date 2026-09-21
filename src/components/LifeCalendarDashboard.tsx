'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from '@/components/LocalizedLink'
import { Search, PlusCircle, CalendarClock } from 'lucide-react'
import LifeCalendarItemCard from '@/components/LifeCalendarItemCard'
import { getItemStatus, CATEGORIES, type Category, type ItemStatus } from '@/lib/lifeCalendar'

type Item = {
  id: string
  title: string
  category: string
  due_date: string
  recurrence: string
  profile_id: string | null
  profile_name?: string | null
}

type Profile = { id: string; name: string }

export default function LifeCalendarDashboard({ items, profiles }: { items: Item[]; profiles: Profile[] }) {
  const t = useTranslations('lifeCalendar')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [profileFilter, setProfileFilter] = useState<string | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')

  const summary = useMemo(() => {
    const counts: Record<ItemStatus, number> = { regular: 0, upcoming: 0, urgent: 0, expired: 0 }
    items.forEach((item) => {
      counts[getItemStatus(item.due_date)]++
    })
    return counts
  }, [items])

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => (search ? item.title.toLowerCase().includes(search.toLowerCase()) : true))
      .filter((item) => (categoryFilter === 'all' ? true : item.category === categoryFilter))
      .filter((item) => (profileFilter === 'all' ? true : item.profile_id === profileFilter))
      .filter((item) => (statusFilter === 'all' ? true : getItemStatus(item.due_date) === statusFilter))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [items, search, categoryFilter, profileFilter, statusFilter])

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['regular', 'upcoming', 'urgent', 'expired'] as ItemStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={`bg-white rounded-xl border p-4 text-left transition-all ${
              statusFilter === status ? 'border-amber-600 ring-2 ring-amber-200' : 'border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{summary[status]}</div>
            <div className="text-xs text-gray-500 mt-1">{t(`status_${status}`)}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | 'all')}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
          >
            <option value="all">{t('allCategories')}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`category_${category}`)}
              </option>
            ))}
          </select>
          {profiles.length > 0 && (
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
            >
              <option value="all">{t('allProfiles')}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <LifeCalendarItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <CalendarClock className="w-12 h-12 mx-auto mb-4" />
            <p>{items.length === 0 ? t('noItemsYet') : t('noResults')}</p>
          </div>
        )}
      </div>

      <Link
        href="/marketplace/life-calendar/new"
        className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <PlusCircle className="w-5 h-5" />
        {t('newItem')}
      </Link>
    </div>
  )
}
