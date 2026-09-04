'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share, PlusSquare, Rocket } from 'lucide-react'

export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // ✅ Non mostrare se: già rifiutato in passato o app già installata
    const dismissed = localStorage.getItem('install_prompt_dismissed')
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (dismissed || isStandalone) return

    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(iOS)

    // ✅ Android/Chrome/Desktop: intercetta il prompt nativo e mostra il nostro
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setVisible(true), 1500)
    }

    const onAppInstalled = () => {
      localStorage.setItem('install_prompt_dismissed', 'true')
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    // ✅ iOS: non esiste beforeinstallprompt → mostra il tutorial
    let timer: any
    if (iOS) {
      timer = setTimeout(() => setVisible(true), 1500)
    }

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('install_prompt_dismissed', 'true')
    }
    setDeferredPrompt(null)
    setVisible(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('install_prompt_dismissed', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Installa NMP</h3>
              <p className="text-indigo-100 text-sm">Accedi più velocemente, come una vera app</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {isIOS ? (
            /* ✅ iPhone/iPad: istruzioni passo-passo */
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Su iPhone/iPad bastano 2 tocchi:</p>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <p className="text-sm text-gray-700"><strong>1.</strong> Tocca <strong>Condividi</strong> in basso</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <p className="text-sm text-gray-700"><strong>2.</strong> Scegli <strong>"Aggiungi alla schermata Home"</strong></p>
              </div>
            </div>
          ) : (
            /* ✅ Android/Desktop: testo + pulsante nativo */
            <p className="text-sm text-gray-600">
              Aggiungi Network Marketing Program alla schermata home: avrai un'icona dedicata e si aprirà a schermo intero, senza la barra del browser.
            </p>
          )}

          <div className="flex gap-3 mt-5">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                <Download className="w-4 h-4" />
                Installa ora
              </button>
            )}
            <button
              onClick={handleDismiss}
              className={`py-3 rounded-xl font-semibold transition-colors ${
                deferredPrompt
                  ? 'px-4 bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
              }`}
            >
              {deferredPrompt ? 'Non ora' : 'Ho capito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}