'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SPOTLIGHT_STORY_MAX_LENGTH } from '@/lib/spotlight'

export interface SpotlightFormData {
  displayName: string
  city: string
  country: string
  profession: string
  story: string
  favoriteTools: string[]
}

type ActionResult = { success: true } | { success: false; message: 'notAuthenticated' | 'saveError' }

export async function upsertSpotlightProfile(form: SpotlightFormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'notAuthenticated' }

  const displayName = form.displayName.trim()
  const story = form.story.trim()
  if (!displayName || !story || story.length > SPOTLIGHT_STORY_MAX_LENGTH) {
    return { success: false, message: 'saveError' }
  }

  const { error } = await supabase.from('spotlight_profiles').upsert(
    {
      user_id: user.id,
      display_name: displayName,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      profession: form.profession.trim() || null,
      story,
      favorite_tools: form.favoriteTools,
      is_opted_in: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) return { success: false, message: 'saveError' }

  revalidatePath('/marketplace/spotlight')
  revalidatePath('/spotlight')
  return { success: true }
}

export async function revokeSpotlightOptIn(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'notAuthenticated' }

  const { error } = await supabase.from('spotlight_profiles').update({ is_opted_in: false }).eq('user_id', user.id)
  if (error) return { success: false, message: 'saveError' }

  revalidatePath('/marketplace/spotlight')
  revalidatePath('/spotlight')
  return { success: true }
}

export async function deleteSpotlightProfile(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'notAuthenticated' }

  const { error } = await supabase.from('spotlight_profiles').delete().eq('user_id', user.id)
  if (error) return { success: false, message: 'saveError' }

  revalidatePath('/marketplace/spotlight')
  revalidatePath('/spotlight')
  return { success: true }
}
