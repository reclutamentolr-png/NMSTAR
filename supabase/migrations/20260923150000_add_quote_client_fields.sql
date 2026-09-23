-- Adds City, Postal Code and PEC to the quote's client fields (rounding out
-- the client block the same way 20260923110000 did for the issuer), and a
-- reusable "saved clients" address book so a Kumano doesn't have to retype
-- the same client on every new quote — same "fill once, reuse" idea as
-- quote_issuer_profiles, but one row per client instead of a single profile.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS client_city TEXT,
  ADD COLUMN IF NOT EXISTS client_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS client_pec TEXT;

CREATE TABLE IF NOT EXISTS quote_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vat TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  pec TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_clients_user_id_idx ON quote_clients (user_id);

ALTER TABLE quote_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own saved clients"
  ON quote_clients FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
