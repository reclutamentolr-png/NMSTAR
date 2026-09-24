// Kumano del Giorno — tipi condivisi tra server actions, pagina di gestione
// (/marketplace/spotlight) e vetrina pubblica (/spotlight).

export interface SpotlightProfile {
  id: string
  user_id: string
  display_name: string
  city: string | null
  country: string | null
  profession: string | null
  story: string
  favorite_tools: string[]
  is_opted_in: boolean
  created_at: string
  updated_at: string
}

export const SPOTLIGHT_STORY_MAX_LENGTH = 400

/**
 * get_todays_kumano() è dichiarata "returns spotlight_profiles" (non
 * SETOF): quando non c'è ancora nessuno in vetrina, PostgREST restituisce
 * comunque un oggetto con tutti i campi a null invece di un null secco —
 * questo helper lo riconosce.
 */
export function isEmptySpotlightProfile(profile: SpotlightProfile | null | undefined): boolean {
  return !profile?.id
}
