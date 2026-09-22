'use server'

import { createClient } from '@/lib/supabase/server'
import { hasActiveAureyaAccess } from '@/lib/aureya-server'
import {
  computeAcousticScore,
  computeVisualScore,
  type AcousticTestResult,
  type VisualTestResult,
} from '@/lib/aureya'

type ActionResult<T> = { success: true; data: T } | { success: false; message: string }

async function requireActiveAureyaAccess(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: 'notLoggedIn' }
  }

  const hasAccess = await hasActiveAureyaAccess(supabase, user.id)
  if (!hasAccess) {
    return { ok: false, message: 'subscriptionRequired' }
  }

  return { ok: true, userId: user.id }
}

export async function saveAcousticTestResult(result: AcousticTestResult): Promise<ActionResult<{ id: string }>> {
  const gate = await requireActiveAureyaAccess()
  if (!gate.ok) return { success: false, message: gate.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('aureya_test_results')
    .insert({
      user_id: gate.userId,
      test_type: 'acoustic',
      result,
      score: computeAcousticScore(result.thresholds),
      device_confirmation: result.device,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[Aureya] saveAcousticTestResult failed:', error)
    return { success: false, message: 'saveError' }
  }

  return { success: true, data: { id: data.id } }
}

export async function saveVisualTestResult(result: VisualTestResult): Promise<ActionResult<{ id: string }>> {
  const gate = await requireActiveAureyaAccess()
  if (!gate.ok) return { success: false, message: gate.message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('aureya_test_results')
    .insert({
      user_id: gate.userId,
      test_type: 'visual',
      result,
      score: computeVisualScore(result.eyes),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[Aureya] saveVisualTestResult failed:', error)
    return { success: false, message: 'saveError' }
  }

  return { success: true, data: { id: data.id } }
}

export async function deleteTestResult(id: string): Promise<ActionResult<null>> {
  const gate = await requireActiveAureyaAccess()
  if (!gate.ok) return { success: false, message: gate.message }

  const supabase = await createClient()
  const { error } = await supabase.from('aureya_test_results').delete().eq('id', id).eq('user_id', gate.userId)

  if (error) {
    console.error('[Aureya] deleteTestResult failed:', error)
    return { success: false, message: 'deleteError' }
  }

  return { success: true, data: null }
}
