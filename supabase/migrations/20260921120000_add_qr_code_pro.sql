-- Migration: Add QR Code PRO dynamic codes + click log.
-- Same owner-only RLS + SECURITY DEFINER pattern as offermaker_campaigns/offermaker_clicks:
-- no public policy on the tables, public reads/writes only through whitelisted functions.

CREATE TABLE IF NOT EXISTS qr_pro_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('link', 'whatsapp', 'phone', 'sms', 'email', 'wifi', 'vcard')),
  destination JSONB NOT NULL, -- type-specific fields, e.g. {url}, {phone,message}, {email,subject,body}
  fg_color TEXT NOT NULL DEFAULT '#171717',
  bg_color TEXT NOT NULL DEFAULT '#ffffff',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_pro_codes_user_id_idx ON qr_pro_codes (user_id);
CREATE INDEX IF NOT EXISTS qr_pro_codes_code_idx ON qr_pro_codes (code);

CREATE TABLE IF NOT EXISTS qr_pro_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_pro_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS qr_pro_clicks_qr_code_id_idx ON qr_pro_clicks (qr_code_id);

ALTER TABLE qr_pro_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_pro_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select own qr codes"
  ON qr_pro_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own qr codes"
  ON qr_pro_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own qr codes"
  ON qr_pro_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own qr codes"
  ON qr_pro_codes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can view own qr code clicks"
  ON qr_pro_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_pro_codes c
      WHERE c.id = qr_pro_clicks.qr_code_id AND c.user_id = auth.uid()
    )
  );

-- Public-safe read for the redirect route: only active codes, only the fields
-- needed to compute where to send the visitor.
CREATE OR REPLACE FUNCTION get_qr_pro_destination(p_code TEXT)
RETURNS TABLE (content_type TEXT, destination JSONB)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT content_type, destination
  FROM qr_pro_codes
  WHERE code = p_code AND status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_qr_pro_destination(TEXT) TO anon, authenticated;

-- Atomic click increment + event log for the redirect route.
CREATE OR REPLACE FUNCTION register_qr_pro_click(p_code TEXT, p_referrer TEXT, p_user_agent TEXT)
RETURNS TABLE (content_type TEXT, destination JSONB)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_content_type TEXT;
  v_destination JSONB;
BEGIN
  UPDATE qr_pro_codes
  SET click_count = click_count + 1
  WHERE qr_pro_codes.code = p_code AND status = 'active'
  RETURNING id, qr_pro_codes.content_type, qr_pro_codes.destination
  INTO v_id, v_content_type, v_destination;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO qr_pro_clicks (qr_code_id, referrer, user_agent)
  VALUES (v_id, p_referrer, p_user_agent);

  RETURN QUERY SELECT v_content_type, v_destination;
END;
$$;

GRANT EXECUTE ON FUNCTION register_qr_pro_click(TEXT, TEXT, TEXT) TO anon, authenticated;
