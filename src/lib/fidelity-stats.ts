// Statistiche della Kumi Card, derivate da fidelity_events e
// fidelity_members (nessuna tabella dedicata). Tutti i raggruppamenti per
// giorno/ora usano il fuso del negozio (Europe/Rome), non quello del server.

import { FIDELITY_LOST_AFTER_DAYS } from '@/lib/fidelity'

export const FIDELITY_STATS_TIMEZONE = 'Europe/Rome'
export const FIDELITY_STATS_WEEKS = 12

export interface FidelityEventRow {
  member_id: string
  kind: string
  quantity: number
  created_at: string
}

export interface FidelityStats {
  stampsToday: number
  weekly: { weekStart: string; stamps: number }[]
  byWeekday: number[] // 0 = lunedì … 6 = domenica
  byHour: number[] // 0 … 23
  avgReturnDays: number | null
  activeCustomers: number // timbri negli ultimi 30 giorni
  lostCustomers: number // nessun timbro da FIDELITY_LOST_AFTER_DAYS giorni
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: FIDELITY_STATS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
})
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function romeParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  }
}

// Lunedì (YYYY-MM-DD, calendario italiano) della settimana di una data.
function weekStartOf(day: string, weekday: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - weekday)
  return d.toISOString().slice(0, 10)
}

// Inizio della finestra di eventi da caricare per le statistiche (con una
// settimana di margine per la settimana in corso).
export function statsWindowStartIso(): string {
  return new Date(Date.now() - (FIDELITY_STATS_WEEKS * 7 + 7) * 24 * 3600 * 1000).toISOString()
}

export function computeFidelityStats(
  events: FidelityEventRow[],
  members: { id: string; last_stamp_at: string | null }[]
): FidelityStats {
  const today = romeParts(new Date()).day
  const byWeekday = Array(7).fill(0)
  const byHour = Array(24).fill(0)
  const weeklyMap = new Map<string, number>()
  const stampDaysByMember = new Map<string, Set<string>>()
  let stampsToday = 0

  // Settimane mostrate: le ultime FIDELITY_STATS_WEEKS, anche se vuote.
  const nowParts = romeParts(new Date())
  const currentWeek = weekStartOf(nowParts.day, nowParts.weekday)
  const weeks: string[] = []
  for (let i = FIDELITY_STATS_WEEKS - 1; i >= 0; i--) {
    const d = new Date(`${currentWeek}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(d.toISOString().slice(0, 10))
  }
  weeks.forEach((w) => weeklyMap.set(w, 0))

  for (const event of events) {
    if (event.kind !== 'stamp') continue
    const parts = romeParts(new Date(event.created_at))
    const week = weekStartOf(parts.day, parts.weekday)
    if (weeklyMap.has(week)) weeklyMap.set(week, (weeklyMap.get(week) ?? 0) + event.quantity)
    // Giorni/ore di punta contano le visite, non il numero di timbri.
    byWeekday[parts.weekday] += 1
    byHour[parts.hour] += 1
    if (parts.day === today) stampsToday += event.quantity
    const days = stampDaysByMember.get(event.member_id) ?? new Set<string>()
    days.add(parts.day)
    stampDaysByMember.set(event.member_id, days)
  }

  // Frequenza media di ritorno: media dei giorni tra due visite consecutive
  // dello stesso cliente (solo clienti con almeno due visite).
  const gaps: number[] = []
  for (const days of stampDaysByMember.values()) {
    const sorted = [...days].sort()
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (24 * 3600 * 1000))
    }
  }
  const avgReturnDays = gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null

  const now = Date.now()
  const activeCustomers = members.filter((m) => m.last_stamp_at && now - new Date(m.last_stamp_at).getTime() <= 30 * 24 * 3600 * 1000).length
  const lostCustomers = members.filter(
    (m) => m.last_stamp_at && now - new Date(m.last_stamp_at).getTime() > FIDELITY_LOST_AFTER_DAYS * 24 * 3600 * 1000
  ).length

  return {
    stampsToday,
    weekly: weeks.map((weekStart) => ({ weekStart, stamps: weeklyMap.get(weekStart) ?? 0 })),
    byWeekday,
    byHour,
    avgReturnDays,
    activeCustomers,
    lostCustomers,
  }
}
