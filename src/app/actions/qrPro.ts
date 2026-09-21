'use server'

import { createClient } from '@/lib/supabase/server'
import { hasActiveQrProAccess } from '@/lib/qrPro-server'
import { generateShortCode } from '@/lib/shortLink'
import type { QrCodeFormData } from '@/lib/qrPro'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

async function requireActiveQrProAccess(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: 'notLoggedIn' }
  }

  const hasAccess = await hasActiveQrProAccess(supabase, user.id)
  if (!hasAccess) {
    return { ok: false, message: 'subscriptionRequired' }
  }

  return { ok: true, userId: user.id }
}

export async function createQrCode(form: QrCodeFormData): Promise<ActionResult<{ id: string; code: string }>> {
  const gate = await requireActiveQrProAccess()
  if (!gate.ok) {
    return { success: false, message: gate.message }
  }

  const supabase = await createClient()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode()
    const { data, error } = await supabase
      .from('qr_pro_codes')
      .insert({
        user_id: gate.userId,
        code,
        label: form.label,
        content_type: form.contentType,
        destination: form.destination,
        fg_color: form.fgColor,
        bg_color: form.bgColor,
      })
      .select('id, code')
      .single()

    if (!error && data) {
      return { success: true, data: { id: data.id, code: data.code } }
    }

    if (error && error.code !== '23505') {
      console.error('[QrPro] createQrCode failed:', error)
      return { success: false, message: 'saveError' }
    }
  }

  return { success: false, message: 'saveError' }
}

export async function updateQrCode(id: string, form: QrCodeFormData): Promise<ActionResult<null>> {
  const gate = await requireActiveQrProAccess()
  if (!gate.ok) {
    return { success: false, message: gate.message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('qr_pro_codes')
    .update({
      label: form.label,
      content_type: form.contentType,
      destination: form.destination,
      fg_color: form.fgColor,
      bg_color: form.bgColor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', gate.userId)

  if (error) {
    console.error('[QrPro] updateQrCode failed:', error)
    return { success: false, message: 'saveError' }
  }

  return { success: true, data: null }
}

export async function deleteQrCode(id: string): Promise<ActionResult<null>> {
  const gate = await requireActiveQrProAccess()
  if (!gate.ok) {
    return { success: false, message: gate.message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('qr_pro_codes').delete().eq('id', id).eq('user_id', gate.userId)

  if (error) {
    console.error('[QrPro] deleteQrCode failed:', error)
    return { success: false, message: 'deleteError' }
  }

  return { success: true, data: null }
}
