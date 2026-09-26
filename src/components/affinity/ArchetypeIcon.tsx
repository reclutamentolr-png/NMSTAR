import { Flame, TowerControl, TreePine, Waves, Wind, type LucideIcon } from 'lucide-react'
import type { AffinityArchetype } from '@/lib/affinity'

const ICONS: Record<AffinityArchetype, LucideIcon> = {
  faro: TowerControl,
  marea: Waves,
  bosco: TreePine,
  brace: Flame,
  vento: Wind,
}

export default function ArchetypeIcon({ archetype, className }: { archetype: AffinityArchetype; className?: string }) {
  const Icon = ICONS[archetype]
  return <Icon className={className} strokeWidth={1.8} />
}
