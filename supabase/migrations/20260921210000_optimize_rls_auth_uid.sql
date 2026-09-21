-- Performance fix: every RLS policy added in this project so far calls
-- `auth.uid()` directly (e.g. `USING (auth.uid() = user_id)`). Postgres
-- re-evaluates a bare function call like that ONCE PER ROW scanned by the
-- policy, whereas wrapping it as `(select auth.uid())` lets the planner
-- treat it as an "InitPlan" — evaluated once per statement and reused for
-- every row. This is Supabase's own documented RLS performance
-- recommendation (their database linter flags the bare form as
-- `auth_rls_initplan`). Semantics are identical; only the plan changes.
-- No app code changes needed — this only rewrites policy definitions.

BEGIN;

-- offermaker_campaigns / offermaker_clicks
DROP POLICY IF EXISTS "Owner can select own campaigns" ON offermaker_campaigns;
CREATE POLICY "Owner can select own campaigns"
  ON offermaker_campaigns FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can insert own campaigns" ON offermaker_campaigns;
CREATE POLICY "Owner can insert own campaigns"
  ON offermaker_campaigns FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can update own campaigns" ON offermaker_campaigns;
CREATE POLICY "Owner can update own campaigns"
  ON offermaker_campaigns FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can delete own campaigns" ON offermaker_campaigns;
CREATE POLICY "Owner can delete own campaigns"
  ON offermaker_campaigns FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can view own campaign clicks" ON offermaker_clicks;
CREATE POLICY "Owner can view own campaign clicks"
  ON offermaker_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offermaker_campaigns c
      WHERE c.id = offermaker_clicks.campaign_id AND c.user_id = (select auth.uid())
    )
  );

-- svat_qc_reports
DROP POLICY IF EXISTS "Authenticated users can insert their own report" ON svat_qc_reports;
CREATE POLICY "Authenticated users can insert their own report"
  ON svat_qc_reports FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- qr_pro_codes / qr_pro_clicks
DROP POLICY IF EXISTS "Owner can select own qr codes" ON qr_pro_codes;
CREATE POLICY "Owner can select own qr codes"
  ON qr_pro_codes FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can insert own qr codes" ON qr_pro_codes;
CREATE POLICY "Owner can insert own qr codes"
  ON qr_pro_codes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can update own qr codes" ON qr_pro_codes;
CREATE POLICY "Owner can update own qr codes"
  ON qr_pro_codes FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can delete own qr codes" ON qr_pro_codes;
CREATE POLICY "Owner can delete own qr codes"
  ON qr_pro_codes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can view own qr code clicks" ON qr_pro_clicks;
CREATE POLICY "Owner can view own qr code clicks"
  ON qr_pro_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_pro_codes c
      WHERE c.id = qr_pro_clicks.qr_code_id AND c.user_id = (select auth.uid())
    )
  );

-- life_calendar_profiles / life_calendar_items / life_calendar_renewals
DROP POLICY IF EXISTS "Owner can manage own profiles" ON life_calendar_profiles;
CREATE POLICY "Owner can manage own profiles"
  ON life_calendar_profiles FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can manage own items" ON life_calendar_items;
CREATE POLICY "Owner can manage own items"
  ON life_calendar_items FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can view own renewals" ON life_calendar_renewals;
CREATE POLICY "Owner can view own renewals"
  ON life_calendar_renewals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM life_calendar_items i
      WHERE i.id = life_calendar_renewals.item_id AND i.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner can insert own renewals" ON life_calendar_renewals;
CREATE POLICY "Owner can insert own renewals"
  ON life_calendar_renewals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM life_calendar_items i
      WHERE i.id = life_calendar_renewals.item_id AND i.user_id = (select auth.uid())
    )
  );

-- findo_locations / findo_items / findo_item_moves
DROP POLICY IF EXISTS "Owner can manage own locations" ON findo_locations;
CREATE POLICY "Owner can manage own locations"
  ON findo_locations FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can manage own items" ON findo_items;
CREATE POLICY "Owner can manage own items"
  ON findo_items FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Owner can view own item moves" ON findo_item_moves;
CREATE POLICY "Owner can view own item moves"
  ON findo_item_moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM findo_items i
      WHERE i.id = findo_item_moves.item_id AND i.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner can insert own item moves" ON findo_item_moves;
CREATE POLICY "Owner can insert own item moves"
  ON findo_item_moves FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM findo_items i
      WHERE i.id = findo_item_moves.item_id AND i.user_id = (select auth.uid())
    )
  );

-- storage.objects: findo-photos bucket
DROP POLICY IF EXISTS "Findo owner can upload own photos" ON storage.objects;
CREATE POLICY "Findo owner can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

DROP POLICY IF EXISTS "Findo owner can view own photos" ON storage.objects;
CREATE POLICY "Findo owner can view own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

DROP POLICY IF EXISTS "Findo owner can update own photos" ON storage.objects;
CREATE POLICY "Findo owner can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

DROP POLICY IF EXISTS "Findo owner can delete own photos" ON storage.objects;
CREATE POLICY "Findo owner can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- digital_receipts
DROP POLICY IF EXISTS "Owner can manage own receipts" ON digital_receipts;
CREATE POLICY "Owner can manage own receipts"
  ON digital_receipts FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- storage.objects: receipt-photos bucket
DROP POLICY IF EXISTS "Receipt owner can upload own photos" ON storage.objects;
CREATE POLICY "Receipt owner can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipt-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

DROP POLICY IF EXISTS "Receipt owner can update own photos" ON storage.objects;
CREATE POLICY "Receipt owner can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipt-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

DROP POLICY IF EXISTS "Receipt owner can delete own photos" ON storage.objects;
CREATE POLICY "Receipt owner can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipt-photos' AND (storage.foldername(name))[1] = (select auth.uid())::text);

COMMIT;
