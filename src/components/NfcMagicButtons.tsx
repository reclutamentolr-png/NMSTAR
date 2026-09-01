'use client'

type Profile = {
  first_name: string
  last_name: string
  email?: string
  phone?: string
}

type NfcMagicButtonsProps = {
  profile: Profile
  referralUrl: string
}

export default function NfcMagicButtons({ profile, referralUrl }: NfcMagicButtonsProps) {
  
  const downloadVCard = () => {
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile.first_name} ${profile.last_name}`,
      `N:${profile.last_name};${profile.first_name};;;`,
      profile.email ? `EMAIL;TYPE=INTERNET:${profile.email}` : '',
      profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : '',
      `NOTE:Unisciti al mio team: ${referralUrl}`,
      'END:VCARD'
    ].filter(Boolean).join('\n')

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${profile.first_name}_${profile.last_name}.vcf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={downloadVCard}
        className="w-full py-4 bg-white text-indigo-600 font-bold text-lg rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-2xl">💾</span>
        SALVA CONTATTO
      </button>

      <a
        href={referralUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-4 bg-indigo-800/50 text-white font-semibold text-center rounded-xl border border-white/20 hover:bg-indigo-800/70 transition-all"
      >
         Unisciti al mio team!
      </a>
    </div>
  )
}