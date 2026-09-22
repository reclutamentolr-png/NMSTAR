-- Migration: listing reports ("segnala annuncio" + admin "Bacheca" moderation
-- queue). A Kumano can flag a community listing that breaks the rules; the
-- report lands in a new admin-only section where the listing can be viewed
-- and deleted outright.

CREATE TABLE IF NOT EXISTS listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One open report per (listing, reporter): re-reporting just refreshes the
  -- reason/timestamp instead of piling up duplicate rows for the same pair.
  UNIQUE (listing_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS listing_reports_listing_id_idx ON listing_reports(listing_id);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

-- Reporting is done through report_listing() (SECURITY DEFINER) below, not
-- direct table access, so no authenticated INSERT/SELECT policy is needed —
-- only admins (service-role client in src/app/actions/admin.ts) read this
-- table, and RLS with no policies defaults to deny-all for anon/authenticated.

-- Atomic: blocks self-reporting and upserts on (listing_id, reporter_id) so a
-- second report from the same person just refreshes the reason, never spams
-- duplicate rows the admin queue would have to de-duplicate itself.
CREATE OR REPLACE FUNCTION report_listing(p_listing_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS TABLE (success BOOLEAN, reason TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'not_authenticated';
    RETURN;
  END IF;

  SELECT user_id INTO v_owner_id FROM listings WHERE id = p_listing_id;
  IF v_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found';
    RETURN;
  END IF;

  IF v_owner_id = auth.uid() THEN
    RETURN QUERY SELECT false, 'own_listing';
    RETURN;
  END IF;

  INSERT INTO listing_reports (listing_id, reporter_id, reason)
  VALUES (p_listing_id, auth.uid(), NULLIF(trim(p_reason), ''))
  ON CONFLICT (listing_id, reporter_id)
  DO UPDATE SET reason = EXCLUDED.reason, created_at = now();

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION report_listing(UUID, TEXT) TO authenticated;
