export type MessageType = 'broadcast' | 'individual'

// {it: '...', en: '...', ...} for a broadcast translated into all 7 site
// locales, or just one key for an individual message written in whichever
// language the admin typed it in.
export type LocalizedText = Record<string, string>

export interface AdminMessageRow {
  id: string
  type: MessageType
  target_user_id: string | null
  title: LocalizedText
  body: LocalizedText
  is_active: boolean
  created_by: string | null
  created_at: string
}

/**
 * Resolves the right-language copy for the viewer: their own site locale,
 * falling back to Italian, then to whatever single key exists — this same
 * function works unchanged for a 7-language broadcast and for an
 * individual message that only ever has one key filled in.
 */
export function getLocalizedMessageText(text: LocalizedText, locale: string): string {
  if (text[locale]) return text[locale]
  if (text.it) return text.it
  const firstKey = Object.keys(text)[0]
  return firstKey ? text[firstKey] : ''
}
