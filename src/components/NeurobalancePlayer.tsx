'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { awardNeurobalancePoint } from '@/app/actions/neurobalance'
import { Headphones, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import NatureMixer from '@/components/NatureMixer'

type Preset = {
  id: string
  name: string
  description: string
  carrier: number
  beat: number
  duration: number
}

type SpecialSound = {
  id: string
  frequency: number
  name: string
  description: string
}

const presets: Preset[] = [
  { id: 'deep-rest', name: 'Riposo profondo', description: 'Una pulsazione lenta per accompagnare una pausa serale.', carrier: 180, beat: 2, duration: 20 },
  { id: 'focus-flow', name: 'Focus fluido', description: 'Un ritmo regolare per sessioni di lavoro calme e concentrate.', carrier: 220, beat: 10, duration: 15 },
  { id: 'reset', name: 'Reset consapevole', description: 'Un invito a rallentare il respiro e tornare al momento presente.', carrier: 160, beat: 6, duration: 10 },
]

const specialSounds: SpecialSound[] = [
  { id: 'guarigione', frequency: 285, name: 'Guarigione', description: 'Una frequenza sonora da esplorare durante una pausa rilassante.' },
  { id: 'ripristina-benessere', frequency: 417, name: 'Ripristina il benessere', description: 'Un ascolto pensato per accompagnare un momento di rinnovamento.' },
  { id: 'liberare-tensione', frequency: 432, name: 'Liberare la tensione', description: 'Una tonalita morbida per rallentare e lasciare andare.' },
  { id: 'riparazione-dna', frequency: 528, name: 'Riparazione del DNA', description: "Un ascolto meditativo associato tradizionalmente alla frequenza dell'amore." },
  { id: 'innalzare-vibrazioni', frequency: 963, name: 'Innalzare le vibrazioni', description: 'Una frequenza acuta da ascoltare a volume basso e confortevole.' },
]

const MIN_LISTEN_SECONDS_FOR_POINT = 10 * 60

export default function NeurobalancePlayer() {
  const t = useTranslations('neurobalance')
  const [selectedId, setSelectedId] = useState(presets[0].id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [remaining, setRemaining] = useState(presets[0].duration * 60)
  const [volume, setVolume] = useState(0.18)
  const [selectedSpecialSound, setSelectedSpecialSound] = useState<SpecialSound | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // The KU Point for this tool must reflect a real listening session, not a
  // click — listenedSecondsRef accumulates actual playback time across both
  // players (and across pause/resume), and the point only fires once it
  // crosses the threshold, at most once per page load.
  const listenedSecondsRef = useRef(0)
  const pointAwardedRef = useRef(false)

  const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0]
  const presetName = (id: string) => t(`presets.${id}.name`)
  const presetDescription = (id: string) => t(`presets.${id}.description`)
  const specialSoundName = (id: string) => t(`specialSounds.${id}.name`)
  const specialSoundDescription = (id: string) => t(`specialSounds.${id}.description`)

  useEffect(() => {
    if (!isPlaying) return
    timerRef.current = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          oscillatorsRef.current.forEach((oscillator) => oscillator.stop())
          oscillatorsRef.current = []
          setIsPlaying(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume
  }, [volume])

  useEffect(() => {
    if (!isPlaying || pointAwardedRef.current) return
    const interval = setInterval(() => {
      listenedSecondsRef.current += 1
      if (listenedSecondsRef.current >= MIN_LISTEN_SECONDS_FOR_POINT && !pointAwardedRef.current) {
        pointAwardedRef.current = true
        awardNeurobalancePoint()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((oscillator) => oscillator.stop())
      void audioContextRef.current?.close()
    }
  }, [])

  const stopAudio = () => {
    oscillatorsRef.current.forEach((oscillator) => oscillator.stop())
    oscillatorsRef.current = []
    setIsPlaying(false)
  }

  // Builds the stereo-panned oscillator pair for a given carrier/beat and
  // starts it — extracted out of togglePlayback so card clicks can start
  // playback for a selection that was just made in the same click, instead
  // of racing the async setSelectedId/setSelectedSpecialSound state update.
  const playWith = async (carrier: number, beat: number, durationSeconds: number) => {
    const audioContext = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = audioContext
    await audioContext.resume()
    const gain = audioContext.createGain()
    gain.gain.value = volume
    gain.connect(audioContext.destination)
    gainRef.current = gain
    const left = audioContext.createOscillator()
    const right = audioContext.createOscillator()
    const leftPanner = audioContext.createStereoPanner()
    const rightPanner = audioContext.createStereoPanner()
    left.frequency.value = carrier
    right.frequency.value = carrier + beat
    leftPanner.pan.value = -1
    rightPanner.pan.value = 1
    left.connect(leftPanner).connect(gain)
    right.connect(rightPanner).connect(gain)
    left.start()
    right.start()
    oscillatorsRef.current = [left, right]
    setRemaining(durationSeconds)
    setIsPlaying(true)
  }

  const togglePlayback = async () => {
    if (isPlaying) {
      stopAudio()
      return
    }
    const carrier = selectedSpecialSound?.frequency ?? selected.carrier
    const beat = selectedSpecialSound ? 4 : selected.beat
    await playWith(carrier, beat, selectedSpecialSound ? 15 * 60 : selected.duration * 60)
  }

  // Card click = select AND play/pause in one action, so a Kumano never has
  // to select a card here then scroll back up to the big button — clicking
  // the currently-playing card pauses it; clicking any other card switches
  // straight to it and starts playing.
  const handlePresetCardClick = async (preset: Preset) => {
    const isThisPlaying = isPlaying && !selectedSpecialSound && selectedId === preset.id
    stopAudio()
    if (isThisPlaying) return
    setSelectedSpecialSound(null)
    setSelectedId(preset.id)
    await playWith(preset.carrier, preset.beat, preset.duration * 60)
  }

  const handleSpecialSoundCardClick = async (sound: SpecialSound) => {
    const isThisPlaying = isPlaying && selectedSpecialSound?.id === sound.id
    stopAudio()
    if (isThisPlaying) return
    setSelectedSpecialSound(sound)
    await playWith(sound.frequency, 4, 15 * 60)
  }

  const resetSession = () => {
    stopAudio()
    setRemaining(selectedSpecialSound ? 15 * 60 : selected.duration * 60)
  }

  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0')
  const seconds = (remaining % 60).toString().padStart(2, '0')

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[var(--gold)]/20 bg-white shadow-[0_20px_60px_rgba(23,23,23,0.12)]">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(199,154,59,0.25),transparent_42%),linear-gradient(135deg,#171717,#292722)] px-6 py-8 text-white sm:px-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--gold-bright)]">{selectedSpecialSound ? t('specialSoundLabel') : t('sessionAudio')}</p><h2 className="text-2xl font-bold sm:text-3xl">{selectedSpecialSound ? `${selectedSpecialSound.frequency} Hz · ${specialSoundName(selectedSpecialSound.id)}` : presetName(selected.id)}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{selectedSpecialSound ? specialSoundDescription(selectedSpecialSound.id) : presetDescription(selected.id)}</p></div>
          <div className="hidden rounded-2xl border border-white/15 bg-white/10 p-3 sm:block"><Headphones className="h-7 w-7 text-white/80" /></div>
        </div>
        <div className="mb-8 flex items-center gap-3" aria-label="Visualizzazione della frequenza">
          {Array.from({ length: 18 }, (_, index) => <span key={index} className={`flex-1 rounded-full bg-[var(--gold-bright)]/60 ${index % 3 === 0 ? 'h-12' : index % 2 === 0 ? 'h-8' : 'h-5'} ${isPlaying ? 'animate-pulse' : ''}`} style={{ animationDelay: `${index * 70}ms` }} />)}
        </div>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div><p className="text-xs uppercase tracking-[0.22em] text-[var(--gold-bright)]">{t('timeRemaining')}</p><p className="mt-1 font-mono text-4xl font-semibold tracking-tight">{minutes}:{seconds}</p><p className="mt-1 text-xs text-[var(--gold-bright)]">{selectedSpecialSound ? t('frequencyInfo', { carrier: selectedSpecialSound.frequency, beat: 4 }) : t('frequencyInfo', { carrier: selected.carrier, beat: selected.beat })}</p></div>
          <div className="flex items-center gap-3"><button type="button" onClick={resetSession} aria-label={t('restart')} title={t('restart')} className="rounded-full border border-white/20 p-3 text-white/80 transition-colors hover:bg-white/10"><RotateCcw className="h-5 w-5" /></button><button type="button" onClick={togglePlayback} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[var(--ink)] shadow-lg transition-transform hover:scale-[1.02]">{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}{isPlaying ? t('pause') : t('startSession')}</button></div>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3 text-sm text-slate-600"><Volume2 className="h-4 w-4 text-[var(--gold)]" /><label htmlFor="neurobalance-volume" className="sr-only">{t('volume')}</label><input id="neurobalance-volume" type="range" min="0" max="0.4" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-full accent-[var(--gold)]" /></div>
        <div className="grid gap-3 md:grid-cols-3">
          {presets.map((preset) => {
            const isSelected = selectedId === preset.id && !selectedSpecialSound
            const isThisPlaying = isSelected && isPlaying
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetCardClick(preset)}
                className={`rounded-2xl border p-4 text-left transition-all ${isSelected ? 'border-[var(--gold)] bg-[var(--gold-pale)] shadow-sm' : 'border-slate-200 hover:border-[var(--gold)]/40 hover:bg-slate-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="mb-2 block text-sm font-bold text-slate-900">{presetName(preset.id)}</span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-[var(--gold)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {isThisPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </span>
                </div>
                <span className="block text-xs leading-5 text-slate-500">{t('presetMeta', { duration: preset.duration, beat: preset.beat })}</span>
                {isThisPlaying && (
                  <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                    {Array.from({ length: 12 }, (_, index) => (
                      <span key={index} className={`flex-1 rounded-full bg-[var(--gold)]/70 animate-pulse ${index % 3 === 0 ? 'h-3' : index % 2 === 0 ? 'h-2' : 'h-1.5'}`} style={{ animationDelay: `${index * 80}ms` }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{t('specialSoundLabel')}</p><p className="mt-1 text-sm text-slate-500">{t('specialSoundDescription')}</p></div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {specialSounds.map((sound) => {
              const isSelected = selectedSpecialSound?.id === sound.id
              const isThisPlaying = isSelected && isPlaying
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => handleSpecialSoundCardClick(sound)}
                  className={`rounded-2xl border p-4 text-left transition-all ${isSelected ? 'border-[var(--gold)] bg-[var(--gold-pale)] shadow-sm' : 'border-slate-200 hover:border-[var(--gold)]/40 hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="mb-2 block text-sm font-bold text-slate-900">{sound.frequency} Hz · {specialSoundName(sound.id)}</span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-[var(--gold)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {isThisPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                  <span className="block text-xs leading-5 text-slate-500">{specialSoundDescription(sound.id)}</span>
                  {isThisPlaying && (
                    <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, index) => (
                        <span key={index} className={`flex-1 rounded-full bg-[var(--gold)]/70 animate-pulse ${index % 3 === 0 ? 'h-3' : index % 2 === 0 ? 'h-2' : 'h-1.5'}`} style={{ animationDelay: `${index * 80}ms` }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <NatureMixer />
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">{t('safety')}</p>
      </div>
    </section>
  )
}