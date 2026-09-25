// KUMANI Fidelity (Kumi Card) — tipi e costanti condivisi tra server
// action, pagine e componenti client. Niente import server-only qui.

export interface FidelityCard {
  id: string
  owner_id: string
  business_name: string
  prize: string
  stamps_needed: number
  min_hours_between_stamps: number
  stamps_expire_days: number | null
  review_url: string | null
  close_to_prize_percent: number
  is_active: boolean
  created_at: string
}

export interface FidelityMember {
  id: string
  card_id: string
  member_code: string
  stamps_count: number
  total_stamps: number
  rewards_redeemed: number
  last_stamp_at: string | null
  customer_name: string | null
  contact_phone: string | null
  marketing_consent: boolean
  review_bonus_at: string | null
  last_contacted_at: string | null
  created_at: string
}

// 'review' = timbro bonus per la recensione (uno per tessera).
export type FidelityKind = 'stamp' | 'redeem' | 'review'

// Esiti di fidelity_apply / fidelity_use_claim (vedi migrazione).
export type FidelityStatus =
  | 'ok'
  | 'redeemed'
  | 'too_soon'
  | 'full'
  | 'not_full'
  | 'inactive'
  | 'not_found'
  | 'invalid'
  | 'used'
  | 'expired'
  | 'no_card'
  | 'review_done'
  | 'review_disabled'

export const FIDELITY_DEFAULT_STAMPS = 10
export const FIDELITY_MIN_STAMPS = 2
export const FIDELITY_MAX_STAMPS = 30
export const FIDELITY_DEFAULT_MIN_HOURS = 24
export const FIDELITY_MAX_MIN_HOURS = 168
export const FIDELITY_MAX_QUANTITY = 5
// Durata del QR usa e getta mostrato in cassa.
export const FIDELITY_CLAIM_TTL_SECONDS = 90
export const FIDELITY_PIN_PATTERN = /^\d{4,6}$/

// Scadenza timbri: opzioni offerte al commerciante (giorni senza timbri).
export const FIDELITY_EXPIRY_OPTIONS = [90, 180, 365] as const
// "Vicini al premio": clienti che hanno raggiunto questa % dei timbri.
export const FIDELITY_DEFAULT_CLOSE_PERCENT = 80
export const FIDELITY_MIN_CLOSE_PERCENT = 50
export const FIDELITY_MAX_CLOSE_PERCENT = 95
// Un cliente è "perso" se non riceve timbri da così tanti giorni.
export const FIDELITY_LOST_AFTER_DAYS = 60
// Sotto questa pausa la lista segnala "contattato di recente".
export const FIDELITY_CONTACT_COOLDOWN_DAYS = 7
// Telefono per WhatsApp: cifre con prefisso internazionale facoltativo.
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '')
  return /^\+?[0-9]{6,15}$/.test(cleaned) ? cleaned : null
}

// Data di scadenza dei timbri di una tessera (null = non scadono o niente da perdere).
export function stampsExpireAt(
  card: Pick<FidelityCard, 'stamps_expire_days' | 'stamps_needed'>,
  member: Pick<FidelityMember, 'stamps_count' | 'last_stamp_at'>
): Date | null {
  if (!card.stamps_expire_days || !member.last_stamp_at) return null
  if (member.stamps_count <= 0 || member.stamps_count >= card.stamps_needed) return null
  return new Date(new Date(member.last_stamp_at).getTime() + card.stamps_expire_days * 24 * 3600 * 1000)
}

// Cliente "vicino al premio": ha almeno la % impostata dei timbri ma non
// ha ancora completato la tessera.
export function isCloseToPrize(
  card: Pick<FidelityCard, 'stamps_expire_days' | 'stamps_needed' | 'close_to_prize_percent'>,
  member: Pick<FidelityMember, 'stamps_count' | 'last_stamp_at'>
): boolean {
  const stamps = effectiveStamps(card, member)
  return stamps < card.stamps_needed && stamps * 100 >= card.stamps_needed * card.close_to_prize_percent
}

// Scadenza ancora da venire (le pagine server la mostrano solo se futura).
export function isFutureDate(date: Date | null): date is Date {
  return !!date && date.getTime() > Date.now()
}

// Timbri "effettivi": se sono già scaduti (azzeramento pigro non ancora
// avvenuto nel DB) la tessera va mostrata vuota.
export function effectiveStamps(
  card: Pick<FidelityCard, 'stamps_expire_days' | 'stamps_needed'>,
  member: Pick<FidelityMember, 'stamps_count' | 'last_stamp_at'>
): number {
  const expiry = stampsExpireAt(card, member)
  return expiry && expiry.getTime() < Date.now() ? 0 : member.stamps_count
}

// Il QR personale della tessera contiene questo prefisso + member_code: lo
// scanner della cassa lo riconosce e ignora qualsiasi altro QR.
export const FIDELITY_MEMBER_QR_PREFIX = 'KUMICARD:'

export function parseMemberQr(raw: string): string | null {
  const value = raw.trim()
  const code = value.startsWith(FIDELITY_MEMBER_QR_PREFIX) ? value.slice(FIDELITY_MEMBER_QR_PREFIX.length) : value
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return normalized.length === 8 ? normalized : null
}
