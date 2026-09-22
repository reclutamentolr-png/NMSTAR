// Registry of available dashboard layouts. Adding a new one later means:
// 1) add an entry here, 2) build its component under components/dashboard/,
// 3) branch on it in dashboard/page.tsx — the admin panel's picker (which
// reads this list) needs no further change.
export const DASHBOARD_LAYOUTS = [
  {
    id: 'tipo1',
    name: 'Tipo 1 — Classica',
    description: 'Tutto in un\'unica pagina: strumenti, rete, matrice e obiettivi insieme (versione storica).',
  },
  {
    id: 'tipo2',
    name: 'Tipo 2 — Marketplace in primo piano',
    description: 'La dashboard mostra prima gli strumenti del Marketplace; rete, KUMI e matrice si spostano in un\'area dedicata "La mia Rete".',
  },
] as const

export type DashboardLayoutId = (typeof DASHBOARD_LAYOUTS)[number]['id']

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutId = 'tipo1'

export function isValidDashboardLayout(value: unknown): value is DashboardLayoutId {
  return DASHBOARD_LAYOUTS.some((layout) => layout.id === value)
}
