export const CATEGORIES = [
  'person',
  'auto',
  'home',
  'family',
  'contracts',
  'warranties',
  'subscriptions',
  'work',
  'travel',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const RECURRENCE_OPTIONS = ['none', 'monthly', 'yearly', 'every_2_years', 'custom'] as const
export type Recurrence = (typeof RECURRENCE_OPTIONS)[number]

export type ItemStatus = 'regular' | 'upcoming' | 'urgent' | 'expired'

export interface LifeCalendarItemFormData {
  title: string
  category: Category
  profileId: string | null
  dueDate: string // ISO date (YYYY-MM-DD)
  notes: string
  reminderOffsets: number[]
  recurrence: Recurrence
  recurrenceCustomDays: number | null
}

// Reminder-day presets per category — used only to pre-check the form's
// reminder checkboxes; the user can still edit them before saving. Purely
// data, no AI, no notification is actually sent in V1.
export const REMINDER_PRESETS: Record<Category, number[]> = {
  person: [90, 30, 7],
  auto: [60, 30, 7, 1],
  home: [30, 7],
  family: [90, 30, 7],
  contracts: [30, 7],
  warranties: [30, 7],
  subscriptions: [14, 7, 1],
  work: [30, 7],
  travel: [60, 30, 7],
  other: [30, 7],
}

export function getItemStatus(dueDate: string): ItemStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const daysUntil = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) return 'expired'
  if (daysUntil <= 7) return 'urgent'
  if (daysUntil <= 30) return 'upcoming'
  return 'regular'
}

export function daysUntil(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function computeNextDueDate(
  currentDueDate: string,
  recurrence: Recurrence,
  customDays: number | null
): string | null {
  const date = new Date(currentDueDate)
  switch (recurrence) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    case 'every_2_years':
      date.setFullYear(date.getFullYear() + 2)
      break
    case 'custom':
      if (!customDays) return null
      date.setDate(date.getDate() + customDays)
      break
    case 'none':
    default:
      return null
  }
  return date.toISOString().slice(0, 10)
}
