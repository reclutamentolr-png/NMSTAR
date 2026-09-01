'use client'

import { useState, useEffect } from 'react'

type LinkItem = {
  id: string
  title: string
  url: string
  icon: string
  isActive: boolean
}

type Theme = {
  id: string
  name: string
  gradient: string
  textColor: string
  buttonBg: string
  buttonText: string
}

type LinkInBioBuilderProps = {
  userId: string
  referralCode: string
  referralUrl: string
  userName: string
  initialData?: {
    bio_text: string
    theme: string
    links: LinkItem[]
  }
}

const themes: Theme[] = [
  {
    id: 'gradient-1',
    name: 'Viola Royale',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    textColor: 'text-white',
    buttonBg: 'bg-white/20 backdrop-blur-md border-white/30',
    buttonText: 'text-white'
  },
  {
    id: 'gradient-2',
    name: 'Ocean Blue',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    textColor: 'text-white',
    buttonBg: 'bg-white/20 backdrop-blur-md border-white/30',
    buttonText: 'text-white'
  },
  {
    id: 'gradient-3',
    name: 'Sunset',
    gradient: 'from-orange-400 via-pink-500 to-rose-500',
    textColor: 'text-white',
    buttonBg: 'bg-white/20 backdrop-blur-md border-white/30',
    buttonText: 'text-white'
  },
  {
    id: 'gradient-4',
    name: 'Forest',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    textColor: 'text-white',
    buttonBg: 'bg-white/20 backdrop-blur-md border-white/30',
    buttonText: 'text-white'
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    gradient: 'from-gray-900 via-gray-800 to-gray-900',
    textColor: 'text-white',
    buttonBg: 'bg-gray-800 border-gray-700',
    buttonText: 'text-white'
  },
  {
    id: 'light',
    name: 'Light Mode',
    gradient: 'from-gray-100 via-white to-gray-100',
    textColor: 'text-gray-900',
    buttonBg: 'bg-white border-gray-200 shadow-sm',
    buttonText: 'text-gray-900'
  }
]

const iconOptions = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'facebook', label: 'Facebook', emoji: '👥' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'youtube', label: 'YouTube', emoji: '📺' },
  { id: 'twitter', label: 'X (Twitter)', emoji: '🐦' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '' },
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { id: 'telegram', label: 'Telegram', emoji: '✈️' },
  { id: 'email', label: 'Email', emoji: '📧' },
  { id: 'phone', label: 'Telefono', emoji: '' },
  { id: 'website', label: 'Sito Web', emoji: '' },
  { id: 'other', label: 'Altro', emoji: '🔗' }
]

