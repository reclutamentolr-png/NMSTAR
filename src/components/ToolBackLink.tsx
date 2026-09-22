'use client'

import { useSearchParams } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import type { ComponentProps, ReactNode } from 'react'

// Marketplace tool pages link "back" to /marketplace by default — correct
// when the user browsed in via the Marketplace category grid. But Tipo 2's
// dashboard links directly into tools (bypassing /marketplace entirely),
// tagging its links with ?from=dashboard so both the destination AND the
// visible label switch to "Torna alla Dashboard" instead of "Torna al
// Marketplace" — showing the marketplace label while landing on /dashboard
// would read as a mistake.
export default function ToolBackLink({
  children,
  dashboardLabel,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href' | 'children'> & {
  children: ReactNode
  dashboardLabel: ReactNode
}) {
  const searchParams = useSearchParams()
  const cameFromDashboard = searchParams.get('from') === 'dashboard'

  return (
    <Link href={cameFromDashboard ? '/dashboard' : '/marketplace'} {...props}>
      {cameFromDashboard ? dashboardLabel : children}
    </Link>
  )
}
