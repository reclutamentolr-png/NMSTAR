-- Migration: Add Digital Receipt (delivery/exchange confirmation) table + public RPCs + storage bucket.
-- Owner-only RLS on the table. Public (anon) access is granted ONLY through two
-- narrow SECURITY DEFINER functions — never a table-level policy for anon —
-- same principle as get_offer_campaign_by_code / register_qr_pro_click.

CREATE TABLE IF NOT EXISTS digital_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL CHECK (template IN (
    'delivery', 'loan', 'return', 'declared_payment', 'deposit',
    'private_sale', 'keys', 'documents', 'company_equipment'
  )),
  object_name TEXT NOT NULL,
  serial_number TEXT,
  recipient_name TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  quantity INTEGER,
  declared_value NUMERIC,
  expected_return_date DATE,
  photo_path TEXT,
  confirmed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  life_calendar_item_id UUID REFERENCES life_calendar_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digital_receipts_user_id_idx ON digital_receipts (user_id);
CREATE INDEX IF NOT EXISTS digital_receipts_code_idx ON digital_receipts (code);

ALTER TABLE digital_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own receipts"
  ON digital_receipts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public-safe read for the anonymous confirmation page. Never exposes user_id.
CREATE OR REPLACE FUNCTION get_digital_receipt_by_code(p_code TEXT)
RETURNS TABLE (
  code TEXT,
  template TEXT,
  object_name TEXT,
  serial_number TEXT,
  recipient_name TEXT,
  delivery_date DATE,
  reason TEXT,
  notes TEXT,
  quantity INTEGER,
  declared_value NUMERIC,
  expected_return_date DATE,
  photo_path TEXT,
  confirmed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    code, template, object_name, serial_number, recipient_name, delivery_date,
    reason, notes, quantity, declared_value, expected_return_date, photo_path,
    confirmed_at, returned_at
  FROM digital_receipts
  WHERE code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_digital_receipt_by_code(TEXT) TO anon, authenticated;

-- Idempotent public confirmation: only sets confirmed_at the first time.
CREATE OR REPLACE FUNCTION confirm_digital_receipt(p_code TEXT)
RETURNS TABLE (code TEXT, already_confirmed BOOLEAN, confirmed_at TIMESTAMPTZ)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_confirmed_at TIMESTAMPTZ;
BEGIN
  SELECT id, digital_receipts.confirmed_at INTO v_id, v_confirmed_at
  FROM digital_receipts WHERE digital_receipts.code = p_code;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  IF v_confirmed_at IS NOT NULL THEN
    RETURN QUERY SELECT p_code, true, v_confirmed_at;
    RETURN;
  END IF;

  UPDATE digital_receipts
  SET confirmed_at = now(), updated_at = now()
  WHERE id = v_id
  RETURNING digital_receipts.confirmed_at INTO v_confirmed_at;

  RETURN QUERY SELECT p_code, false, v_confirmed_at;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_digital_receipt(TEXT) TO anon, authenticated;

-- Public storage bucket for receipt photos — anyone with the receipt link
-- already sees the object/serial/recipient/value, so the photo isn't more
-- sensitive; only the owner can upload/modify their own files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-photos', 'receipt-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Receipt owner can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipt-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Receipt owner can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipt-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Receipt owner can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipt-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