export default function LinkInBioBuilder({ 
  userId, 
  referralCode, 
  referralUrl, 
  userName,
  initialData 
}: LinkInBioBuilderProps) {
  const [bioText, setBioText] = useState(initialData?.bio_text || '')
  const [selectedTheme, setSelectedTheme] = useState(initialData?.theme || 'gradient-1')
  const [links, setLinks] = useState<LinkItem[]>(initialData?.links || [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[0]
  const publicBioUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/ref/${referralCode}/bio`

  const addLink = () => {
    const newLink: LinkItem = {
      id: `link-${Date.now()}`,
      title: '',
      url: '',
      icon: 'website',
      isActive: true
    }
    setLinks([...links, newLink])
    setEditingId(newLink.id)
  }

  const updateLink = (id: string, field: keyof LinkItem, value: string | boolean) => {
    setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const removeLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id))
  }

  const moveLink = (id: string, direction: 'up' | 'down') => {
    const index = links.findIndex(l => l.id === id)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === links.length - 1) return
    
    const newLinks = [...links]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]]
    setLinks(newLinks)
  }

  const saveLinkInBio = async () => {
    setSaving(true)
    setSaved(false)
    
    try {
      const response = await fetch('/api/link-in-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio_text: bioText,
          theme: selectedTheme,
          links: links
        })
      })
      
      if (!response.ok) throw new Error('Errore nel salvataggio')
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nel salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicBioUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getIconEmoji = (iconId: string) => {
    return iconOptions.find(i => i.id === iconId)?.emoji || '🔗'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* COLONNA SINISTRA: Editor */}
      <div className="space-y-6">
        {/* Bio Text */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 La tua Bio</h3>
          <textarea
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            placeholder="Es: Aiuto persone a creare entrate extra online 💰"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">Max 150 caratteri</p>
        </div>

        {/* Theme Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 Scegli il Tema</h3>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative h-16 rounded-lg bg-gradient-to-br ${theme.gradient} border-2 transition-all ${
                  selectedTheme === theme.id 
                    ? 'border-indigo-600 ring-2 ring-indigo-300 scale-105' 
                    : 'border-transparent hover:scale-105'
                }`}
              >
                <span className="absolute bottom-1 left-2 text-xs font-semibold text-white drop-shadow-md">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Links Manager */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900"> I tuoi Link</h3>
            <button
              onClick={addLink}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + Aggiungi Link
            </button>
          </div>

          {links.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Nessun link aggiunto. Clicca "Aggiungi Link" per iniziare!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={link.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {editingId === link.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={link.icon}
                          onChange={(e) => updateLink(link.id, 'icon', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {iconOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.emoji} {opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                        placeholder="Titolo (es: Il mio Instagram)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => moveLink(link.id, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveLink(link.id, 'down')}
                          disabled={index === links.length - 1}
                          className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded"
                        >
                          ✓ Fatto
                        </button>
                        <button
                          onClick={() => removeLink(link.id)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setEditingId(link.id)}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded"
                    >
                      <span className="text-2xl">{getIconEmoji(link.icon)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {link.title || 'Link senza titolo'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{link.url}</p>
                      </div>
                      <span className="text-xs text-gray-400">️ Modifica</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={saveLinkInBio}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Salvataggio...
            </>
          ) : saved ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Salvato con successo!
            </>
          ) : (
            '💾 Salva il tuo Link in Bio'
          )}
        </button>

        {/* Public Link */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">🔗 Il tuo Link Pubblico</h3>
          <div className="flex gap-2">
            <input
              readOnly
              value={publicBioUrl}
              className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-gray-700"
            />
            <button
              onClick={copyPublicLink}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {copied ? '✓ Copiato!' : 'Copia'}
            </button>
          </div>
          <p className="text-xs text-indigo-700 mt-2">
            Condividi questo link ovunque: Instagram, Facebook, TikTok, biglietti da visita...
          </p>
        </div>
      </div>

      {/* COLONNA DESTRA: Anteprima Live */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-3 text-center">📱 ANTEPRIMA LIVE</p>
          
          <div className={`mx-auto max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br ${currentTheme.gradient} min-h-[600px] p-6`}>
            {/* Avatar */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-3xl font-bold text-white mb-3 border-2 border-white/50">
                {userName.charAt(0).toUpperCase()}
              </div>
              <h2 className={`text-xl font-bold ${currentTheme.textColor}`}>
                {userName}
              </h2>
              {bioText && (
                <p className={`text-sm mt-1 text-center ${currentTheme.textColor} opacity-90`}>
                  {bioText}
                </p>
              )}
            </div>

            {/* Link Buttons */}
            <div className="space-y-3 mt-4">
              {links.filter(l => l.isActive).map((link) => (
                <a
                  key={link.id}
                  href={link.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full px-4 py-3 rounded-xl ${currentTheme.buttonBg} border ${currentTheme.buttonText} text-center font-medium text-sm hover:scale-105 transition-transform`}
                >
                  <span className="mr-2">{getIconEmoji(link.icon)}</span>
                  {link.title || 'Link'}
                </a>
              ))}
            </div>

            {/* Referral CTA */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <a
                href={referralUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-3 rounded-xl bg-white text-indigo-600 text-center font-bold text-sm hover:scale-105 transition-transform shadow-lg"
              >
                 Unisciti al mio team!
              </a>
              <p className={`text-center text-xs mt-2 ${currentTheme.textColor} opacity-75`}>
                Codice: <span className="font-mono font-bold">{referralCode}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}