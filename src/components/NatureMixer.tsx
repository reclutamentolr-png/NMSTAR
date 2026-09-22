'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { NatureSoundsEngine, type NaturePreset } from '@/lib/natureSounds'
import { LoaderCircle, Pause, Play, Volume2 } from 'lucide-react'

const PRESETS: { id: NaturePreset; emoji: string }[] = [
  { id: 'rain', emoji: '🌧️' },
  { id: 'ocean', emoji: '🌊' },
  { id: 'stream', emoji: '💧' },
  { id: 'forest', emoji: '🌲' },
  { id: 'wind', emoji: '🍃' },
  { id: 'fire', emoji: '🔥' },
  { id: 'night', emoji: '🌙' },
  { id: 'storm', emoji: '⛈️' },
]

export default function NatureMixer() {
  const t = useTranslations('neurobalance')
  const engineRef = useRef<NatureSoundsEngine | null>(null)
  const [active, setActive] = useState<NaturePreset | null>(null)
  const [loading, setLoading] = useState<NaturePreset | null>(null)
  const [volume, setVolume] = useState(0.6)

  useEffect(() => {
    engineRef.current = new NatureSoundsEngine()
    return () => engineRef.current?.stop()
  }, [])

  const toggle = async (id: NaturePreset) => {
    const eng = engineRef.current
    if (!eng || loading) return
    if (active === id) {
      eng.fadeStop()
      setActive(null)
      return
    }
    setLoading(id)
    try {
      await eng.start(id, volume)
      setActive(id)
    } catch (err) {
      console.error('[NatureMixer] failed to start sound:', id, err)
    } finally {
      setLoading(null)
    }
  }

  const onVolume = (v: number) => {
    setVolume(v)
    engineRef.current?.setVolume(v)
  }

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[var(--ink)] via-[#20202a] to-[var(--ink)] p-5 shadow-xl sm:p-6">
      {/* Decorative glow blobs — purely cosmetic, clipped by overflow-hidden above */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[var(--gold)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[var(--gold-bright)]/10 blur-3xl" />

      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-bright)]">{t('natureSoundsLabel')}</p>
        <p className="mt-1 text-sm text-white/60">{t('natureSoundsDescription')}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRESETS.map((preset) => {
            const isActive = active === preset.id
            const isLoading = loading === preset.id
            return (
              <div
                key={preset.id}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  isActive
                    ? 'border-[var(--gold)] bg-[var(--gold)]/15 shadow-[0_0_24px_rgba(199,154,59,0.35)]'
                    : 'border-white/10 bg-white/5 hover:border-[var(--gold)]/40 hover:bg-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(preset.id)}
                  disabled={loading !== null && !isLoading}
                  className="flex w-full items-start justify-between gap-2 text-left disabled:opacity-40"
                >
                  <div>
                    <div className="text-xl">{preset.emoji}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{t(`naturePresets.${preset.id}.label`)}</div>
                    <div className="text-[11px] leading-tight text-white/50">{t(`naturePresets.${preset.id}.hint`)}</div>
                  </div>
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-[var(--gold)] text-[var(--ink)]' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {isLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </span>
                </button>

                {isActive && (
                  <>
                    <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                      {Array.from({ length: 10 }, (_, index) => (
                        <span
                          key={index}
                          className={`flex-1 rounded-full bg-[var(--gold-bright)]/70 animate-pulse ${index % 3 === 0 ? 'h-3' : index % 2 === 0 ? 'h-2' : 'h-1.5'}`}
                          style={{ animationDelay: `${index * 90}ms` }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 shrink-0 text-[var(--gold-bright)]" />
                      <label htmlFor={`nature-volume-${preset.id}`} className="sr-only">
                        {t('natureVolumeLabel')}
                      </label>
                      <input
                        id={`nature-volume-${preset.id}`}
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(event) => onVolume(Number(event.target.value))}
                        className="w-full accent-[var(--gold)]"
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
