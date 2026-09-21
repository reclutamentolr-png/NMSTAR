import { Crown, Users, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

type MatrixNode = {
  id: string
  user_id: string
  parent_id: string | null
  path: string
  level: number
  position: number
  depth: number
  created_at: string
  username?: string
  first_name?: string
  last_name?: string
  referral_code?: string
  country_code?: string
}

type MatrixTreeProps = {
  rootNode: MatrixNode
  descendants: MatrixNode[]
}

export default function MatrixTree({ rootNode, descendants }: MatrixTreeProps) {
  const t = useTranslations('dashboard')
  const directMembers = descendants
    .filter((node) => node.parent_id === rootNode.id)
    .sort((firstNode, secondNode) => firstNode.position - secondNode.position)

  const directSlots = Array.from({ length: 5 }, (_, index) => directMembers[index] || null)

  const getDownlineCount = (directMember: MatrixNode) =>
    descendants.filter((node) => node.path.startsWith(`${directMember.path}.`)).length

  const displayName = (node: MatrixNode) =>
    `${node.first_name || ''} ${node.last_name || ''}`.trim() || t('freeSlot')

  const renderMember = (member: MatrixNode | null, slotIndex: number) => {
    const isOccupied = Boolean(member)
    const downlineCount = member ? getDownlineCount(member) : 0

    return (
      <div key={member?.id || `empty-slot-${slotIndex}`} className="flex min-w-0 flex-col items-center text-center">
        <div className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-lg transition-transform sm:h-24 sm:w-24 ${
          isOccupied
            ? 'border-[var(--gold)] bg-[var(--ink)] text-[var(--gold-bright)] hover:-translate-y-1'
            : 'border-dashed border-stone-300 bg-stone-100 text-stone-400'
        }`}>
          {isOccupied ? <UserRound className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.6} /> : <span className="text-2xl">+</span>}
          <span className={`absolute -bottom-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            isOccupied ? 'border-[var(--gold)]/50 bg-[var(--gold-pale)] text-[var(--ink)]' : 'border-stone-300 bg-white text-stone-400'
          }`}>
            {slotIndex + 1}
          </span>
        </div>
        <p className={`mt-4 max-w-[130px] truncate text-sm font-bold ${isOccupied ? 'text-[var(--ink)]' : 'text-stone-400'}`}>
          {member ? displayName(member) : t('freeSlot')}
        </p>
        {isOccupied ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
            <Users className="h-3.5 w-3.5 text-[var(--gold)]" />
            {downlineCount === 0
              ? t('personUnder', { count: downlineCount })
              : t('peopleUnder', { count: downlineCount })}
          </p>
        ) : (
          <p className="mt-1 text-xs text-stone-400">{t('waitingForDirect')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--paper)] p-6 sm:p-8">
        <div className="flex flex-col items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--gold-bright)] bg-[var(--ink)] text-[var(--gold-bright)] shadow-[0_10px_30px_rgba(23,23,23,0.2)] sm:h-28 sm:w-28">
            <Crown className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <span className="mt-3 rounded-full bg-[var(--ink)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-bright)]">{t('owner')}</span>
          <p className="mt-2 text-lg font-bold text-[var(--ink)]">{displayName(rootNode)}</p>
          <p className="font-mono text-xs text-[var(--muted)]">{rootNode.referral_code || t('myPosition')}</p>
        </div>

        <div className="mx-auto mt-8 h-8 w-px bg-[var(--gold)]/50" />
        <div className="mx-auto mb-8 h-px w-[88%] bg-[var(--gold)]/50" />

        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-5 sm:gap-6">
          {directSlots.map(renderMember)}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
        <Users className="h-4 w-4 text-[var(--gold)]" />
        <span>{t('matrixInfo')}</span>
      </div>
    </div>
  )
}
