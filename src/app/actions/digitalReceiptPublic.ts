'use server'

// Intentionally NOT gated by auth/subscription: this is the one action meant
// to be called by an unauthenticated recipient confirming a delivery via a
// shared link/QR — the whole point of Digital Receipt (see findo.pdf... no,
// "Digital Receipt.pdf": "Marco → Mario" without requiring an account).
// Keep this file limited to this single narrow action so the absence of a
// gate here is obvious and never accidentally copied into a real mutation.

import { createClient } from '@/lib/supabase/server'

type ConfirmResult =
  | { success: true; alreadyConfirmed: boolean; confirmedAt: string }
  | { success: false; message: string }

export async function confirmReceipt(code: string): Promise<ConfirmResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('confirm_digital_receipt', { p_code: code })
    .single<{ code: string; already_confirmed: boolean; confirmed_at: string }>()

  if (error || !data) {
    return { success: false, message: 'notFound' }
  }

  return { success: true, alreadyConfirmed: data.already_confirmed, confirmedAt: data.confirmed_at }
}
