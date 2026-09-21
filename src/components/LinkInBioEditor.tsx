'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { saveLinkInBio } from '@/app/actions/linkInBio'
import { Plus, Trash2, Save, Link as LinkIcon } from 'lucide-react'

type LinkItem = {
  id: string
  title: string
  url: string
  icon: string
  enabled: boolean
}

export default function LinkInBioEditor({ userId }: { userId: string }) {
  const t = useTranslations('marketplace')
  const supabase = createClient()
  const [bioText, setBioText] = useState('')
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('link_in_bio')
        .select('bio_text, links')
        .eq('user_id', userId)
        .single()

      if (data) {
        setBioText(data.bio_text || '')
        try {
          setLinks(data.links ? JSON.parse(data.links) : [])
        } catch {
          setLinks([])
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [userId, supabase])

  const addLink = () => {
    setLinks([
      ...links,
      { id: crypto.randomUUID(), title: '', url: '', icon: 'default', enabled: true }
    ])
  }

  const updateLink = (id: string, field: keyof LinkItem, value: string) => {
    setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const removeLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveLinkInBio(bioText, links)
      if (!result.success) throw new Error('save failed')
      alert(t('savedSuccess'))
    } catch (error) {
      console.error('Save error:', error)
      alert(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">{t('loadingEditor')}</div>

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <LinkIcon className="w-5 h-5 text-pink-600" />
        {t('editPage')}
      </h3>

      {/* Bio Text */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('bioTextLabel')}</label>
        <textarea
          value={bioText}
          onChange={(e) => setBioText(e.target.value)}
          placeholder={t('bioTextPlaceholder')}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none h-24 resize-none"
        />
      </div>

      {/* Links Manager */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-gray-700">{t('customLinks')}</label>
          <button
            onClick={addLink}
            className="text-sm flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium"
          >
            <Plus className="w-4 h-4" /> {t('addLink')}
          </button>
        </div>

        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={link.id} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
              <select
                value={link.icon}
                onChange={(e) => updateLink(link.id, 'icon', e.target.value)}
                className="p-2 border border-gray-300 rounded bg-white"
              >
                <option value="default">🔗 {t('link')}</option>
                <option value="website">🌍 {t('website')}</option>
                <option value="email">✉️ {t('email')}</option>
                <option value="phone">📞 {t('phone')}</option>
              </select>
              
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder={t('linkTitlePlaceholder')}
                  value={link.title}
                  onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="url"
                  placeholder={t('linkUrlPlaceholder')}
                  value={link.url}
                  onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm font-mono"
                />
              </div>

              <button
                onClick={() => removeLink(link.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors mt-1"
                title={t('removeLink')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {links.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              {t('noCustomLinks')}
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? t('saving') : t('savePage')}
        </button>
      </div>
    </div>
  )
}
