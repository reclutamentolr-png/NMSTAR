'use client'

import { useSearchParams } from 'next/navigation'

/**
 * Threads the dashboard-vs-marketplace origin (?from=dashboard, set by
 * CategoryToolsAccordion when Tipo 2's dashboard links straight into a
 * tool — see ToolBackLink.tsx) through a tool's own internal navigation,
 * so the top "back" link still points at the Dashboard instead of
 * defaulting to Marketplace after navigating deeper into the tool (e.g.
 * list → new/detail → back to list) and losing the query param.
 */
export function useFromDashboardSuffix(): string {
  const searchParams = useSearchParams()
  return searchParams.get('from') === 'dashboard' ? '?from=dashboard' : ''
}
