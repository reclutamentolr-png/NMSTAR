'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

type Props = {
  referralCode: string
  referralUrl: string
  userName: string
}

export default function QRGeneratorTool({ referralCode, referralUrl, userName }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [fgColor, setFgColor] = useState('#4f46e5') // Indigo-600
  const [bgColor, setBgColor] = useState('#ffffff')
  const [loading, setLoading] = useState(true)

  // Genera il QR code quando cambiano i colori o l'URL
  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(referralUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor
          },
          errorCorrectionLevel: 'H' // Alta correzione errori (utile se si aggiunge un logo in futuro)
        })
        setQrDataUrl(url)
        setLoading(false)
      } catch (err) {
        console.error(err)
      }
    }
    generateQR()
  }, [referralUrl, fgColor, bgColor])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.download = `QR-${referralCode}.png`
    link.href = qrDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        
        {/* COLONNA SINISTRA: Controlli */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Personalizza il tuo QR</h3>
          
          <div className="space-y-6">
            {/* Info Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link di destinazione</label>
              <div className="bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-600 font-mono break-all">
                {referralUrl}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Questo link è bloccato per garantire il tracciamento dei tuoi affiliati.
              </p>
            </div>

            {/* Colore QR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Colore del QR Code</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-10 w-14 rounded cursor-pointer border border-gray-300"
                />
                <input 
                  type="text" 
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm font-mono uppercase"
                />
              </div>
            </div>

            {/* Colore Sfondo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Colore di Sfondo</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-14 rounded cursor-pointer border border-gray-300"
                />
                <input 
                  type="text" 
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm font-mono uppercase"
                />
              </div>
            </div>

            {/* Colori Preimpostati */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temi rapidi</label>
              <div className="flex gap-2">
                <button onClick={() => { setFgColor('#4f46e5'); setBgColor('#ffffff') }} className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow ring-1 ring-gray-200"></button>
                <button onClick={() => { setFgColor('#000000'); setBgColor('#ffffff') }} className="w-8 h-8 rounded-full bg-black border-2 border-white shadow ring-1 ring-gray-200"></button>
                <button onClick={() => { setFgColor('#ffffff'); setBgColor('#000000') }} className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 shadow ring-1 ring-gray-200"></button>
                <button onClick={() => { setFgColor('#059669'); setBgColor('#ecfdf5') }} className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow ring-1 ring-gray-200"></button>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: Anteprima e Download */}
        <div className="p-8 flex flex-col items-center justify-center bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-6 w-full text-left">Anteprima</h3>
          
          <div className="relative group">
            {loading ? (
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center animate-pulse">
                <span className="text-gray-400">Generazione...</span>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
          </div>

          <div className="mt-8 w-full max-w-xs space-y-3">
            <button 
              onClick={handleDownload}
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Scarica PNG
            </button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Generato per <span className="font-semibold text-gray-700">{userName}</span>
              </p>
              <p className="text-xs font-mono text-indigo-600 mt-1">{referralCode}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}