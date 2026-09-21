'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDown, CornerDownRight, Crown, Pause, Play, RotateCcw, UserRound } from 'lucide-react'

const stepLabels = [
  'spilloverStep1',
  'spilloverStep2',
  'spilloverStep3',
  'spilloverStep4',
  'spilloverStep5',
  'spilloverStep6',
  'spilloverStep7',
  'spilloverStep8',
  'spilloverStep9',
  'spilloverStep10',
]

export default function SpilloverExplainer() {
  const t = useTranslations('dashboard')
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return

    const timer = window.setInterval(() => {
      setStep((currentStep) => (currentStep + 1) % stepLabels.length)
    }, 2200)

    return () => window.clearInterval(timer)
  }, [isPlaying, stepLabels])

  const reset = () => {
    setStep(0)
    setIsPlaying(true)
  }

  const filledDirects = Math.min(step, 5)
  const spilloverMembers = Array.from({ length: Math.min(Math.max(step - 5, 0), 3) }, (_, index) => index + 6)

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--gold)]/30 bg-[var(--paper)] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[var(--gold)]/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{t('miniGuide')}</p>
          <h3 className="mt-1 text-lg font-bold text-[var(--ink)]">{t('spilloverTitle')}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((playing) => !playing)}
            className="flex items-center gap-2 rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-[var(--gold-bright)] transition-colors hover:bg-[var(--ink-soft)]"
            aria-label={isPlaying ? t('pause') : t('play')}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? t('pause') : t('play')}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-[var(--gold)]/35 p-2 text-[var(--ink-soft)] transition-colors hover:bg-[var(--gold-pale)]"
            aria-label={t('restartAnimation')}
            title={t('restartAnimation')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1fr_220px] lg:items-center">
        <div className="relative rounded-xl border border-[var(--gold)]/20 bg-[var(--background)] px-4 py-6 sm:px-8">
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-3 border-[var(--gold-bright)] bg-[var(--ink)] text-[var(--gold-bright)] shadow-md">
              <Crown className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <span className="mt-2 rounded-full bg-[var(--ink)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--gold-bright)]">{t('owner')}</span>
            <ArrowDown className="my-3 h-5 w-5 text-[var(--gold)]" />
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {Array.from({ length: 5 }).map((_, index) => {
              const isFilled = index < filledDirects
              const spilloverMember = spilloverMembers[index]
              const name = t('directN', { n: index + 1 })

              return (
                <div key={name} className="flex min-w-0 flex-col items-center text-center">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-14 sm:w-14 ${
                    isFilled
                      ? 'border-[var(--gold)] bg-[var(--ink)] text-[var(--gold-bright)] hover:-translate-y-1'
                      : 'border-dashed border-stone-300 bg-white text-stone-300'
                  }`}>
                    {isFilled ? <UserRound className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.6} /> : <span className="text-2xl">+</span>}
                  </div>
                  <span className="mt-2 max-w-full truncate text-[10px] font-semibold text-[var(--ink-soft)] sm:text-xs">{name}</span>
                  {spilloverMember && (
                    <div className="mt-2 flex flex-col items-center gap-1 animate-fadeIn">
                      <div className="flex items-center gap-1 rounded-full border border-[var(--gold)]/40 bg-[var(--gold-pale)] px-2 py-1 text-[9px] font-bold text-[var(--ink)]">
                        <CornerDownRight className="h-3 w-3" />
                        {t('spilloverMember', { n: spilloverMember })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--ink)] p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-bright)]">{t('step', { current: step + 1, total: stepLabels.length })}</p>
          <p className="mt-3 min-h-[60px] text-sm leading-6 text-stone-200">{t(stepLabels[step])}</p>
          <div className="mt-4 flex gap-1">
            {stepLabels.map((label, index) => (
              <span key={label} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? 'bg-[var(--gold-bright)]' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
