'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { awardNeurobalancePoint } from '@/app/actions/neurobalance'
import { NatureSoundsEngine, type NaturePreset } from '@/lib/natureSounds'
import { presets, specialSounds, MIN_LISTEN_SECONDS_FOR_POINT, type Preset, type SpecialSound } from '@/lib/neurobalancePresets'

interface NeurobalanceAudioValue {
  presets: Preset[]
  specialSounds: SpecialSound[]
  selectedId: string
  isPlaying: boolean
  remaining: number
  volume: number
  selectedSpecialSound: SpecialSound | null
  activeNature: NaturePreset | null
  natureLoading: NaturePreset | null
  natureVolume: number
  handlePresetCardClick: (preset: Preset) => Promise<void>
  handleSpecialSoundCardClick: (sound: SpecialSound) => Promise<void>
  togglePlayback: () => Promise<void>
  resetSession: () => void
  setVolume: (volume: number) => void
  toggleNature: (id: NaturePreset) => Promise<void>
  setNatureVolume: (volume: number) => void
  stopEverything: () => void
}

const NeurobalanceAudioContext = createContext<NeurobalanceAudioValue | null>(null)

export function useNeurobalanceAudio() {
  const ctx = useContext(NeurobalanceAudioContext)
  if (!ctx) throw new Error('useNeurobalanceAudio must be used within NeurobalanceAudioProvider')
  return ctx
}

// Monta una sola volta nel layout root (sopravvive quindi a ogni
// navigazione client-side, Neurobalance -> Mandala compreso): prima questo
// stato/motore audio viveva dentro NeurobalancePlayer e NatureMixer, quindi
// smontava (e zittiva l'audio) ogni volta che si lasciava /marketplace/
// neurobalance. Spostandolo qui la sessione resta attiva ovunque nell'app,
// controllabile dal mini player fluttuante (FloatingAudioPlayer).
export function NeurobalanceAudioProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(presets[0].id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [remaining, setRemaining] = useState(presets[0].duration * 60)
  const [volume, setVolumeState] = useState(0.18)
  const [selectedSpecialSound, setSelectedSpecialSound] = useState<SpecialSound | null>(null)

  const [activeNature, setActiveNature] = useState<NaturePreset | null>(null)
  const [natureLoading, setNatureLoading] = useState<NaturePreset | null>(null)
  const [natureVolume, setNatureVolumeState] = useState(0.6)

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Il KU Point deve riflettere un vero ascolto, non un click — vedi
  // MIN_LISTEN_SECONDS_FOR_POINT in lib/neurobalancePresets.ts.
  const listenedSecondsRef = useRef(0)
  const pointAwardedRef = useRef(false)
  const natureEngineRef = useRef<NatureSoundsEngine | null>(null)

  useEffect(() => {
    natureEngineRef.current = new NatureSoundsEngine()
    return () => natureEngineRef.current?.stop()
  }, [])

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

  const stopAudio = () => {
    oscillatorsRef.current.forEach((oscillator) => oscillator.stop())
    oscillatorsRef.current = []
    setIsPlaying(false)
  }

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
    const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0]
    const carrier = selectedSpecialSound?.frequency ?? selected.carrier
    const beat = selectedSpecialSound ? 4 : selected.beat
    await playWith(carrier, beat, selectedSpecialSound ? 15 * 60 : selected.duration * 60)
  }

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
    const selected = presets.find((preset) => preset.id === selectedId) ?? presets[0]
    stopAudio()
    setRemaining(selectedSpecialSound ? 15 * 60 : selected.duration * 60)
  }

  const toggleNature = async (id: NaturePreset) => {
    const eng = natureEngineRef.current
    if (!eng || natureLoading) return
    if (activeNature === id) {
      eng.fadeStop()
      setActiveNature(null)
      return
    }
    setNatureLoading(id)
    try {
      await eng.start(id, natureVolume)
      setActiveNature(id)
    } catch (err) {
      console.error('[NeurobalanceAudio] failed to start nature sound:', id, err)
    } finally {
      setNatureLoading(null)
    }
  }

  const setNatureVolume = (v: number) => {
    setNatureVolumeState(v)
    natureEngineRef.current?.setVolume(v)
  }

  const stopEverything = () => {
    stopAudio()
    natureEngineRef.current?.fadeStop()
    setActiveNature(null)
  }

  return (
    <NeurobalanceAudioContext.Provider
      value={{
        presets,
        specialSounds,
        selectedId,
        isPlaying,
        remaining,
        volume,
        selectedSpecialSound,
        activeNature,
        natureLoading,
        natureVolume,
        handlePresetCardClick,
        handleSpecialSoundCardClick,
        togglePlayback,
        resetSession,
        setVolume: setVolumeState,
        toggleNature,
        setNatureVolume,
        stopEverything,
      }}
    >
      {children}
    </NeurobalanceAudioContext.Provider>
  )
}
