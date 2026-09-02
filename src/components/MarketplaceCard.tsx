'use client'

import Link from 'next/link'
import { 
  Smartphone, 
  Link2, 
  MessageCircle, 
  Brain,
  type LucideIcon 
} from 'lucide-react'

type MarketplaceCardProps = {
  toolName: string
  isEnabled: boolean
  href: string
  gradient: string
  iconName: string
  title: string
  description: string
  color: string
}

// Mappa dei nomi delle icone ai componenti Lucide
const iconMap: Record<string, LucideIcon> = {
  'Smartphone': Smartphone,
  'Link2': Link2,
  'MessageCircle': MessageCircle,
  'Brain': Brain,
}

export default function MarketplaceCard({
  toolName,
  isEnabled,
  href,
  gradient,
  iconName,
  title,
  description,
  color,
}: MarketplaceCardProps) {
  
  const Icon = iconMap[iconName] || Smartphone
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isEnabled) {
      e.preventDefault()
      alert(`Lo strumento "${title}" è temporaneamente non disponibile. Riprova più tardi.`)
    }
  }

  return (
    <Link
      href={isEnabled ? href : '#'}
      onClick={handleClick}
      className={`group block rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
        isEnabled
          ? 'bg-white hover:shadow-xl cursor-pointer'
          : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-70'
      }`}
    >
      <div
        className={`h-40 flex items-center justify-center ${
          isEnabled ? gradient : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}
      >
        <Icon className="w-20 h-20 text-white" />
      </div>
      <div className="p-6 relative">
        {!isEnabled && (
          <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            NON DISPONIBILE
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <h3
            className={`text-xl font-bold ${
              isEnabled ? 'text-gray-900 group-hover:text-' + color + '-600' : 'text-gray-500'
            }`}
          >
            {title}
          </h3>
          {isEnabled && (
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              GRATIS
            </span>
          )}
        </div>
        <p className={`text-sm mb-4 ${isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
          {description}
        </p>
        {isEnabled ? (
          <span className={`text-${color}-600 font-semibold text-sm group-hover:underline`}>
            Usa lo strumento →
          </span>
        ) : (
          <span className="text-gray-400 font-semibold text-sm">Temporaneamente offline</span>
        )}
      </div>
    </Link>
  )
}