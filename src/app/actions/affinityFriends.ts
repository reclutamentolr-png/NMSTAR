'use server'

import { createClient } from '@/lib/supabase/server'
import type { AffinityArchetype, AffinityMap } from '@/lib/affinity'

// Affinity Amicizie: tutte le regole (requisiti, presentazioni, match, chat,
// blocchi) vivono nelle funzioni SQL; qui solo il passaggio dal browser.

export type FriendsStatus = 'ok' | 'no_plan' | 'no_age' | 'underage' | 'no_map' | 'blocked'
export type IntroStatus = 'pending' | 'waiting' | 'match' | 'declined' | 'closed'

export type FriendIntro = {
  id: string
  week: string
  other_id: string
  first_name: string | null
  city: string | null
  verified: boolean
  archetype: AffinityArchetype | null
  map: AffinityMap | null
  bio: string | null
  score: number
  status: IntroStatus
  unread: number
}

export type FriendsOverview = {
  status: FriendsStatus
  has_map: boolean
  opted_in: boolean
  bio: string | null
  languages: string[]
  per_week: number
  intros: FriendIntro[]
}

export type ChatMessage = { id: string; mine: boolean; body: string; created_at: string }

export async function getFriendsOverview(): Promise<FriendsOverview | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('affinity_friends_overview')
  if (error || !data) return null
  return data as FriendsOverview
}

export async function setFriendsParticipation(on: boolean, bio: string, languages: string[]): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('affinity_set_friends', { p_on: on, p_bio: bio, p_languages: languages })
  if (error) return 'error'
  return String(data)
}

export async function respondToIntro(introId: string, yes: boolean): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('affinity_respond', { p_intro: introId, p_yes: yes })
  if (error) return 'error'
  return String(data)
}

export async function blockAffinityUser(otherId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('affinity_block', { p_other: otherId })
  return data === true
}

export async function reportAffinityUser(otherId: string, reason: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('affinity_report', { p_other: otherId, p_reason: reason })
  return data === true
}

export async function loadAffinityChat(introId: string): Promise<ChatMessage[] | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('affinity_chat', { p_intro: introId })
  if (error || !data) return null
  return data as ChatMessage[]
}

export async function sendAffinityMessage(introId: string, body: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('affinity_send', { p_intro: introId, p_body: body })
  if (error) return 'error'
  return String(data)
}

// Novità per il pallino in dashboard (solo per chi partecipa ad Amicizie).
export async function getAffinityBadge(): Promise<{ active: boolean; unread: number; pending: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { active: false, unread: 0, pending: 0 }
  const [{ data: profile }, { data: badge }] = await Promise.all([
    supabase.from('affinity_profiles').select('opt_friends').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('affinity_badge'),
  ])
  const counts = (badge ?? {}) as { unread_messages?: number; pending_intros?: number }
  return {
    active: profile?.opt_friends === true,
    unread: Number(counts.unread_messages ?? 0),
    pending: Number(counts.pending_intros ?? 0),
  }
}
