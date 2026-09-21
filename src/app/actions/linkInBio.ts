'use server'

import { createClient } from '@/lib/supabase/server'
import { awardToolPoint } from '@/lib/toolPoints'

type LinkItem = {
  id: string
  title: string
  url: string
  icon: string
  enabled: boolean
}

export async function saveLinkInBio(bioText: string, links: LinkItem[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase.from('link_in_bio').upsert(
    {
      user_id: user.id,
      bio_text: bioText,
      links: JSON.stringify(links.filter((l) => l.title && l.url)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) return { success: false }

  await awardToolPoint('link-in-bio')
  return { success: true }
}
