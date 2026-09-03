'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getMaintenanceGate } from '@/app/actions/system'
import MaintenanceScreen from './MaintenanceScreen'

type MaintenanceGateProps = {
  children: React.ReactNode
}

export default function MaintenanceGate({ children }: MaintenanceGateProps) {
  const pathname = usePathname()
  const [status, setStatus] = useState<{ enabled: boolean; message: string } | null>(null)

  // Route sempre accessibili
  const isExempt = pathname?.includes('/admin') || pathname?.includes('/auth/')

  useEffect(() => {
    console.log('🟢 [GATE CLIENT] Mount MaintenanceGate')
    console.log('🟢 [GATE CLIENT] Pathname corrente:', pathname)
    console.log('🟢 [GATE CLIENT] isExempt:', isExempt)

    if (isExempt) {
      console.log('🟢 [GATE CLIENT] → Route exempt, skip controllo')
      setStatus({ enabled: false, message: '' })
      return
    }

    console.log('🟢 [GATE CLIENT] → Chiamo getMaintenanceGate()...')
    getMaintenanceGate()
      .then((s) => {
        console.log('🟢 [GATE CLIENT] Risposta ricevuta:', s)
        setStatus({ enabled: s.enabled, message: s.message })
      })
      .catch((err) => {
        console.error('🟢 [GATE CLIENT] Errore chiamata:', err)
        setStatus({ enabled: false, message: '' })
      })
  }, [isExempt, pathname])

  // Durante il caricamento, mostra il contenuto normale (evita flash)
  if (status === null) {
    console.log('🟢 [GATE CLIENT] Stato null, mostro children')
    return <>{children}</>
  }

  if (status.enabled && !isExempt) {
    console.log('🟢 [GATE CLIENT] ⛔ MOSTRO SCHERMATA MANUTENZIONE')
    return <MaintenanceScreen message={status.message} />
  }

  console.log('🟢 [GATE CLIENT] ✅ Mostro children (sito normale)')
  return <>{children}</>
}