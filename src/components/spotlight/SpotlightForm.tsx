'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { deleteSpotlightProfile, revokeSpotlightOptIn, upsertSpotlightProfile } from '@/app/actions/spotlight'
import { SPOTLIGHT_STORY_MAX_LENGTH, type SpotlightProfile } from '@/lib/spotlight'
import { defaultLocale } from '../../../i18n'

type FormState = {
  displayName: string
  city: string
  country: string
  profession: string
  story: string
  favoriteTools: string[]
}

function emptyForm(profile: SpotlightProfile | null): FormState {
  return {
    displayName: profile?.display_name ?? '',
    city: profile?.city ?? '',
    country: profile?.country ?? '',
    profession: profile?.profession ?? '',
    story: profile?.story ?? '',
    favoriteTools: profile?.favorite_tools ?? [],
  }
}

export default function SpotlightForm({
  profile,
  availableTools,
}: {
  profile: SpotlightProfile | null
  availableTools: { toolName: string; title: string }[]
}) {
  const t = useTranslations('spotlight')
  const router = useRouter()
  const locale = useLocale()
  const [form, setForm] = useState<FormState>(emptyForm(profile))
  const [consent, setConsent] = useState(profile?.is_opted_in ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTool = (toolName: string) => {
    setForm((prev) => ({
      ...prev,
      favoriteTools: prev.favoriteTools.includes(toolName)
        ? prev.favoriteTools.filter((t) => t !== toolName)
        : [...prev.favoriteTools, toolName],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError(t('consentRequired'))
      return
    }
    if (!form.displayName.trim() || !form.story.trim()) {
      setError(t('saveError'))
      return
    }
    setSaving(true)
    const result = await upsertSpotlightProfile(form)
    setSaving(false)
    if (!result.success) {
      setError(t(result.message))
      return
    }
    // Dopo il salvataggio l'utente vuole vedersi (potenzialmente) in
    // vetrina, non restare sul form — locale di default senza prefisso,
    // come LocalizedLink (localePrefix: 'as-needed').
    router.push(locale === defaultLocale ? '/spotlight' : `/${locale}/spotlight`)
  }

  const handleRevoke = async () => {
    if (!confirm(t('revokeConfirm'))) return
    const result = await revokeSpotlightOptIn()
    if (result.success) {
      setConsent(false)
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    const result = await deleteSpotlightProfile()
    if (result.success) router.refresh()
  }

  const remaining = SPOTLIGHT_STORY_MAX_LENGTH - form.story.length

  return (
    <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--paper)] p-6 sm:p-8">
      {profile && (
        <p className={`mb-6 rounded-lg px-4 py-2.5 text-sm font-medium ${profile.is_opted_in ? 'bg-[var(--gold-pale)] text-[var(--ink)]' : 'bg-[var(--background)] text-[var(--muted)]'}`}>
          {profile.is_opted_in ? t('statusActive') : t('statusInactive')}
        </p>
      )}

      <h2 className="mb-1 text-lg font-bold text-[var(--ink)]">{t('formTitle')}</h2>
      <p className="mb-6 text-sm text-[var(--muted)]">{t('formDescription')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{t('displayNameField')}</label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            maxLength={60}
            className="w-full rounded-lg border border-[var(--gold)]/30 p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            required
          />
          <p className="mt-1 text-xs text-[var(--muted)]">{t('displayNameHint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{t('cityField')}</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-lg border border-[var(--gold)]/30 p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{t('countryField')}</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full rounded-lg border border-[var(--gold)]/30 p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{t('professionField')}</label>
          <input
            type="text"
            value={form.profession}
            onChange={(e) => setForm({ ...form, profession: e.target.value })}
            className="w-full rounded-lg border border-[var(--gold)]/30 p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-[var(--ink)]">{t('storyField')}</label>
            <span className={`text-xs ${remaining < 0 ? 'text-red-600' : 'text-[var(--muted)]'}`}>{form.story.length}/{SPOTLIGHT_STORY_MAX_LENGTH}</span>
          </div>
          <textarea
            value={form.story}
            onChange={(e) => setForm({ ...form, story: e.target.value })}
            maxLength={SPOTLIGHT_STORY_MAX_LENGTH}
            rows={4}
            className="w-full resize-none rounded-lg border border-[var(--gold)]/30 p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            required
          />
          <p className="mt-1 text-xs text-[var(--muted)]">{t('storyHint')}</p>
        </div>

        {availableTools.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">{t('favoriteToolsField')}</label>
            <div className="flex flex-wrap gap-2">
              {availableTools.map((tool) => {
                const selected = form.favoriteTools.includes(tool.toolName)
                return (
                  <button
                    key={tool.toolName}
                    type="button"
                    onClick={() => toggleTool(tool.toolName)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-transparent bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] text-[var(--ink)]'
                        : 'border-[var(--gold)]/30 text-[var(--ink)] hover:bg-[var(--gold)]/10'
                    }`}
                  >
                    {tool.title}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <label className="flex items-start gap-2.5 rounded-lg border border-[var(--gold)]/20 bg-[var(--background)] p-3 text-sm text-[var(--ink)]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--gold)]" />
          {t('consentLabel')}
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] disabled:opacity-50"
          >
            {saving ? t('saving') : t('save')}
          </button>
          {profile?.is_opted_in && (
            <button type="button" onClick={handleRevoke} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]">
              {t('revoke')}
            </button>
          )}
          {profile && (
            <button type="button" onClick={handleDelete} className="ml-auto text-sm font-medium text-red-600 hover:text-red-700">
              {t('delete')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
