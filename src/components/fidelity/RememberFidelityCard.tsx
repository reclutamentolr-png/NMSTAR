'use client'

import { useEffect } from 'react'
import { rememberFidelityCard } from '@/app/actions/fidelity'

// Chi apre il link della tessera (salvato, o su un altro browser) se la
// ritrova poi nel portafoglio /f di questo browser.
export default function RememberFidelityCard({ token }: { token: string }) {
  useEffect(() => {
    rememberFidelityCard(token)
  }, [token])
  return null
}
