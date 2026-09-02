import { createClient } from '@/lib/supabase/server'
import Link from 'next/link' // ✅ Corretto
import { 
  Link2, 
  Camera, 
  AtSign,
  Play,
  Briefcase,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react'
// 
import ShareButton from '@/components/ShareButton' // ✅ IMPORT DEL COMPONENTE CLIENT

export default async function LinkInBioPublicPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = await params
  const code = resolvedParams.code
  
  const supabase = await createClient()

  // 1. Trova il profilo
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      referral_code,
      email,
      phone,
      country_code,
      occupation
    `)
    .eq('referral_code', code)
    .single()

  if (error || !profile) {
    notFound()
  }

  // 2. Trova la bio e i link personalizzati (se esistono)
  const { data: linkInBio } = await supabase
    .from('link_in_bio')
    .select('*')
    .eq('user_id', profile.id)
    .single()

  // Link di default se non ci sono link personalizzati
  const defaultLinks = [
    {
      id: 'referral',
      title: '🚀 Unisciti al mio team',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/ref/${code}`,
      icon: 'referral',
      enabled: true
    }
  ]

  // Combina link personalizzati con quello di referral
  const links = linkInBio?.links 
    ? [...JSON.parse(linkInBio.links), ...defaultLinks]
    : defaultLinks

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const profileUrl = `${baseUrl}/ref/${code}`

  // Mappa sicura delle icone (usando solo icone garantite in lucide-react)
  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      instagram: Camera,
      facebook: Globe,
      twitter: AtSign,
      youtube: Play,
      linkedin: Briefcase,
      website: Globe,
      email: Mail,
      phone: Phone,
      location: MapPin,
      referral: Link2,
      default: ExternalLink
    }
    return icons[iconName?.toLowerCase()] || icons.default
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Card Principale */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          
          {/* Avatar */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-28 h-28 rounded-full bg-white text-pink-600 flex items-center justify-center text-5xl font-bold shadow-xl mb-4 border-4 border-white/30">
              {(profile.first_name || 'U').charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {profile.first_name} {profile.last_name}
            </h1>
            {profile.occupation && (
              <p className="text-white/80 text-sm mb-2">{profile.occupation}</p>
            )}
            {linkInBio?.bio_text ? (
              <p className="text-white/90 text-sm leading-relaxed">{linkInBio.bio_text}</p>
            ) : (
              <p className="text-white/70 text-sm">Network Marketing Professional</p>
            )}
          </div>

          {/* Link */}
          <div className="space-y-3 mb-8">
            {links.filter((l: any) => l.enabled !== false).map((link: any, index: number) => {
              const Icon = getIcon(link.icon)
              return (
                <a
                  key={link.id || index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 bg-white/90 hover:bg-white backdrop-blur rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-white/50"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="flex-1 text-gray-900 font-semibold text-center">
                    {link.title}
                  </span>
                  <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )
            })}
          </div>

          {/* Social Icons (se presenti nel profilo) */}
          {linkInBio?.social_links && (
            <div className="flex justify-center gap-4 mb-6">
              {JSON.parse(linkInBio.social_links).map((social: any, idx: number) => {
                const Icon = getIcon(social.platform)
                return (
                  <a
                    key={idx}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all hover:scale-110"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          )}

          {/* ✅ PULSANTE CONDIVIDI CORRETTO (usa il Client Component) */}
          <div className="flex justify-center mb-4">
            <ShareButton url={profileUrl} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-xs">
            Powered by <span className="font-semibold">Network Marketing Program</span>
          </p>
        </div>
      </div>
    </div>
  )
}