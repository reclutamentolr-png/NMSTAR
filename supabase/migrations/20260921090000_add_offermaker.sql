-- Migration: Add OfferMaker AI campaigns, click log, and public-safe RPCs
-- Owner-only RLS on both tables; public reads/writes happen only through
-- SECURITY DEFINER functions that whitelist exactly the columns needed
-- (same pattern as get_public_profile_by_referral used by /ref/[code]).

CREATE TABLE IF NOT EXISTS offermaker_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'it',
  campaign_type TEXT NOT NULL DEFAULT 'offer',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- guided-form inputs
  what_offer TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  price_info TEXT,
  location_info TEXT,
  strength_point TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN ('call', 'whatsapp', 'quote', 'booking', 'sale', 'store_visit', 'other')),
  tone TEXT NOT NULL CHECK (tone IN ('professional', 'friendly', 'premium', 'direct', 'elegant', 'energetic')),
  contact_whatsapp TEXT NOT NULL,

  -- AI-generated / user-edited output
  campaign_title TEXT NOT NULL,
  headline TEXT NOT NULL,
  offer_summary TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  whatsapp_message_soft TEXT NOT NULL,
  whatsapp_message_direct TEXT NOT NULL,
  whatsapp_message_followup TEXT NOT NULL,

  variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_model TEXT,
  ai_generated_at TIMESTAMPTZ,

  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS offermaker_campaigns_user_id_idx ON offermaker_campaigns (user_id);
CREATE INDEX IF NOT EXISTS offermaker_campaigns_code_idx ON offermaker_campaigns (code);

CREATE TABLE IF NOT EXISTS offermaker_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES offermaker_campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS offermaker_clicks_campaign_id_idx ON offermaker_clicks (campaign_id);

ALTER TABLE offermaker_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE offermaker_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select own campaigns"
  ON offermaker_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own campaigns"
  ON offermaker_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own campaigns"
  ON offermaker_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own campaigns"
  ON offermaker_campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can view own campaign clicks"
  ON offermaker_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offermaker_campaigns c
      WHERE c.id = offermaker_clicks.campaign_id AND c.user_id = auth.uid()
    )
  );

-- Public-safe read for the anonymous landing page: only published campaigns,
-- only the columns needed to render it. Never exposes user_id or other rows.
CREATE OR REPLACE FUNCTION get_offer_campaign_by_code(p_code TEXT)
RETURNS TABLE (
  code TEXT,
  locale TEXT,
  campaign_title TEXT,
  headline TEXT,
  offer_summary TEXT,
  description TEXT,
  cta_label TEXT,
  whatsapp_message_soft TEXT,
  whatsapp_message_direct TEXT,
  whatsapp_message_followup TEXT,
  contact_whatsapp TEXT,
  objective TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    code, locale, campaign_title, headline, offer_summary, description, cta_label,
    whatsapp_message_soft, whatsapp_message_direct, whatsapp_message_followup,
    contact_whatsapp, objective
  FROM offermaker_campaigns
  WHERE code = p_code AND status = 'published'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_offer_campaign_by_code(TEXT) TO anon, authenticated;

-- Atomic click increment + event log for the short-link redirect route.
-- Returns the locale so the caller can build the correct landing URL.
CREATE OR REPLACE FUNCTION register_offer_click(p_code TEXT, p_referrer TEXT, p_user_agent TEXT)
RETURNS TABLE (code TEXT, locale TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_locale TEXT;
BEGIN
  UPDATE offermaker_campaigns
  SET click_count = click_count + 1
  WHERE offermaker_campaigns.code = p_code AND status = 'published'
  RETURNING id, offermaker_campaigns.locale INTO v_id, v_locale;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO offermaker_clicks (campaign_id, referrer, user_agent)
  VALUES (v_id, p_referrer, p_user_agent);

  RETURN QUERY SELECT p_code, v_locale;
END;
$$;

GRANT EXECUTE ON FUNCTION register_offer_click(TEXT, TEXT, TEXT) TO anon, authenticated;
